/**
 * Serviço de domínio para `AcademicWork`. Diferente de Concept/Theory/
 * AcademicPerson/School/Discipline: publicação de uma obra NÃO exige
 * Citation (Módulo 2, seção 7 só lista os cinco anteriores + AcademicRelation
 * como gated) — `sourceId` é a procedência bibliográfica/de metadado
 * (opcional e secundária, docs/RELATORIO_REVISAO_V3.md seção 6), distinta de
 * Citation. Ainda assim a transição de status fica centralizada aqui, não
 * como edição de campo solto.
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  NotFoundError,
} from "@/modules/curation/server/services/publicationPolicy";
import { AuditableEntityType, PublicationStatus } from "@/generated/prisma/enums";
import {
  AcademicWorkCreateInputSchema,
  AcademicWorkUpdateInputSchema,
  AcademicWorkAuthorInputSchema,
  type AcademicWorkCreateInput,
  type AcademicWorkUpdateInput,
  type AcademicWorkAuthorInput,
} from "@/modules/knowledge/types/academic-work.schema";

async function assertSourceExists(sourceId?: string) {
  if (!sourceId) return;
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw new NotFoundError(`Source "${sourceId}" não encontrada.`);
}

export async function createAcademicWork(actor: Actor, input: AcademicWorkCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = AcademicWorkCreateInputSchema.parse(input);
  await assertSourceExists(data.sourceId);

  const work = await prisma.academicWork.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.WORK,
    entityId: work.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: work,
  });
  return work;
}

export async function updateAcademicWork(actor: Actor, id: string, input: AcademicWorkUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = AcademicWorkUpdateInputSchema.parse(input);
  await assertSourceExists(data.sourceId);

  const existing = await prisma.academicWork.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`AcademicWork "${id}" não encontrada.`);

  const work = await prisma.academicWork.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.WORK,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: work,
  });
  return work;
}

/** Publica a obra — sem gate de Citation (ver cabeçalho do arquivo), mas ainda centralizado e auditado. */
export async function publishAcademicWork(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.academicWork.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`AcademicWork "${id}" não encontrada.`);
  if (existing.status === PublicationStatus.ARCHIVED) {
    throw new Error("AcademicWork arquivada não pode ser publicada.");
  }
  if (existing.status === PublicationStatus.PUBLISHED) {
    throw new Error("AcademicWork já está publicada.");
  }

  const work = await prisma.academicWork.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.WORK,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: work,
  });
  return work;
}

export async function archiveAcademicWork(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.academicWork.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`AcademicWork "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const work = await prisma.academicWork.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.WORK,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: work,
  });
  return work;
}

/** Associa um `AcademicPerson` como autor/coautor/organizador/tradutor de uma `AcademicWork`. */
export async function addAuthorToWork(actor: Actor, input: AcademicWorkAuthorInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = AcademicWorkAuthorInputSchema.parse(input);

  const [person, work] = await Promise.all([
    prisma.academicPerson.findUnique({ where: { id: data.personId } }),
    prisma.academicWork.findUnique({ where: { id: data.workId } }),
  ]);
  if (!person) throw new NotFoundError(`AcademicPerson "${data.personId}" não encontrada.`);
  if (!work) throw new NotFoundError(`AcademicWork "${data.workId}" não encontrada.`);

  const authorLink = await prisma.academicWorkAuthor.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.WORK,
    entityId: data.workId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: authorLink,
  });
  return authorLink;
}

export async function removeAuthorFromWork(actor: Actor, personId: string, workId: string) {
  assertRole(actor, CURATOR_ROLES);
  await prisma.academicWorkAuthor.delete({ where: { personId_workId: { personId, workId } } });
  await recordAudit({
    entityType: AuditableEntityType.WORK,
    entityId: workId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedPersonId: personId },
  });
}

export async function getAcademicWork(id: string) {
  return prisma.academicWork.findUnique({
    where: { id },
    include: { source: true, authors: { include: { person: true } }, concepts: true },
  });
}

export async function listAcademicWorks(params?: { take?: number; skip?: number }) {
  return prisma.academicWork.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}
