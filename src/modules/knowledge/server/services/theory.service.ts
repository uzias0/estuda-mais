/**
 * Serviço de domínio para `Theory`. Relações N:N com `School` e `Concept`
 * preservadas tal como no schema — não vira uma tabela paralela de
 * "abordagens psicológicas" (Módulo 2, seção 17).
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
  TheoryCreateInputSchema,
  TheoryUpdateInputSchema,
  type TheoryCreateInput,
  type TheoryUpdateInput,
} from "@/modules/knowledge/types/theory.schema";

async function assertPeriodExists(originPeriodId?: string) {
  if (!originPeriodId) return;
  const period = await prisma.historicalPeriod.findUnique({ where: { id: originPeriodId } });
  if (!period) throw new NotFoundError(`HistoricalPeriod "${originPeriodId}" não encontrado.`);
}

export async function createTheory(actor: Actor, input: TheoryCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = TheoryCreateInputSchema.parse(input);
  await assertPeriodExists(data.originPeriodId);

  const theory = await prisma.theory.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.THEORY,
    entityId: theory.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: theory,
  });
  return theory;
}

export async function updateTheory(actor: Actor, id: string, input: TheoryUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = TheoryUpdateInputSchema.parse(input);
  await assertPeriodExists(data.originPeriodId);

  const existing = await prisma.theory.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Theory "${id}" não encontrada.`);

  const theory = await prisma.theory.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.THEORY,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: theory,
  });
  return theory;
}

export async function publishTheory(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.theory.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Theory "${id}" não encontrada.`);

  await assertPublishable(CitationEntityType.THEORY, id, existing.status);

  const theory = await prisma.theory.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.THEORY,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: theory,
  });
  return theory;
}

export async function archiveTheory(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.theory.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Theory "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const theory = await prisma.theory.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.THEORY,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: theory,
  });
  return theory;
}

export async function linkTheoryToSchool(actor: Actor, theoryId: string, schoolId: string) {
  assertRole(actor, CURATOR_ROLES);

  const [theory, school] = await Promise.all([
    prisma.theory.findUnique({ where: { id: theoryId } }),
    prisma.school.findUnique({ where: { id: schoolId } }),
  ]);
  if (!theory) throw new NotFoundError(`Theory "${theoryId}" não encontrada.`);
  if (!school) throw new NotFoundError(`School "${schoolId}" não encontrada.`);

  const updated = await prisma.theory.update({
    where: { id: theoryId },
    data: { schools: { connect: { id: schoolId } } },
    include: { schools: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.THEORY,
    entityId: theoryId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: { linkedSchoolId: schoolId },
  });
  return updated;
}

export async function unlinkTheoryFromSchool(actor: Actor, theoryId: string, schoolId: string) {
  assertRole(actor, CURATOR_ROLES);
  const updated = await prisma.theory.update({
    where: { id: theoryId },
    data: { schools: { disconnect: { id: schoolId } } },
    include: { schools: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.THEORY,
    entityId: theoryId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedSchoolId: schoolId },
  });
  return updated;
}

export async function linkTheoryToConcept(actor: Actor, theoryId: string, conceptId: string) {
  assertRole(actor, CURATOR_ROLES);

  const [theory, concept] = await Promise.all([
    prisma.theory.findUnique({ where: { id: theoryId } }),
    prisma.concept.findUnique({ where: { id: conceptId } }),
  ]);
  if (!theory) throw new NotFoundError(`Theory "${theoryId}" não encontrada.`);
  if (!concept) throw new NotFoundError(`Concept "${conceptId}" não encontrado.`);

  const updated = await prisma.theory.update({
    where: { id: theoryId },
    data: { concepts: { connect: { id: conceptId } } },
    include: { concepts: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.THEORY,
    entityId: theoryId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: { linkedConceptId: conceptId },
  });
  return updated;
}

export async function unlinkTheoryFromConcept(actor: Actor, theoryId: string, conceptId: string) {
  assertRole(actor, CURATOR_ROLES);
  const updated = await prisma.theory.update({
    where: { id: theoryId },
    data: { concepts: { disconnect: { id: conceptId } } },
    include: { concepts: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.THEORY,
    entityId: theoryId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedConceptId: conceptId },
  });
  return updated;
}

export async function getTheory(id: string) {
  return prisma.theory.findUnique({
    where: { id },
    include: { schools: true, concepts: true, originPeriod: true },
  });
}

export async function listTheories(params?: { take?: number; skip?: number }) {
  return prisma.theory.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
