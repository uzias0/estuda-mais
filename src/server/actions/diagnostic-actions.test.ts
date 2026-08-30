/**
 * Teste de integração real das Server Actions de diagnóstico (Módulo 11,
 * seções 9/49) — o mesmo caminho que `DiagnosticRunner` usa.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  startDiagnosticAction,
  submitDiagnosticAnswerAction,
  finishDiagnosticAction,
  getDiagnosticResultAction,
} from "./diagnostic-actions";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import { getCurrentActor } from "@/server/auth/devActor";
import { loginAsUserId } from "@/test/authTestHelpers";
import {
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Diagnostic Server Actions", () => {
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const studySessionIds: string[] = [];
  const questionAttemptIds: string[] = [];

  it("percorre início → resposta → finalização → resultado, sempre com dados reais", async () => {
    const actor = await getCurrentActor();
    await loginAsUserId(actor.userId); // Server Action agora exige sessão real (etapa de consolidação)
    const adminActor = { userId: actor.userId, role: "ADMIN" as const };

    const source = await createFixtureSource("action-diag");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("action-diag");
    conceptIds.push(concept.id);
    const question = await createFixtureMultipleChoiceQuestion("action-diag", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    await createFixtureQuestionKnowledgeTag(question.id, "CONCEPT", concept.id);
    await publishQuestion(adminActor, question.id);

    const started = await startDiagnosticAction();
    studySessionIds.push(started.sessionId);
    expect(started.questions.length).toBeGreaterThan(0);

    const attempt = await submitDiagnosticAnswerAction({
      sessionId: started.sessionId,
      questionId: started.questions[0].id,
      answerData: {
        type: "MULTIPLE_CHOICE",
        selectedOptionId: started.questions[0].options[0].id,
      },
      timeSpentMs: 100,
    });
    questionAttemptIds.push(attempt.attempt.id);

    const finished = await finishDiagnosticAction(started.sessionId);
    expect(finished.questionsAnswered).toBe(1);

    const result = await getDiagnosticResultAction(started.sessionId);
    expect(result.sessionId).toBe(started.sessionId);
  });

  afterAll(async () => {
    await cleanupFixtures({
      questionAttemptIds,
      studySessionIds,
      questionIds,
      conceptIds,
      sourceIds,
    });
    await prisma.$disconnect();
  });
});
