/**
 * Consolidação de desempenho de revisão (Módulo 5, seção 23) —
 * `getReviewPerformance()`. Só camada de domínio/consulta, nenhum
 * dashboard visual. Tudo determinístico, calculado a partir de
 * `ReviewItem`/`ReviewLog` já gravados.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { KnowledgeEntityType, ReviewState } from "@/generated/prisma/enums";
import { assertOwnReviewDataOrAdmin } from "./privacy";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Taxa de erro por conceito, para vários conceitos de uma vez (mesma regra
 * de `computeItemErrorRate`/`reviewContext.ts`: erros/total de
 * `QuestionAttempt` do usuário em questões marcadas com aquele conceito).
 * Antes disso: uma consulta ao banco POR conceito, em paralelo — para um
 * aluno com histórico extenso de revisão, isso significa dezenas/centenas
 * de conexões simultâneas só para montar `weakestConcepts`. Corrigido para
 * UMA única consulta (todas as tentativas do usuário com suas tags de
 * conceito) e agregação em memória — mesmo resultado, sem o N+1.
 */
async function computeErrorRateByConcept(
  userId: string,
  conceptIds: string[],
): Promise<Map<string, number>> {
  const uniqueConceptIds = Array.from(new Set(conceptIds));
  if (uniqueConceptIds.length === 0) return new Map();

  const attempts = await prisma.questionAttempt.findMany({
    where: {
      userId,
      question: {
        knowledgeTags: {
          some: { entityType: KnowledgeEntityType.CONCEPT, entityId: { in: uniqueConceptIds } },
        },
      },
    },
    select: {
      isCorrect: true,
      question: {
        select: {
          knowledgeTags: {
            where: { entityType: KnowledgeEntityType.CONCEPT, entityId: { in: uniqueConceptIds } },
            select: { entityId: true },
          },
        },
      },
    },
  });

  const stats = new Map<string, { total: number; incorrect: number }>();
  for (const attempt of attempts) {
    for (const tag of attempt.question.knowledgeTags) {
      const current = stats.get(tag.entityId) ?? { total: 0, incorrect: 0 };
      current.total += 1;
      if (!attempt.isCorrect) current.incorrect += 1;
      stats.set(tag.entityId, current);
    }
  }

  const result = new Map<string, number>();
  for (const conceptId of uniqueConceptIds) {
    const s = stats.get(conceptId);
    result.set(conceptId, s && s.total > 0 ? s.incorrect / s.total : 0);
  }
  return result;
}

export interface ReviewPerformanceReport {
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPercentage: number;
  masteredCount: number;
  pendingCount: number;
  suspendedCount: number;
  overdueCount: number;
  weakestConcepts: Array<{ conceptId: string; reviewItemId: string; errorRate: number }>;
}

export async function getReviewPerformance(
  actor: Actor,
  targetUserId: string = actor.userId,
): Promise<ReviewPerformanceReport> {
  assertOwnReviewDataOrAdmin(actor, targetUserId);
  const now = new Date();

  const [logs, items] = await Promise.all([
    prisma.reviewLog.findMany({ where: { userId: targetUserId }, select: { isCorrect: true } }),
    prisma.reviewItem.findMany({ where: { userId: targetUserId } }),
  ]);

  const totalReviews = logs.length;
  const correctCount = logs.filter((l) => l.isCorrect).length;
  const incorrectCount = totalReviews - correctCount;
  const accuracyPercentage = totalReviews === 0 ? 0 : round2((correctCount / totalReviews) * 100);

  const masteredCount = items.filter((i) => i.state === ReviewState.MASTERED).length;
  const suspendedCount = items.filter((i) => i.state === ReviewState.SUSPENDED).length;
  const pendingCount = items.length - masteredCount - suspendedCount;
  const overdueCount = items.filter(
    (i) => i.state !== ReviewState.SUSPENDED && i.dueAt < now,
  ).length;

  const conceptItems = items.filter((i) => i.scope === "CONCEPT");
  const errorRateByConcept = await computeErrorRateByConcept(
    targetUserId,
    conceptItems.map((i) => i.conceptId!),
  );
  const weakestConcepts = conceptItems
    .map((item) => ({
      conceptId: item.conceptId!,
      reviewItemId: item.id,
      errorRate: errorRateByConcept.get(item.conceptId!) ?? 0,
    }))
    .filter((c) => c.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 5);

  return {
    totalReviews,
    correctCount,
    incorrectCount,
    accuracyPercentage,
    masteredCount,
    pendingCount,
    suspendedCount,
    overdueCount,
    weakestConcepts,
  };
}
