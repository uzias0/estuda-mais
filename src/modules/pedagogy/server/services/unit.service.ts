/**
 * Serviço de domínio para `Unit` — organiza `Stage`s numa ordem pedagógica
 * via `UnitStage` (N:N). `primaryDisciplineId`/`primarySchoolId` são âncoras
 * acadêmicas OPCIONAIS (docs/ARQUITETURA.md, seção 5): validadas por
 * existência quando informadas, mesmo padrão de `examEdition.service.ts`
 * (Módulo 3) para `Exam`/`ExamBoard`/`Organization`/`Position`/`Source`.
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  assertPublishStatusTransition,
  assertUnitPublishable,
  NotFoundError,
} from "./pedagogy-publication.service";
import { assertValidReorder } from "./reorder";
import { AuditableEntityType, PublicationStatus } from "@/generated/prisma/enums";
import {
  UnitCreateInputSchema,
  UnitUpdateInputSchema,
  UnitStageLinkInputSchema,
  type UnitCreateInput,
  type UnitUpdateInput,
  type UnitStageLinkInput,
} from "@/modules/pedagogy/types/unit.schema";

type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

async function assertAcademicAnchorsExist(data: {
  primaryDisciplineId?: string;
  primarySchoolId?: string;
}) {
  if (data.primaryDisciplineId) {
    const discipline = await prisma.discipline.findUnique({
      where: { id: data.primaryDisciplineId },
    });
    if (!discipline)
      throw new NotFoundError(`Discipline "${data.primaryDisciplineId}" não encontrada.`);
  }
  if (data.primarySchoolId) {
    const school = await prisma.school.findUnique({ where: { id: data.primarySchoolId } });
    if (!school) throw new NotFoundError(`School "${data.primarySchoolId}" não encontrada.`);
  }
}

export async function createUnit(actor: Actor, input: UnitCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = UnitCreateInputSchema.parse(input);
  await assertAcademicAnchorsExist(data);

  const unit = await prisma.unit.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.UNIT,
    entityId: unit.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: unit,
  });
  return unit;
}

export async function updateUnit(actor: Actor, id: string, input: UnitUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = UnitUpdateInputSchema.parse(input);
  await assertAcademicAnchorsExist(data);

  const existing = await prisma.unit.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Unit "${id}" não encontrada.`);

  const unit = await prisma.unit.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.UNIT,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: unit,
  });
  return unit;
}

export async function publishUnit(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.unit.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Unit "${id}" não encontrada.`);
  assertPublishStatusTransition(existing.status);
  await assertUnitPublishable(id);

  const unit = await prisma.unit.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.UNIT,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: unit,
  });
  return unit;
}

export async function archiveUnit(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.unit.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Unit "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const unit = await prisma.unit.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.UNIT,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: unit,
  });
  return unit;
}

/** Vincula uma `Stage` a uma `Unit` (`UnitStage`) — idempotente via upsert. */
export async function linkUnitToStage(actor: Actor, unitId: string, input: UnitStageLinkInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = UnitStageLinkInputSchema.parse(input);

  const [unit, stage] = await Promise.all([
    prisma.unit.findUnique({ where: { id: unitId } }),
    prisma.stage.findUnique({ where: { id: data.stageId } }),
  ]);
  if (!unit) throw new NotFoundError(`Unit "${unitId}" não encontrada.`);
  if (!stage) throw new NotFoundError(`Stage "${data.stageId}" não encontrada.`);

  const order = data.order ?? (await prisma.unitStage.count({ where: { unitId } }));
  const link = await prisma.unitStage.upsert({
    where: { unitId_stageId: { unitId, stageId: data.stageId } },
    create: { unitId, stageId: data.stageId, order },
    update: { order },
  });
  await recordAudit({
    entityType: AuditableEntityType.UNIT,
    entityId: unitId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: link,
  });
  return link;
}

export async function unlinkUnitFromStage(actor: Actor, unitId: string, stageId: string) {
  assertRole(actor, CURATOR_ROLES);
  await prisma.unitStage.delete({ where: { unitId_stageId: { unitId, stageId } } });
  await recordAudit({
    entityType: AuditableEntityType.UNIT,
    entityId: unitId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedStageId: stageId },
  });
}

/** Reordenação segura (Módulo 4, capacidade 11) — ver `reorder.ts`. */
export async function reorderUnitStages(actor: Actor, unitId: string, orderedStageIds: string[]) {
  assertRole(actor, CURATOR_ROLES);

  const current = await prisma.unitStage.findMany({ where: { unitId }, select: { stageId: true } });
  assertValidReorder(
    current.map((c) => c.stageId),
    orderedStageIds,
  );

  await prisma.$transaction(
    orderedStageIds.map((stageId, index) =>
      prisma.unitStage.update({
        where: { unitId_stageId: { unitId, stageId } },
        data: { order: index },
      }),
    ),
  );
  await recordAudit({
    entityType: AuditableEntityType.UNIT,
    entityId: unitId,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: { reorderedStageIds: orderedStageIds },
  });
}

export async function getUnit(id: string) {
  return prisma.unit.findUnique({
    where: { id },
    include: {
      primaryDiscipline: true,
      primarySchool: true,
      stages: { orderBy: { order: "asc" }, include: { stage: true } },
    },
  });
}

export async function listUnits(params?: {
  status?: PublicationStatusValue;
  primaryDisciplineId?: string;
  primarySchoolId?: string;
  take?: number;
  skip?: number;
}) {
  return prisma.unit.findMany({
    where: {
      status: params?.status,
      primaryDisciplineId: params?.primaryDisciplineId,
      primarySchoolId: params?.primarySchoolId,
    },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
