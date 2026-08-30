/**
 * Teste de integração real das Server Actions de revisão (Módulo 11, seção
 * 19) — o mesmo caminho que `ReviewSessionRunner` usa; nenhum SM-2
 * duplicado, só a chamada real do Módulo 5.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  startReviewSessionAction,
  submitReviewAnswerAction,
  finishReviewSessionAction,
} from "./review-actions";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import { getCurrentActor } from "@/server/auth/devActor";
import { loginAsUserId } from "@/test/authTestHelpers";
import {
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  createFixtureReviewItem,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Review Server Actions", () => {
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const reviewItemIds: string[] = [];
  const studySessionIds: string[] = [];

  it("percorre início → resposta → finalização, com XP real de gamificação", async () => {
    const actor = await getCurrentActor();
    await loginAsUserId(actor.userId); // Server Action agora exige sessão real (etapa de consolidação)
    const adminActor = { userId: actor.userId, role: "ADMIN" as const };

    const source = await createFixtureSource("action-review");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("action-review");
    conceptIds.push(concept.id);
    const question = await createFixtureMultipleChoiceQuestion("action-review", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    await createFixtureQuestionKnowledgeTag(question.id, "CONCEPT", concept.id);
    await publishQuestion(adminActor, question.id);

    const reviewItem = await createFixtureReviewItem(actor.userId, {
      scope: "CONCEPT",
      conceptId: concept.id,
      opts: { dueAt: new Date(), state: "REVIEW" },
    });
    reviewItemIds.push(reviewItem.id);

    const started = await startReviewSessionAction();
    studySessionIds.push(started.sessionId);
    const item = started.items.find((i) => i.reviewItemId === reviewItem.id);
    expect(item).toBeDefined();

    await submitReviewAnswerAction({
      sessionId: started.sessionId,
      reviewItemId: reviewItem.id,
      questionId: item!.question.id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: item!.question.options[0].id },
      timeSpentMs: 100,
    });

    const finished = await finishReviewSessionAction(started.sessionId);
    expect(finished.summary.itemsReviewed).toBe(1);
    expect(finished.gamification.xpGrantedNow).toBeGreaterThanOrEqual(20);
  });

  afterAll(async () => {
    await cleanupFixtures({
      reviewItemIds,
      studySessionIds,
      questionIds,
      conceptIds,
      sourceIds,
    });
    await prisma.$disconnect();
  });
});
