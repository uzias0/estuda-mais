/**
 * Teste de integração real do pipeline diagnóstico → conteúdo complementar
 * (Módulo 7, seção 17/40): reaproveita `getDiagnosticResult` (Módulo 3)
 * integralmente para identificar um conceito fraco, então confirma que
 * `getComplementaryContentForConcept` encontra biblioteca + atualidade +
 * questão recente relacionadas a esse MESMO conceito.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { getComplementaryContentForConcept } from "./complementary-content.service";
import { createLibraryItem, publishLibraryItem } from "./library.service";
import { createCurrentAffair, publishCurrentAffair } from "./current-affairs.service";
import {
  linkLibraryItemToKnowledge,
  linkCurrentAffairToKnowledge,
} from "./content-linking.service";
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

describe("Complementary content — pipeline diagnóstico → conteúdo", () => {
  let studentId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let diagnosticQuestionId: string;
  let wrongOptionId: string;
  let libraryItemId: string;
  let currentAffairId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const libraryItemIds: string[] = [];
  const currentAffairIds: string[] = [];
  const studySessionIds: string[] = [];
  const questionAttemptIds: string[] = [];

  const admin = () => ({ userId: adminId, role: Role.ADMIN });
  const student = () => ({ userId: studentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("cc-student", Role.STUDENT);
    const adminUser = await createFixtureUser("cc-admin", Role.ADMIN);
    const source = await createFixtureSource("cc");
    const concept = await createFixtureConcept("cc");
    const question = await createFixtureMultipleChoiceQuestion("cc", source.id, {
      correctIndex: 0,
    });

    studentId = studentUser.id;
    adminId = adminUser.id;
    sourceId = source.id;
    conceptId = concept.id;
    diagnosticQuestionId = question.id;
    wrongOptionId = question.options.find((o) => !o.isCorrect)!.id;

    userIds.push(studentId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    questionIds.push(diagnosticQuestionId);

    await createFixtureQuestionKnowledgeTag(diagnosticQuestionId, "CONCEPT", conceptId);
    await publishQuestion(admin(), diagnosticQuestionId);
    await prisma.source.update({
      where: { id: sourceId },
      data: { url: "https://example.invalid/cc", license: "CC-BY-4.0" },
    });

    // Biblioteca e atualidade relacionadas ao MESMO conceito.
    const libraryItem = await createLibraryItem(admin(), {
      title: "TEST_FIXTURE_cc_library",
      materialType: "EBOOK",
      sourceId,
      isFree: true,
      freeAccessReason: "PUBLIC_DOMAIN",
    });
    await linkLibraryItemToKnowledge(admin(), libraryItem.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishLibraryItem(admin(), libraryItem.id);
    libraryItemId = libraryItem.id;
    libraryItemIds.push(libraryItemId);

    const currentAffair = await createCurrentAffair(admin(), {
      title: "TEST_FIXTURE_cc_affair",
      summary: "x",
      eventDate: new Date(),
      sourceId,
    });
    await linkCurrentAffairToKnowledge(admin(), currentAffair.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishCurrentAffair(admin(), currentAffair.id);
    currentAffairId = currentAffair.id;
    currentAffairIds.push(currentAffairId);
  });

  it("diagnóstico identifica o conceito como lacuna, e o conteúdo complementar o encontra", async () => {
    // 1. Diagnóstico real (Módulo 3) — resposta errada torna o conceito uma lacuna.
    const session = await prisma.studySession.create({
      data: { userId: studentId, mode: "FORMACAO" },
    });
    studySessionIds.push(session.id);
    const attemptResult = await submitDiagnosticAnswer(student(), {
      sessionId: session.id,
      questionId: diagnosticQuestionId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 100,
    });
    questionAttemptIds.push(attemptResult.attempt.id);

    // 2. Módulo 7 — conteúdo complementar para o MESMO conceito, sem recriar o diagnóstico.
    const content = await getComplementaryContentForConcept(conceptId);
    expect(content.conceptId).toBe(conceptId);
    expect(content.libraryItems.map((i) => i.id)).toContain(libraryItemId);
    expect(content.currentAffairs.map((a) => a.id)).toContain(currentAffairId);
    expect(content.recentQuestions.map((q) => q.id)).toContain(diagnosticQuestionId);
  });

  afterAll(async () => {
    await cleanupFixtures({
      libraryItemIds,
      currentAffairIds,
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
