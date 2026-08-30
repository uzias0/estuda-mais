/**
 * Fila de revisão de um aluno (Módulo 5, seção 12) — `getReviewQueue(actor,
 * options)`. Ordenação padrão: um único score de prioridade decrescente
 * (`computeReviewPriority`), cujo peso dominante é o atraso — isso já
 * produz "vencidos primeiro, mais atrasados depois, maior prioridade e
 * maior necessidade pedagógica desempatando o resto" (seção 12) sem
 * comparação multi-chave frágil (ver `config/review.ts`/`reviewPriority.ts`).
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { Difficulty, ReviewState } from "@/generated/prisma/enums";
import { DEFAULT_DAILY_REVIEW_LIMIT } from "@/config/review";
import { assertOwnReviewDataOrAdmin } from "./privacy";
import { gatherPriorityInput, getPedagogicalContextForReviewItem } from "./reviewContext";
import { computeReviewPriority, explainReviewPriority } from "./reviewPriority";

type DifficultyValue = (typeof Difficulty)[keyof typeof Difficulty];

export interface ReviewQueueFilters {
  conceptId?: string;
  difficulty?: DifficultyValue;
  trackId?: string;
  areaId?: string;
  unitId?: string;
  stageId?: string;
  lessonId?: string;
  /** Só itens já vencidos agora (`dueAt <= now`). */
  dueOnly?: boolean;
  /** Só itens vencidos há mais de 24h — subconjunto mais estrito de `dueOnly` ("atrasados"). */
  overdueOnly?: boolean;
  minPriority?: number;
  limit?: number;
  now?: Date;
}

export interface ReviewQueueEntry {
  reviewItem: Awaited<ReturnType<typeof fetchCandidates>>[number];
  priority: number;
  reason: string;
  pedagogy: Awaited<ReturnType<typeof getPedagogicalContextForReviewItem>>;
}

function fetchCandidates(userId: string, conceptId?: string) {
  return prisma.reviewItem.findMany({
    where: { userId, state: { not: ReviewState.SUSPENDED }, conceptId },
  });
}

export async function getReviewQueue(
  actor: Actor,
  targetUserId: string,
  filters: ReviewQueueFilters = {},
): Promise<ReviewQueueEntry[]> {
  assertOwnReviewDataOrAdmin(actor, targetUserId);
  const now = filters.now ?? new Date();

  const candidates = await fetchCandidates(targetUserId, filters.conceptId);

  const dueThreshold = now;
  const overdueThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const enriched: ReviewQueueEntry[] = [];
  for (const reviewItem of candidates) {
    if (filters.dueOnly && reviewItem.dueAt > dueThreshold) continue;
    if (filters.overdueOnly && reviewItem.dueAt > overdueThreshold) continue;

    const priorityInput = await gatherPriorityInput(reviewItem);
    if (filters.difficulty && priorityInput.difficulty !== filters.difficulty) continue;

    const pedagogy = await getPedagogicalContextForReviewItem(reviewItem);
    if (filters.trackId && !pedagogy.trackIds.includes(filters.trackId)) continue;
    if (filters.areaId && !pedagogy.areaIds.includes(filters.areaId)) continue;
    if (filters.unitId && !pedagogy.unitIds.includes(filters.unitId)) continue;
    if (filters.stageId && !pedagogy.stageIds.includes(filters.stageId)) continue;
    if (filters.lessonId && !pedagogy.lessonIds.includes(filters.lessonId)) continue;

    const priority = computeReviewPriority(priorityInput, now);
    if (filters.minPriority !== undefined && priority < filters.minPriority) continue;

    enriched.push({
      reviewItem,
      priority,
      reason: explainReviewPriority(priorityInput, now),
      pedagogy,
    });
  }

  enriched.sort((a, b) => b.priority - a.priority);
  return enriched.slice(0, filters.limit ?? DEFAULT_DAILY_REVIEW_LIMIT);
}
