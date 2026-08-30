/**
 * Progresso agregado por Track/LearningArea/Unit/Stage (Módulo 8, seção 33) —
 * "lessonsTotal/lessonsCompleted/lessonsMastered/percentage" para qualquer
 * nível da hierarquia pedagógica, sempre DERIVADO de `LessonProgress` (nunca
 * um percentual redundante gravado em algum lugar). Cuidado explícito com
 * N+1 (seção 34): cada nível resolve seus ids de lição com uma sequência
 * curta de consultas em lote (`in: [...]`), nunca uma consulta por lição.
 *
 * "lessonsCompleted" aqui inclui MASTERED — uma lição dominada
 * necessariamente já foi concluída primeiro (`lesson-progress.ts`,
 * `deriveLessonProgressStatus`: MASTERED exige COMPLETED como pré-condição).
 * `lessonsMastered` é informado separado para quem quiser o recorte mais
 * estrito.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { LessonProgressStatus, PublicationStatus } from "@/generated/prisma/enums";
import { assertOwnLearningDataOrAdmin } from "./learning-privacy";

export type LearningScope = "TRACK" | "AREA" | "UNIT" | "STAGE";

async function listPublishedLessonIdsForStage(stageId: string): Promise<string[]> {
  const rows = await prisma.stageLesson.findMany({
    where: { stageId, lesson: { status: PublicationStatus.PUBLISHED } },
    select: { lessonId: true },
  });
  return rows.map((r) => r.lessonId);
}

async function listPublishedLessonIdsForUnit(unitId: string): Promise<string[]> {
  const stageIds = (
    await prisma.unitStage.findMany({
      where: { unitId, stage: { status: PublicationStatus.PUBLISHED } },
      select: { stageId: true },
    })
  ).map((r) => r.stageId);
  if (stageIds.length === 0) return [];
  const rows = await prisma.stageLesson.findMany({
    where: { stageId: { in: stageIds }, lesson: { status: PublicationStatus.PUBLISHED } },
    select: { lessonId: true },
  });
  return [...new Set(rows.map((r) => r.lessonId))];
}

async function listPublishedLessonIdsForArea(areaId: string): Promise<string[]> {
  const unitIds = (
    await prisma.areaUnit.findMany({
      where: { areaId, unit: { status: PublicationStatus.PUBLISHED } },
      select: { unitId: true },
    })
  ).map((r) => r.unitId);
  if (unitIds.length === 0) return [];
  const stageIds = (
    await prisma.unitStage.findMany({
      where: { unitId: { in: unitIds }, stage: { status: PublicationStatus.PUBLISHED } },
      select: { stageId: true },
    })
  ).map((r) => r.stageId);
  if (stageIds.length === 0) return [];
  const rows = await prisma.stageLesson.findMany({
    where: { stageId: { in: stageIds }, lesson: { status: PublicationStatus.PUBLISHED } },
    select: { lessonId: true },
  });
  return [...new Set(rows.map((r) => r.lessonId))];
}

async function listPublishedLessonIdsForTrack(trackId: string): Promise<string[]> {
  const areaIds = (
    await prisma.trackArea.findMany({
      where: { trackId, area: { status: PublicationStatus.PUBLISHED } },
      select: { areaId: true },
    })
  ).map((r) => r.areaId);
  if (areaIds.length === 0) return [];
  const unitIds = (
    await prisma.areaUnit.findMany({
      where: { areaId: { in: areaIds }, unit: { status: PublicationStatus.PUBLISHED } },
      select: { unitId: true },
    })
  ).map((r) => r.unitId);
  if (unitIds.length === 0) return [];
  const stageIds = (
    await prisma.unitStage.findMany({
      where: { unitId: { in: unitIds }, stage: { status: PublicationStatus.PUBLISHED } },
      select: { stageId: true },
    })
  ).map((r) => r.stageId);
  if (stageIds.length === 0) return [];
  const rows = await prisma.stageLesson.findMany({
    where: { stageId: { in: stageIds }, lesson: { status: PublicationStatus.PUBLISHED } },
    select: { lessonId: true },
  });
  return [...new Set(rows.map((r) => r.lessonId))];
}

function listPublishedLessonIdsForScope(scope: LearningScope, id: string): Promise<string[]> {
  switch (scope) {
    case "TRACK":
      return listPublishedLessonIdsForTrack(id);
    case "AREA":
      return listPublishedLessonIdsForArea(id);
    case "UNIT":
      return listPublishedLessonIdsForUnit(id);
    case "STAGE":
      return listPublishedLessonIdsForStage(id);
  }
}

export interface ScopeProgress {
  scope: LearningScope;
  id: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  lessonsMastered: number;
  percentage: number;
}

/** Progresso agregado de um nível qualquer da hierarquia (seção 33), para um usuário. */
export async function getScopeProgress(
  actor: Actor,
  targetUserId: string,
  scope: LearningScope,
  id: string,
): Promise<ScopeProgress> {
  assertOwnLearningDataOrAdmin(actor, targetUserId);

  const lessonIds = await listPublishedLessonIdsForScope(scope, id);
  if (lessonIds.length === 0) {
    return { scope, id, lessonsTotal: 0, lessonsCompleted: 0, lessonsMastered: 0, percentage: 0 };
  }

  const progresses = await prisma.lessonProgress.findMany({
    where: { userId: targetUserId, lessonId: { in: lessonIds } },
  });
  const lessonsMastered = progresses.filter(
    (p) => p.status === LessonProgressStatus.MASTERED,
  ).length;
  const lessonsCompleted = progresses.filter(
    (p) =>
      p.status === LessonProgressStatus.COMPLETED || p.status === LessonProgressStatus.MASTERED,
  ).length;

  return {
    scope,
    id,
    lessonsTotal: lessonIds.length,
    lessonsCompleted,
    lessonsMastered,
    percentage: Math.round((lessonsCompleted / lessonIds.length) * 10000) / 100,
  };
}

export function getTrackProgress(actor: Actor, targetUserId: string, trackId: string) {
  return getScopeProgress(actor, targetUserId, "TRACK", trackId);
}
export function getLearningAreaProgress(actor: Actor, targetUserId: string, areaId: string) {
  return getScopeProgress(actor, targetUserId, "AREA", areaId);
}
export function getUnitProgress(actor: Actor, targetUserId: string, unitId: string) {
  return getScopeProgress(actor, targetUserId, "UNIT", unitId);
}
export function getStageProgress(actor: Actor, targetUserId: string, stageId: string) {
  return getScopeProgress(actor, targetUserId, "STAGE", stageId);
}
