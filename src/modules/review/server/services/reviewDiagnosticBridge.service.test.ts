/**
 * Teste de integração real da ponte com o diagnóstico (Módulo 5, seção 16):
 * "diagnóstico + tentativas + histórico de revisão = priorização adaptativa".
 * Reaproveita `startDiagnostic`/`submitDiagnosticAnswer`/`getDiagnosticResult`
 * do Módulo 3 integralmente — não recalcula "conceito fraco" de outro jeito.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { enqueueWeakConceptsFromDiagnostic } from "./reviewDiagnosticBridge.service";
import { submitDiagnosticAnswer } from "@/modules/assessment/server/services/diagnostic.service";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Review ↔ diagnostic bridge", () => {
  let studentId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let questionId: string;
  let wrongOptionId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const reviewItemIds: string[] = [];
  const studySessionIds: string[] = [];
  const questionAttemptIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("bridge-student", Role.STUDENT);
    const admin = await createFixtureUser("bridge-admin", Role.ADMIN);
    const source = await createFixtureSource("bridge");
    const concept = await createFixtureConcept("bridge");
    const question = await createFixtureMultipleChoiceQuestion("bridge", source.id, {
      correctIndex: 0,
    });

    studentId = student.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptId = concept.id;
    questionId = question.id;
    wrongOptionId = question.options.find((o) => !o.isCorrect)!.id;

    userIds.push(studentId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    questionIds.push(questionId);

    await createFixtureQuestionKnowledgeTag(questionId, "CONCEPT", conceptId);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, questionId);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });

  it("cria um ReviewItem(CONCEPT) para cada conceito identificado como lacuna no diagnóstico, e é idempotente", async () => {
    // Sessão de diagnóstico aberta diretamente (mesmo mode=FORMACAO que
    // `startDiagnostic` usaria) — evita depender da SELEÇÃO aleatória entre
    // TODAS as questões publicadas do banco de dev compartilhado, que
    // poderia não escolher exatamente a questão desta fixture.
    // `submitDiagnosticAnswer` não exige que a questão tenha sido "sorteada"
    // por `startDiagnostic`, só que a sessão seja própria, aberta, e a
    // questão ainda não respondida nela.
    const session = await prisma.studySession.create({
      data: { userId: studentId, mode: "FORMACAO" },
    });
    const sessionId = session.id;
    studySessionIds.push(sessionId);

    const attemptResult = await submitDiagnosticAnswer(student(), {
      sessionId,
      questionId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 100,
    });
    questionAttemptIds.push(attemptResult.attempt.id);

    const created = await enqueueWeakConceptsFromDiagnostic(student(), sessionId);
    expect(created.some((item) => item.conceptId === conceptId)).toBe(true);
    const item = created.find((i) => i.conceptId === conceptId)!;
    reviewItemIds.push(item.id);
    expect(item.scope).toBe("CONCEPT");
    expect(item.state).toBe("NEW");

    const again = await enqueueWeakConceptsFromDiagnostic(student(), sessionId);
    const sameItem = again.find((i) => i.conceptId === conceptId)!;
    expect(sameItem.id).toBe(item.id); // idempotente — não duplica
  });

  afterAll(async () => {
    await cleanupFixtures({
      reviewItemIds,
      studySessionIds,
      questionAttemptIds,
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
