"use server";

/**
 * Server Actions da sessão de revisão (Módulo 11, seções 19/46) — camada
 * fina sobre o Módulo 5; depois de finalizar, processa o evento de
 * gamificação real (Módulo 9), mesmo padrão de `lesson-actions.ts`.
 */
import { requireSessionActor } from "@/server/auth/session";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import {
  startReviewSession,
  submitReviewAnswer,
  finishReviewSession,
} from "@/modules/review/server/services/reviewSession.service";
import { processReviewSessionCompletionEvent } from "@/modules/gamification/server/services/gamification-events.service";

export async function startReviewSessionAction() {
  const actor = await requireSessionActor();
  return startReviewSession(actor, {});
}

export async function submitReviewAnswerAction(input: {
  sessionId: string;
  reviewItemId: string;
  questionId: string;
  answerData: AttemptAnswerData;
  timeSpentMs: number;
}) {
  const actor = await requireSessionActor();
  return submitReviewAnswer(actor, input);
}

export async function finishReviewSessionAction(sessionId: string) {
  const actor = await requireSessionActor();
  const summary = await finishReviewSession(actor, sessionId);
  const gamification = await processReviewSessionCompletionEvent(actor, sessionId);
  return { summary, gamification };
}
