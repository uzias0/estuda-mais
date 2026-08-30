/**
 * "O que devo revisar agora?" (Módulo 5, seção 24) — recomendação
 * inteiramente derivada de `getReviewQueue` (regras determinísticas já
 * existentes, seção 11/12), com uma justificativa textual por item
 * (`explainReviewPriority`). Nenhuma IA/LLM — cada item da resposta é
 * rastreável até `dueAt`/histórico/dificuldade reais.
 */
import { Actor } from "@/server/auth/authorize";
import { getReviewQueue, type ReviewQueueFilters } from "./reviewQueue.service";

export interface ReviewRecommendation {
  reviewItemId: string;
  scope: "QUESTION" | "CONCEPT";
  conceptId: string | null;
  questionId: string | null;
  priority: number;
  reason: string;
}

/** Top-N itens mais urgentes para o próprio `actor`, cada um com sua justificativa (seção 24). */
export async function getReviewRecommendations(
  actor: Actor,
  options: Omit<ReviewQueueFilters, "now"> & { limit?: number } = {},
): Promise<ReviewRecommendation[]> {
  const queue = await getReviewQueue(actor, actor.userId, options);
  return queue.map((entry) => ({
    reviewItemId: entry.reviewItem.id,
    scope: entry.reviewItem.scope,
    conceptId: entry.reviewItem.conceptId,
    questionId: entry.reviewItem.questionId,
    priority: entry.priority,
    reason: entry.reason,
  }));
}
