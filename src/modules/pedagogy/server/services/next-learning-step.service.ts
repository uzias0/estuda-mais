/**
 * "Qual é o próximo passo?" (Módulo 8, seções 21-24) — transforma
 * disponibilidade derivada (`learning-unlock.service.ts`) em navegação
 * pedagógica concreta. Não reimplementa nenhum algoritmo de recomendação:
 * só percorre a estrutura já existente (Track→Area→Unit→Stage→Lesson) e o
 * resultado, já pronto, do diagnóstico do Módulo 3 (`getDiagnosticResult`).
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { PublicationStatus } from "@/generated/prisma/enums";
import { getDiagnosticResult } from "@/modules/assessment/server/services/diagnostic.service";
import { assertOwnLearningDataOrAdmin } from "./learning-privacy";
import { getTrackLessonAvailability } from "./learning-unlock.service";
import {
  getPedagogicalContextForConcepts,
  listLessonsByConcept,
  type PedagogicalContext,
} from "./pedagogy-query.service";

export interface NextLearningStep {
  track: { id: string; slug: string; name: string };
  area: { id: string; slug: string; name: string };
  unit: { id: string; name: string };
  stage: { id: string; name: string };
  lesson: { id: string; title: string };
  reason: string;
}

/**
 * Próxima lição disponível (seção 21). Sem `trackId`, percorre as trilhas
 * PUBLICADAS (ordem determinística por `id`) e devolve a primeira que ainda
 * tiver uma lição AVAILABLE para este usuário — devolve `null` quando não há
 * nenhum próximo passo (nenhuma trilha publicada, ou todas já concluídas).
 */
export async function getNextLearningStep(
  actor: Actor,
  targetUserId: string = actor.userId,
  options?: { trackId?: string },
): Promise<NextLearningStep | null> {
  assertOwnLearningDataOrAdmin(actor, targetUserId);

  const trackIds = options?.trackId
    ? [options.trackId]
    : (
        await prisma.track.findMany({
          where: { status: PublicationStatus.PUBLISHED },
          orderBy: { id: "asc" },
          select: { id: true },
        })
      ).map((t) => t.id);

  for (const trackId of trackIds) {
    const availability = await getTrackLessonAvailability(actor, targetUserId, trackId);
    const next = availability.find((entry) => entry.status === "AVAILABLE");
    if (!next) continue;

    const [track, area, unit, stage, lesson] = await Promise.all([
      prisma.track.findUniqueOrThrow({ where: { id: next.trackId } }),
      prisma.learningArea.findUniqueOrThrow({ where: { id: next.areaId } }),
      prisma.unit.findUniqueOrThrow({ where: { id: next.unitId } }),
      prisma.stage.findUniqueOrThrow({ where: { id: next.stageId } }),
      prisma.lesson.findUniqueOrThrow({ where: { id: next.lessonId } }),
    ]);

    return {
      track: { id: track.id, slug: track.slug, name: track.name },
      area: { id: area.id, slug: area.slug, name: area.name },
      unit: { id: unit.id, name: unit.name },
      stage: { id: stage.id, name: stage.name },
      lesson: { id: lesson.id, title: lesson.title },
      reason: next.reason,
    };
  }
  return null;
}

export interface StartingPointResult {
  lesson: { id: string; title: string } | null;
  conceptId: string | null;
  pedagogy: PedagogicalContext | null;
  reason: string;
}

/**
 * Ponto de partida a partir do diagnóstico (seção 22/23) — NÃO recalcula o
 * diagnóstico (delega a `getDiagnosticResult`, que já reforça que a sessão
 * pertence ao próprio `actor`), só localiza a primeira lição PUBLICADA que
 * ensina um dos conceitos recomendados como início.
 */
export async function getStartingPoint(
  actor: Actor,
  diagnosticSessionId: string,
): Promise<StartingPointResult> {
  const diagnostic = await getDiagnosticResult(actor, diagnosticSessionId);

  const conceptIds =
    diagnostic.recommendation.startingConceptIds.length > 0
      ? diagnostic.recommendation.startingConceptIds
      : diagnostic.weakConceptIds.length > 0
        ? diagnostic.weakConceptIds
        : diagnostic.strongConceptIds;

  if (conceptIds.length === 0) {
    return {
      lesson: null,
      conceptId: null,
      pedagogy: null,
      reason: diagnostic.recommendation.note,
    };
  }

  for (const conceptId of conceptIds) {
    const lessons = await listLessonsByConcept(conceptId, { publishedOnly: true, take: 1 });
    if (lessons.length > 0) {
      const pedagogy = await getPedagogicalContextForConcepts([conceptId]);
      return {
        lesson: { id: lessons[0].id, title: lessons[0].title },
        conceptId,
        pedagogy,
        reason: `Conceito identificado pelo diagnóstico como ponto de partida (${diagnostic.recommendation.note}) — primeira lição publicada encontrada para ele.`,
      };
    }
  }

  return {
    lesson: null,
    conceptId: conceptIds[0] ?? null,
    pedagogy: null,
    reason:
      "O diagnóstico identificou conceitos de partida, mas nenhum deles tem lição publicada associada ainda.",
  };
}
