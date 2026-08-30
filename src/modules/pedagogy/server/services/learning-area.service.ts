/**
 * Serviço de domínio para `LearningArea` — "prateleira" curatorial (Módulo 4).
 * Organiza `Unit`s numa ordem pedagógica via `AreaUnit` (N:N) e é, por sua
 * vez, organizada dentro de uma ou mais `Track`s via `TrackArea`.
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  assertPublishStatusTransition,
  assertLearningAreaPublishable,
  NotFoundError,
} from "./pedagogy-publication.service";
import { assertValidReorder } from "./reorder";
import { AuditableEntityType, PublicationStatus } from "@/generated/prisma/enums";
import {
  LearningAreaCreateInputSchema,
  LearningAreaUpdateInputSchema,
  AreaUnitLinkInputSchema,
  type LearningAreaCreateInput,
  type LearningAreaUpdateInput,
  type AreaUnitLinkInput,
} from "@/modules/pedagogy/types/learning-area.schema";

type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

export async function createLearningArea(actor: Actor, input: LearningAreaCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = LearningAreaCreateInputSchema.parse(input);

  const area = await prisma.learningArea.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.LEARNING_AREA,
    entityId: area.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: area,
  });
  return area;
}

export async function updateLearningArea(actor: Actor, id: string, input: LearningAreaUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = LearningAreaUpdateInputSchema.parse(input);

  const existing = await prisma.learningArea.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LearningArea "${id}" não encontrada.`);

  const area = await prisma.learningArea.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.LEARNING_AREA,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: area,
  });
  return area;
}

export async function publishLearningArea(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.learningArea.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LearningArea "${id}" não encontrada.`);
  assertPublishStatusTransition(existing.status);
  await assertLearningAreaPublishable(id);

  const area = await prisma.learningArea.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.LEARNING_AREA,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: area,
  });
  return area;
}

export async function archiveLearningArea(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.learningArea.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LearningArea "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const area = await prisma.learningArea.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.LEARNING_AREA,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: area,
  });
  return area;
}

/** Vincula uma `Unit` a uma `LearningArea` (`AreaUnit`) — idempotente via upsert. */
export async function linkAreaToUnit(actor: Actor, areaId: string, input: AreaUnitLinkInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = AreaUnitLinkInputSchema.parse(input);

  const [area, unit] = await Promise.all([
    prisma.learningArea.findUnique({ where: { id: areaId } }),
    prisma.unit.findUnique({ where: { id: data.unitId } }),
  ]);
  if (!area) throw new NotFoundError(`LearningArea "${areaId}" não encontrada.`);
  if (!unit) throw new NotFoundError(`Unit "${data.unitId}" não encontrada.`);

  const order = data.order ?? (await prisma.areaUnit.count({ where: { areaId } }));
  const link = await prisma.areaUnit.upsert({
    where: { areaId_unitId: { areaId, unitId: data.unitId } },
    create: { areaId, unitId: data.unitId, order },
    update: { order },
  });
  await recordAudit({
    entityType: AuditableEntityType.LEARNING_AREA,
    entityId: areaId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: link,
  });
  return link;
}

export async function unlinkAreaFromUnit(actor: Actor, areaId: string, unitId: string) {
  assertRole(actor, CURATOR_ROLES);
  await prisma.areaUnit.delete({ where: { areaId_unitId: { areaId, unitId } } });
  await recordAudit({
    entityType: AuditableEntityType.LEARNING_AREA,
    entityId: areaId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedUnitId: unitId },
  });
}

/** Reordenação segura (Módulo 4, capacidade 11) — ver `reorder.ts`. */
export async function reorderAreaUnits(actor: Actor, areaId: string, orderedUnitIds: string[]) {
  assertRole(actor, CURATOR_ROLES);

  const current = await prisma.areaUnit.findMany({ where: { areaId }, select: { unitId: true } });
  assertValidReorder(
    current.map((c) => c.unitId),
    orderedUnitIds,
  );

  await prisma.$transaction(
    orderedUnitIds.map((unitId, index) =>
      prisma.areaUnit.update({
        where: { areaId_unitId: { areaId, unitId } },
        data: { order: index },
      }),
    ),
  );
  await recordAudit({
    entityType: AuditableEntityType.LEARNING_AREA,
    entityId: areaId,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: { reorderedUnitIds: orderedUnitIds },
  });
}

export async function getLearningArea(id: string) {
  return prisma.learningArea.findUnique({
    where: { id },
    include: { units: { orderBy: { order: "asc" }, include: { unit: true } } },
  });
}

export async function listLearningAreas(params?: {
  status?: PublicationStatusValue;
  take?: number;
  skip?: number;
}) {
  return prisma.learningArea.findMany({
    where: { status: params?.status },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
