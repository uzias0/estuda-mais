"use server";

/**
 * Server Actions administrativas para a árvore pedagógica (Módulo 12) —
 * `Track` (bespoke, fora do registro genérico porque sua página de detalhe
 * é a árvore completa, não um formulário escalar) + os 4 níveis de
 * vínculo/reordenação (`TrackArea`/`AreaUnit`/`UnitStage`/`StageLesson`) +
 * `LessonBlock` (editor de lição) + tags de conhecimento da Lesson. Camada
 * fina sobre `track.service.ts`/`learning-area.service.ts`/`unit.service.ts`/
 * `stage.service.ts`/`lesson.service.ts`/`lesson-block.service.ts`
 * (Módulo 4) — nenhuma lógica de ordenação nova (reaproveita
 * `reorderXxx`/`assertValidReorder` já existentes).
 */
import { redirect } from "next/navigation";
import { requireAdminSessionActor } from "@/server/auth/session";
import {
  createTrack,
  updateTrack,
  publishTrack,
  archiveTrack,
  linkTrackToArea,
  unlinkTrackFromArea,
  reorderTrackAreas,
} from "@/modules/pedagogy/server/services/track.service";
import {
  linkAreaToUnit,
  unlinkAreaFromUnit,
  reorderAreaUnits,
} from "@/modules/pedagogy/server/services/learning-area.service";
import {
  linkUnitToStage,
  unlinkUnitFromStage,
  reorderUnitStages,
} from "@/modules/pedagogy/server/services/unit.service";
import {
  linkStageToLesson,
  unlinkStageFromLesson,
  reorderStageLessons,
} from "@/modules/pedagogy/server/services/stage.service";
import {
  linkLessonToKnowledge,
  unlinkLessonFromKnowledge,
} from "@/modules/pedagogy/server/services/lesson.service";
import {
  createLessonBlock,
  updateLessonBlock,
  deleteLessonBlock,
  reorderLessonBlocks,
} from "@/modules/pedagogy/server/services/lesson-block.service";

// ---- Track -------------------------------------------------------------

export async function createTrackAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  const track = await createTrack(actor, {
    slug: String(formData.get("slug")),
    name: String(formData.get("name")),
    mode: String(formData.get("mode")) as never,
  });
  redirect(`/admin/pedagogy/tracks/${track.id}`);
}

export async function updateTrackAction(id: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await updateTrack(actor, id, { name: String(formData.get("name")) });
}

export async function publishTrackAction(id: string) {
  const actor = await requireAdminSessionActor();
  await publishTrack(actor, id);
}

export async function archiveTrackAction(id: string) {
  const actor = await requireAdminSessionActor();
  await archiveTrack(actor, id);
}

// ---- Track ⇄ Area --------------------------------------------------------

export async function linkTrackToAreaAction(trackId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkTrackToArea(actor, trackId, { areaId: String(formData.get("areaId")) });
}

export async function unlinkTrackFromAreaAction(trackId: string, areaId: string) {
  const actor = await requireAdminSessionActor();
  await unlinkTrackFromArea(actor, trackId, areaId);
}

export async function reorderTrackAreasAction(trackId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  const ids = String(formData.get("orderedIds"))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await reorderTrackAreas(actor, trackId, ids);
}

// ---- Area ⇄ Unit ---------------------------------------------------------

export async function linkAreaToUnitAction(trackId: string, areaId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkAreaToUnit(actor, areaId, { unitId: String(formData.get("unitId")) });
}

export async function unlinkAreaFromUnitAction(trackId: string, areaId: string, unitId: string) {
  const actor = await requireAdminSessionActor();
  await unlinkAreaFromUnit(actor, areaId, unitId);
}

export async function reorderAreaUnitsAction(trackId: string, areaId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  const ids = String(formData.get("orderedIds"))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await reorderAreaUnits(actor, areaId, ids);
}

// ---- Unit ⇄ Stage ---------------------------------------------------------

export async function linkUnitToStageAction(trackId: string, unitId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkUnitToStage(actor, unitId, { stageId: String(formData.get("stageId")) });
}

export async function unlinkUnitFromStageAction(trackId: string, unitId: string, stageId: string) {
  const actor = await requireAdminSessionActor();
  await unlinkUnitFromStage(actor, unitId, stageId);
}

export async function reorderUnitStagesAction(trackId: string, unitId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  const ids = String(formData.get("orderedIds"))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await reorderUnitStages(actor, unitId, ids);
}

// ---- Stage ⇄ Lesson --------------------------------------------------------

export async function linkStageToLessonAction(
  trackId: string,
  stageId: string,
  formData: FormData,
) {
  const actor = await requireAdminSessionActor();
  await linkStageToLesson(actor, stageId, { lessonId: String(formData.get("lessonId")) });
}

export async function unlinkStageFromLessonAction(
  trackId: string,
  stageId: string,
  lessonId: string,
) {
  const actor = await requireAdminSessionActor();
  await unlinkStageFromLesson(actor, stageId, lessonId);
}

export async function reorderStageLessonsAction(
  trackId: string,
  stageId: string,
  formData: FormData,
) {
  const actor = await requireAdminSessionActor();
  const ids = String(formData.get("orderedIds"))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await reorderStageLessons(actor, stageId, ids);
}

// ---- Lesson ⇄ conhecimento --------------------------------------------------

export async function linkLessonToKnowledgeAction(lessonId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkLessonToKnowledge(actor, lessonId, {
    entityType: String(formData.get("entityType")) as never,
    entityId: String(formData.get("entityId")),
  });
}

export async function unlinkLessonFromKnowledgeAction(
  lessonId: string,
  entityType: string,
  entityId: string,
) {
  const actor = await requireAdminSessionActor();
  await unlinkLessonFromKnowledge(actor, lessonId, { entityType: entityType as never, entityId });
}

// ---- LessonBlock (editor de lição) ------------------------------------------

export async function createLessonBlockAction(lessonId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  const order = Number(formData.get("order")) || 0;
  const content = formData.get("content") ? String(formData.get("content")) : undefined;
  const questionId = formData.get("questionId") ? String(formData.get("questionId")) : undefined;
  await createLessonBlock(actor, lessonId, {
    order,
    type: String(formData.get("type")) as never,
    content,
    questionId,
  });
}

export async function updateLessonBlockAction(
  lessonId: string,
  blockId: string,
  formData: FormData,
) {
  const actor = await requireAdminSessionActor();
  const content = formData.get("content") ? String(formData.get("content")) : undefined;
  const questionId = formData.get("questionId") ? String(formData.get("questionId")) : undefined;
  await updateLessonBlock(actor, blockId, {
    type: String(formData.get("type")) as never,
    content,
    questionId,
  });
}

export async function deleteLessonBlockAction(lessonId: string, blockId: string) {
  const actor = await requireAdminSessionActor();
  await deleteLessonBlock(actor, blockId);
}

export async function reorderLessonBlocksAction(lessonId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  const ids = String(formData.get("orderedIds"))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await reorderLessonBlocks(actor, lessonId, ids);
}
