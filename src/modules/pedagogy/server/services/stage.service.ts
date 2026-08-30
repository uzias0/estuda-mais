/**
 * Serviço de domínio para `Stage` — organiza `Lesson`s numa ordem
 * pedagógica via `StageLesson` (N:N), o join que corrige a v1 (Módulo 4):
 * uma `Lesson` pode ser reaproveitada por mais de uma `Stage` sem duplicar
 * conteúdo (docs/ARQUITETURA.md, seção 3).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  assertPublishStatusTransition,
  assertStagePublishable,
  NotFoundError,
} from "./pedagogy-publication.service";
import { assertValidReorder } from "./reorder";
import { AuditableEntityType, PublicationStatus, StageType } from "@/generated/prisma/enums";
import {
  StageCreateInputSchema,
  StageUpdateInputSchema,
  StageLessonLinkInputSchema,
  type StageCreateInput,
  type StageUpdateInput,
  type StageLessonLinkInput,
} from "@/modules/pedagogy/types/stage.schema";

type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];
type StageTypeValue = (typeof StageType)[keyof typeof StageType];

export async function createStage(actor: Actor, input: StageCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = StageCreateInputSchema.parse(input);

  const stage = await prisma.stage.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.STAGE,
    entityId: stage.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: stage,
  });
  return stage;
}

export async function updateStage(actor: Actor, id: string, input: StageUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = StageUpdateInputSchema.parse(input);

  const existing = await prisma.stage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Stage "${id}" não encontrada.`);

  const stage = await prisma.stage.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.STAGE,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: stage,
  });
  return stage;
}

export async function publishStage(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.stage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Stage "${id}" não encontrada.`);
  assertPublishStatusTransition(existing.status);
  await assertStagePublishable(id);

  const stage = await prisma.stage.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.STAGE,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: stage,
  });
  return stage;
}

export async function archiveStage(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.stage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Stage "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const stage = await prisma.stage.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.STAGE,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: stage,
  });
  return stage;
}

/** Vincula uma `Lesson` a uma `Stage` (`StageLesson`) — idempotente via upsert. */
export async function linkStageToLesson(
  actor: Actor,
  stageId: string,
  input: StageLessonLinkInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = StageLessonLinkInputSchema.parse(input);

  const [stage, lesson] = await Promise.all([
    prisma.stage.findUnique({ where: { id: stageId } }),
    prisma.lesson.findUnique({ where: { id: data.lessonId } }),
  ]);
  if (!stage) throw new NotFoundError(`Stage "${stageId}" não encontrada.`);
  if (!lesson) throw new NotFoundError(`Lesson "${data.lessonId}" não encontrada.`);

  const order = data.order ?? (await prisma.stageLesson.count({ where: { stageId } }));
  const link = await prisma.stageLesson.upsert({
    where: { stageId_lessonId: { stageId, lessonId: data.lessonId } },
    create: { stageId, lessonId: data.lessonId, order },
    update: { order },
  });
  await recordAudit({
    entityType: AuditableEntityType.STAGE,
    entityId: stageId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: link,
  });
  return link;
}

export async function unlinkStageFromLesson(actor: Actor, stageId: string, lessonId: string) {
  assertRole(actor, CURATOR_ROLES);
  await prisma.stageLesson.delete({ where: { stageId_lessonId: { stageId, lessonId } } });
  await recordAudit({
    entityType: AuditableEntityType.STAGE,
    entityId: stageId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedLessonId: lessonId },
  });
}

/** Reordenação segura (Módulo 4, capacidade 11) — ver `reorder.ts`. */
export async function reorderStageLessons(
  actor: Actor,
  stageId: string,
  orderedLessonIds: string[],
) {
  assertRole(actor, CURATOR_ROLES);

  const current = await prisma.stageLesson.findMany({
    where: { stageId },
    select: { lessonId: true },
  });
  assertValidReorder(
    current.map((c) => c.lessonId),
    orderedLessonIds,
  );

  await prisma.$transaction(
    orderedLessonIds.map((lessonId, index) =>
      prisma.stageLesson.update({
        where: { stageId_lessonId: { stageId, lessonId } },
        data: { order: index },
      }),
    ),
  );
  await recordAudit({
    entityType: AuditableEntityType.STAGE,
    entityId: stageId,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: { reorderedLessonIds: orderedLessonIds },
  });
}

export async function getStage(id: string) {
  return prisma.stage.findUnique({
    where: { id },
    include: { lessons: { orderBy: { order: "asc" }, include: { lesson: true } } },
  });
}

export async function listStages(params?: {
  status?: PublicationStatusValue;
  type?: StageTypeValue;
  take?: number;
  skip?: number;
}) {
  return prisma.stage.findMany({
    where: { status: params?.status, type: params?.type },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
