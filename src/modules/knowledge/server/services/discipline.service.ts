/**
 * Serviço de domínio para `Discipline` (Filosofia, Psicologia, Sociologia...).
 * Publicação exige >= 1 Citation (Módulo 2, seção 7) — regra centralizada em
 * `publicationPolicy.ts`, não reimplementada aqui.
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
  DisciplineCreateInputSchema,
  DisciplineUpdateInputSchema,
  type DisciplineCreateInput,
  type DisciplineUpdateInput,
} from "@/modules/knowledge/types/discipline.schema";

export async function createDiscipline(actor: Actor, input: DisciplineCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = DisciplineCreateInputSchema.parse(input);

  const discipline = await prisma.discipline.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.DISCIPLINE,
    entityId: discipline.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: discipline,
  });
  return discipline;
}

export async function updateDiscipline(actor: Actor, id: string, input: DisciplineUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = DisciplineUpdateInputSchema.parse(input);

  const existing = await prisma.discipline.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Discipline "${id}" não encontrada.`);

  const discipline = await prisma.discipline.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.DISCIPLINE,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: discipline,
  });
  return discipline;
}

export async function publishDiscipline(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.discipline.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Discipline "${id}" não encontrada.`);

  await assertPublishable(CitationEntityType.DISCIPLINE, id, existing.status);

  const discipline = await prisma.discipline.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.DISCIPLINE,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: discipline,
  });
  return discipline;
}

export async function archiveDiscipline(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.discipline.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Discipline "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const discipline = await prisma.discipline.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.DISCIPLINE,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: discipline,
  });
  return discipline;
}

export async function getDiscipline(id: string) {
  return prisma.discipline.findUnique({ where: { id }, include: { schools: true } });
}

export async function listDisciplines(params?: { take?: number; skip?: number }) {
  return prisma.discipline.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
