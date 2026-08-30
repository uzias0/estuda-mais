/**
 * Testes de integração reais da localização do diagnóstico do usuário
 * (Módulo 10, seção 5/6/40).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { findLatestFinishedDiagnosticSessionId } from "./diagnostic-lookup";
import {
  startDiagnostic,
  submitDiagnosticAnswer,
  finishDiagnostic,
} from "@/modules/assessment/server/services/diagnostic.service";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";

/**
 * Monta um `answerData` válido para QUALQUER um dos 8 `QuestionType`
 * suportados — necessário porque `startDiagnostic` seleciona do pool GLOBAL
 * de questões publicadas e tagueadas (não só a fixture MULTIPLE_CHOICE
 * criada neste arquivo); com conteúdo acadêmico real de tipos variados
 * também publicado (fase de expansão — `scripts/seed-academic-content-v2.ts`),
 * o diagnóstico pode legitimamente sortear qualquer tipo. A correção em si
 * não importa aqui (o teste só verifica a localização do sessionId), só a
 * FORMA precisa ser válida para o tipo real sorteado.
 */
function anyValidAnswerData(question: {
  type: string;
  options: Array<{ id: string; order: number }>;
  answerKey: unknown;
}): Record<string, unknown> {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
    case "CASE_STUDY":
      return { type: question.type, selectedOptionId: question.options[0].id };
    case "MULTI_SELECT":
      return { type: "MULTI_SELECT", selectedOptionIds: [question.options[0].id] };
    case "ORDERING":
      return {
        type: "ORDERING",
        orderedOptionIds: [...question.options].sort((a, b) => a.order - b.order).map((o) => o.id),
      };
    case "MATCHING": {
      const answerKey = question.answerKey as { pairs: Array<{ left: string; right: string }> };
      return { type: "MATCHING", pairs: answerKey.pairs };
    }
    case "FILL_BLANK": {
      const answerKey = question.answerKey as { blanks: Array<{ accepted: string[] }> };
      return { type: "FILL_BLANK", answers: answerKey.blanks.map((b) => b.accepted[0]) };
    }
    case "SHORT_ANSWER": {
      const answerKey = question.answerKey as { accepted: string[] };
      return { type: "SHORT_ANSWER", text: answerKey.accepted[0] };
    }
    default:
      throw new Error(`Tipo de questão não suportado no teste: "${question.type}".`);
  }
}

describe("diagnostic-lookup", () => {
  let studentId: string;
  let adminId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const studySessionIds: string[] = [];
  const questionAttemptIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("diaglookup-student", Role.STUDENT);
    const adminUser = await createFixtureUser("diaglookup-admin", Role.ADMIN);
    studentId = studentUser.id;
    adminId = adminUser.id;
    userIds.push(studentId, adminId);

    const source = await createFixtureSource("diaglookup");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("diaglookup");
    conceptIds.push(concept.id);
    const question = await createFixtureMultipleChoiceQuestion("diaglookup", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    await createFixtureQuestionKnowledgeTag(question.id, "CONCEPT", concept.id);
    await publishQuestion(admin(), question.id);
  });

  it("devolve null quando o usuário nunca fez diagnóstico", async () => {
    const otherUser = await createFixtureUser("diaglookup-none", Role.STUDENT);
    userIds.push(otherUser.id);
    const result = await findLatestFinishedDiagnosticSessionId(otherUser.id);
    expect(result).toBeNull();
  });

  it("devolve null enquanto o diagnóstico ainda está em andamento (sem endedAt)", async () => {
    const { sessionId } = await startDiagnostic(student(), 1);
    studySessionIds.push(sessionId);
    const result = await findLatestFinishedDiagnosticSessionId(studentId);
    expect(result).toBeNull();
  });

  it("devolve o sessionId depois de finishDiagnostic", async () => {
    const session = await prisma.studySession.findFirst({
      where: { userId: studentId, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    const questions = await startDiagnostic(student(), 1);
    studySessionIds.push(questions.sessionId);
    const fullQuestion = await prisma.question.findUniqueOrThrow({
      where: { id: questions.questions[0].id },
      include: { options: true },
    });
    const attempt = await submitDiagnosticAnswer(student(), {
      sessionId: questions.sessionId,
      questionId: questions.questions[0].id,
      answerData: anyValidAnswerData(fullQuestion) as never,
      timeSpentMs: 100,
    });
    questionAttemptIds.push(attempt.attempt.id);
    await finishDiagnostic(student(), questions.sessionId);

    const result = await findLatestFinishedDiagnosticSessionId(studentId);
    expect(result).toBe(questions.sessionId);
    // a sessão anterior (nunca finalizada) não deve ter sido apagada nem afetada.
    if (session) expect(session.endedAt).toBeNull();
  });

  afterAll(async () => {
    await cleanupFixtures({
      questionAttemptIds,
      studySessionIds,
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
