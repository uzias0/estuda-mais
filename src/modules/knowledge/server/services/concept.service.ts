/**
 * Serviço de domínio para `Concept` — entidade central da Base de
 * Conhecimento (Módulo 2, seção 14).
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
  ConceptCreateInputSchema,
  ConceptUpdateInputSchema,
  type ConceptCreateInput,
  type ConceptUpdateInput,
} from "@/modules/knowledge/types/concept.schema";

async function assertDevelopmentalStageExists(developmentalStageId?: string) {
  if (!developmentalStageId) return;
  const stage = await prisma.developmentalStage.findUnique({ where: { id: developmentalStageId } });
  if (!stage)
    throw new NotFoundError(`DevelopmentalStage "${developmentalStageId}" não encontrado.`);
}

export async function createConcept(actor: Actor, input: ConceptCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ConceptCreateInputSchema.parse(input);
  await assertDevelopmentalStageExists(data.developmentalStageId);

  const concept = await prisma.concept.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.CONCEPT,
    entityId: concept.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: concept,
  });
  return concept;
}

export async function updateConcept(actor: Actor, id: string, input: ConceptUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ConceptUpdateInputSchema.parse(input);
  await assertDevelopmentalStageExists(data.developmentalStageId);

  const existing = await prisma.concept.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Concept "${id}" não encontrado.`);

  const concept = await prisma.concept.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.CONCEPT,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: concept,
  });
  return concept;
}

export async function publishConcept(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.concept.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Concept "${id}" não encontrado.`);

  await assertPublishable(CitationEntityType.CONCEPT, id, existing.status);

  const concept = await prisma.concept.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.CONCEPT,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: concept,
  });
  return concept;
}

export async function archiveConcept(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.concept.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Concept "${id}" não encontrado.`);
  assertArchivable(existing.status);

  const concept = await prisma.concept.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.CONCEPT,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: concept,
  });
  return concept;
}

export async function linkConceptToWork(actor: Actor, conceptId: string, workId: string) {
  assertRole(actor, CURATOR_ROLES);

  const [concept, work] = await Promise.all([
    prisma.concept.findUnique({ where: { id: conceptId } }),
    prisma.academicWork.findUnique({ where: { id: workId } }),
  ]);
  if (!concept) throw new NotFoundError(`Concept "${conceptId}" não encontrado.`);
  if (!work) throw new NotFoundError(`AcademicWork "${workId}" não encontrada.`);

  const updated = await prisma.concept.update({
    where: { id: conceptId },
    data: { works: { connect: { id: workId } } },
    include: { works: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.CONCEPT,
    entityId: conceptId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: { linkedWorkId: workId },
  });
  return updated;
}

export async function unlinkConceptFromWork(actor: Actor, conceptId: string, workId: string) {
  assertRole(actor, CURATOR_ROLES);
  const updated = await prisma.concept.update({
    where: { id: conceptId },
    data: { works: { disconnect: { id: workId } } },
    include: { works: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.CONCEPT,
    entityId: conceptId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedWorkId: workId },
  });
  return updated;
}

export async function linkConceptToTag(actor: Actor, conceptId: string, tagId: string) {
  assertRole(actor, CURATOR_ROLES);

  const [concept, tag] = await Promise.all([
    prisma.concept.findUnique({ where: { id: conceptId } }),
    prisma.tag.findUnique({ where: { id: tagId } }),
  ]);
  if (!concept) throw new NotFoundError(`Concept "${conceptId}" não encontrado.`);
  if (!tag) throw new NotFoundError(`Tag "${tagId}" não encontrada.`);

  const updated = await prisma.concept.update({
    where: { id: conceptId },
    data: { tags: { connect: { id: tagId } } },
    include: { tags: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.CONCEPT,
    entityId: conceptId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: { linkedTagId: tagId },
  });
  return updated;
}

export async function unlinkConceptFromTag(actor: Actor, conceptId: string, tagId: string) {
  assertRole(actor, CURATOR_ROLES);
  const updated = await prisma.concept.update({
    where: { id: conceptId },
    data: { tags: { disconnect: { id: tagId } } },
    include: { tags: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.CONCEPT,
    entityId: conceptId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedTagId: tagId },
  });
  return updated;
}

export async function getConcept(id: string) {
  return prisma.concept.findUnique({
    where: { id },
    include: { theories: true, works: true, tags: true, developmentalStage: true },
  });
}

export async function listConcepts(params?: { take?: number; skip?: number }) {
  return prisma.concept.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
