/**
 * Coleta de dados reais para alimentar `computeReviewPriority`/`computeNextReview`
 * (funções puras) e para resolver o conteúdo pedagógico de um item de
 * revisão. Toda leitura de banco deste bounded context que não seja CRUD
 * direto de `ReviewItem`/`ReviewLog` vive aqui — nada de números mágicos ou
 * heurística inventada: sempre a partir de `QuestionAttempt`/
 * `QuestionKnowledgeTag`/`LessonKnowledgeTag` já existentes (Módulos 1–4).
 */
import { prisma } from "@/server/db";
import { KnowledgeEntityType, PublicationStatus } from "@/generated/prisma/enums";
import type { ReviewItem } from "@/generated/prisma/client";
import { WEAK_CONCEPT_THRESHOLD } from "@/config/diagnostic";
import { getPedagogicalContextForConcepts } from "@/modules/pedagogy/server/services/pedagogy-query.service";
import type { ReviewPriorityInput } from "./reviewPriority";

type DifficultyValue = ReviewPriorityInput["difficulty"];

/**
 * Taxa de erro (0–1) de um item de revisão, calculada a partir do histórico
 * REAL de `QuestionAttempt` deste usuário — nunca um valor inventado. Sem
 * nenhuma tentativa registrada, a taxa é 0 (neutra: não há evidência de
 * dificuldade ainda, então este fator não empurra a prioridade para cima).
 *
 * - scope QUESTION: tentativas na própria questão.
 * - scope CONCEPT: tentativas em QUALQUER questão tagueada a este conceito
 *   (`QuestionKnowledgeTag`) — mesmo conjunto de dados que o diagnóstico
 *   (Módulo 3) usa para identificar conceitos fracos, reaproveitado aqui em
 *   vez de duplicado (seção 16 do prompt).
 */
export async function computeItemErrorRate(reviewItem: ReviewItem): Promise<number> {
  const stats = await computeItemAttemptStats(reviewItem);
  if (stats.total === 0) return 0;
  return stats.incorrect / stats.total;
}

async function computeItemAttemptStats(
  reviewItem: ReviewItem,
): Promise<{ total: number; correct: number; incorrect: number }> {
  const where =
    reviewItem.scope === "QUESTION"
      ? { userId: reviewItem.userId, questionId: reviewItem.questionId! }
      : {
          userId: reviewItem.userId,
          question: {
            knowledgeTags: {
              some: { entityType: KnowledgeEntityType.CONCEPT, entityId: reviewItem.conceptId! },
            },
          },
        };

  const attempts = await prisma.questionAttempt.findMany({ where, select: { isCorrect: true } });
  const correct = attempts.filter((a) => a.isCorrect).length;
  return { total: attempts.length, correct, incorrect: attempts.length - correct };
}

/**
 * `true` se o conceito deste item é uma lacuna diagnóstica — mesmo limiar
 * (`WEAK_CONCEPT_THRESHOLD`) e mesma fonte de dados (`QuestionAttempt`) do
 * diagnóstico do Módulo 3, generalizado para todo o histórico do usuário
 * (não só a sessão de diagnóstico) — "não crie outro mecanismo independente
 * de conceito fraco" (seção 16). Itens sem nenhuma tentativa não são
 * considerados fracos (não há evidência).
 */
export async function isConceptWeak(reviewItem: ReviewItem): Promise<boolean> {
  if (reviewItem.scope !== "CONCEPT") return false;
  const stats = await computeItemAttemptStats(reviewItem);
  if (stats.total === 0) return false;
  const percentage = (stats.correct / stats.total) * 100;
  return percentage <= WEAK_CONCEPT_THRESHOLD;
}

/** Dificuldade do conteúdo revisado: `Question.difficulty` (scope QUESTION) ou `Concept.difficulty` (scope CONCEPT, opcional). */
export async function resolveItemDifficulty(reviewItem: ReviewItem): Promise<DifficultyValue> {
  if (reviewItem.scope === "QUESTION") {
    const question = await prisma.question.findUnique({
      where: { id: reviewItem.questionId! },
      select: { difficulty: true },
    });
    return (question?.difficulty as DifficultyValue) ?? null;
  }
  const concept = await prisma.concept.findUnique({
    where: { id: reviewItem.conceptId! },
    select: { difficulty: true },
  });
  return (concept?.difficulty as DifficultyValue) ?? null;
}

/** Monta o `ReviewPriorityInput` real de um item — única ponte entre dados do banco e a função pura de prioridade. */
export async function gatherPriorityInput(reviewItem: ReviewItem): Promise<ReviewPriorityInput> {
  const [errorRate, difficulty, weakConcept] = await Promise.all([
    computeItemErrorRate(reviewItem),
    resolveItemDifficulty(reviewItem),
    isConceptWeak(reviewItem),
  ]);
  return {
    dueAt: reviewItem.dueAt,
    lastReviewedAt: reviewItem.lastReviewedAt,
    createdAt: reviewItem.createdAt,
    difficulty,
    errorRate,
    isWeakConcept: weakConcept,
  };
}

export type { PedagogicalContext } from "@/modules/pedagogy/server/services/pedagogy-query.service";

/**
 * Resolve "esta revisão pertence a qual parte do curso?" (Módulo 5, seção
 * 17). A travessia em si (Concept→Lesson→Stage→Unit→Area→Track) vive em
 * `pedagogy` (dona do grafo pedagógico, Módulo 4) — `getPedagogicalContextForConcepts`,
 * reaproveitada também pelo Módulo 6 (`simulation`). Esta função só resolve
 * os `conceptIds` de um `ReviewItem` (scope CONCEPT: o próprio; scope
 * QUESTION: via `QuestionKnowledgeTag`) e delega o resto.
 */
export async function getPedagogicalContextForReviewItem(reviewItem: ReviewItem) {
  const conceptIds =
    reviewItem.scope === "CONCEPT"
      ? [reviewItem.conceptId!]
      : (
          await prisma.questionKnowledgeTag.findMany({
            where: { questionId: reviewItem.questionId!, entityType: KnowledgeEntityType.CONCEPT },
            select: { entityId: true },
          })
        ).map((t) => t.entityId);

  return getPedagogicalContextForConcepts(
    conceptIds,
    reviewItem.scope === "QUESTION" ? reviewItem.questionId! : undefined,
  );
}

/**
 * Escolhe uma `Question` publicada tagueada a `conceptId` para representar
 * um item de revisão CONCEPT numa sessão. Determinístico (ordenado por
 * `id`) — sem aleatoriedade, coerente com "nenhuma recomendação
 * inexplicável" (seção 4). `null` se não houver questão publicada disponível
 * (o item é simplesmente omitido da sessão — ver limitações no MODULO-5.md).
 */
export async function pickQuestionForConcept(conceptId: string) {
  return prisma.question.findFirst({
    where: {
      reviewStatus: PublicationStatus.PUBLISHED,
      knowledgeTags: { some: { entityType: KnowledgeEntityType.CONCEPT, entityId: conceptId } },
    },
    include: { options: true },
    orderBy: { id: "asc" },
  });
}
