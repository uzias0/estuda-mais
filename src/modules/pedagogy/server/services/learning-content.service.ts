/**
 * Conteúdo relacionado a uma lição (Módulo 8, seções 25-31) — ponte pura de
 * composição sobre serviços que já existem, sem reimplementar nada:
 *
 *   Lesson → LessonKnowledgeTag (Concept) → getReviewQueue (Módulo 5)
 *                                          → getComplementaryContentForConcept
 *                                            (Módulo 7: biblioteca + atualidades
 *                                            + questões recentes)
 *
 * Nenhuma notícia/questão/livro é inventado aqui — só publicado e com fonte
 * válida passa pelos serviços reaproveitados (regra deles, não deste).
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { KnowledgeEntityType } from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { getReviewQueue } from "@/modules/review/server/services/reviewQueue.service";
import { getComplementaryContentForConcept } from "@/modules/curation/server/services/complementary-content.service";

export interface PendingReviewSummary {
  count: number;
  items: Array<{
    reviewItemId: string;
    conceptId: string | null;
    priority: number;
    reason: string;
  }>;
}

export interface RelatedLearningContent {
  lessonId: string;
  conceptIds: string[];
  /** "Você tem revisão pendente deste conceito." (seção 25) — reaproveita `getReviewQueue`, filtrado por esta lição. */
  pendingReview: PendingReviewSummary;
  /** Biblioteca + atualidades + questões recentes, por conceito ensinado (seção 27/28/31). */
  complementary: Array<Awaited<ReturnType<typeof getComplementaryContentForConcept>>>;
}

export async function getRelatedLearningContent(
  actor: Actor,
  lessonId: string,
  targetUserId: string = actor.userId,
  options?: { take?: number },
): Promise<RelatedLearningContent> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { knowledgeTags: true },
  });
  if (!lesson) throw new NotFoundError(`Lesson "${lessonId}" não encontrada.`);

  const conceptIds = lesson.knowledgeTags
    .filter((tag) => tag.entityType === KnowledgeEntityType.CONCEPT)
    .map((tag) => tag.entityId);

  const take = options?.take ?? 10;
  const [reviewQueue, complementary] = await Promise.all([
    getReviewQueue(actor, targetUserId, { lessonId, limit: take }),
    Promise.all(
      conceptIds.map((conceptId) => getComplementaryContentForConcept(conceptId, { take })),
    ),
  ]);

  return {
    lessonId,
    conceptIds,
    pendingReview: {
      count: reviewQueue.length,
      items: reviewQueue.map((entry) => ({
        reviewItemId: entry.reviewItem.id,
        conceptId: entry.reviewItem.conceptId,
        priority: entry.priority,
        reason: entry.reason,
      })),
    },
    complementary,
  };
}
