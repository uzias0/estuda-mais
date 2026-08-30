/**
 * Serviço de domínio para `School` (escola/corrente/abordagem teórica).
 * Relação N:N com `Discipline` preservada tal como no schema (Módulo 2,
 * seção 18: "não alterar para 1:N").
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertPublishable,
  assertArchivable,
  NotFoundError,
} from "@/modules/curation/server/services/publicationPolicy";
import {
  AuditableEntityType,
  CitationEntityType,
  PublicationStatus,
} from "@/generated/prisma/enums";
import {
  SchoolCreateInputSchema,
  SchoolUpdateInputSchema,
  type SchoolCreateInput,
  type SchoolUpdateInput,
} from "@/modules/knowledge/types/school.schema";

export async function createSchool(actor: Actor, input: SchoolCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = SchoolCreateInputSchema.parse(input);

  const school = await prisma.school.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.SCHOOL,
    entityId: school.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: school,
  });
  return school;
}

export async function updateSchool(actor: Actor, id: string, input: SchoolUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = SchoolUpdateInputSchema.parse(input);

  const existing = await prisma.school.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`School "${id}" não encontrada.`);

  const school = await prisma.school.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.SCHOOL,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: school,
  });
  return school;
}

export async function publishSchool(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.school.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`School "${id}" não encontrada.`);

  await assertPublishable(CitationEntityType.SCHOOL, id, existing.status);

  const school = await prisma.school.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.SCHOOL,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: school,
  });
  return school;
}

export async function archiveSchool(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.school.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`School "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const school = await prisma.school.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.SCHOOL,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: school,
  });
  return school;
}

/** Associa uma `School` a uma `Discipline` (N:N implícita — ver schema.prisma). */
export async function linkSchoolToDiscipline(actor: Actor, schoolId: string, disciplineId: string) {
  assertRole(actor, CURATOR_ROLES);

  const [school, discipline] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId } }),
    prisma.discipline.findUnique({ where: { id: disciplineId } }),
  ]);
  if (!school) throw new NotFoundError(`School "${schoolId}" não encontrada.`);
  if (!discipline) throw new NotFoundError(`Discipline "${disciplineId}" não encontrada.`);

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: { disciplines: { connect: { id: disciplineId } } },
    include: { disciplines: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.SCHOOL,
    entityId: schoolId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: { linkedDisciplineId: disciplineId },
  });
  return updated;
}

export async function unlinkSchoolFromDiscipline(
  actor: Actor,
  schoolId: string,
  disciplineId: string,
) {
  assertRole(actor, CURATOR_ROLES);

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: { disciplines: { disconnect: { id: disciplineId } } },
    include: { disciplines: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.SCHOOL,
    entityId: schoolId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedDisciplineId: disciplineId },
  });
  return updated;
}

export async function getSchool(id: string) {
  return prisma.school.findUnique({
    where: { id },
    include: { disciplines: true, theories: true },
  });
}

export async function listSchools(params?: { take?: number; skip?: number }) {
  return prisma.school.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
