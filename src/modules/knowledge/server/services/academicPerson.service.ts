/**
 * Serviço de domínio para `AcademicPerson` — sem restrição de profissão
 * (psicólogos, filósofos, pesquisadores, psiquiatras... Módulo 2, seção 15).
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
  AcademicPersonCreateInputSchema,
  AcademicPersonUpdateInputSchema,
  type AcademicPersonCreateInput,
  type AcademicPersonUpdateInput,
} from "@/modules/knowledge/types/academic-person.schema";

async function assertPeriodExists(periodId?: string) {
  if (!periodId) return;
  const period = await prisma.historicalPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new NotFoundError(`HistoricalPeriod "${periodId}" não encontrado.`);
}

export async function createAcademicPerson(actor: Actor, input: AcademicPersonCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = AcademicPersonCreateInputSchema.parse(input);
  await assertPeriodExists(data.periodId);

  const person = await prisma.academicPerson.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.PERSON,
    entityId: person.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: person,
  });
  return person;
}

export async function updateAcademicPerson(
  actor: Actor,
  id: string,
  input: AcademicPersonUpdateInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = AcademicPersonUpdateInputSchema.parse(input);
  await assertPeriodExists(data.periodId);

  const existing = await prisma.academicPerson.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`AcademicPerson "${id}" não encontrada.`);

  const person = await prisma.academicPerson.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.PERSON,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: person,
  });
  return person;
}

export async function publishAcademicPerson(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.academicPerson.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`AcademicPerson "${id}" não encontrada.`);

  await assertPublishable(CitationEntityType.PERSON, id, existing.status);

  const person = await prisma.academicPerson.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.PERSON,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: person,
  });
  return person;
}

export async function archiveAcademicPerson(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.academicPerson.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`AcademicPerson "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const person = await prisma.academicPerson.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.PERSON,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: person,
  });
  return person;
}

export async function linkPersonToTag(actor: Actor, personId: string, tagId: string) {
  assertRole(actor, CURATOR_ROLES);

  const [person, tag] = await Promise.all([
    prisma.academicPerson.findUnique({ where: { id: personId } }),
    prisma.tag.findUnique({ where: { id: tagId } }),
  ]);
  if (!person) throw new NotFoundError(`AcademicPerson "${personId}" não encontrada.`);
  if (!tag) throw new NotFoundError(`Tag "${tagId}" não encontrada.`);

  const updated = await prisma.academicPerson.update({
    where: { id: personId },
    data: { tags: { connect: { id: tagId } } },
    include: { tags: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.PERSON,
    entityId: personId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: { linkedTagId: tagId },
  });
  return updated;
}

export async function unlinkPersonFromTag(actor: Actor, personId: string, tagId: string) {
  assertRole(actor, CURATOR_ROLES);
  const updated = await prisma.academicPerson.update({
    where: { id: personId },
    data: { tags: { disconnect: { id: tagId } } },
    include: { tags: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.PERSON,
    entityId: personId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedTagId: tagId },
  });
  return updated;
}

export async function getAcademicPerson(id: string) {
  return prisma.academicPerson.findUnique({
    where: { id },
    include: { period: true, tags: true, works: { include: { work: true } } },
  });
}

export async function listAcademicPersons(params?: {
  take?: number;
  skip?: number;
  status?: PublicationStatus;
}) {
  return prisma.academicPerson.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    where: params?.status ? { status: params.status } : undefined,
    orderBy: { name: "asc" },
  });
}

/**
 * Leitura pública por `slug` (fase "Biblioteca de Pessoas" — pedido do
 * usuário: mostrar a bio real de cada pensador, com a arte que ele
 * mandou). Só devolve registros PUBLISHED — mesmo padrão de
 * `getLibraryItem`/`[id]/page.tsx` (checa `status` de novo na própria
 * página, defesa em profundidade contra acesso direto por slug de algo
 * ainda em rascunho).
 */
export async function getAcademicPersonBySlug(slug: string) {
  return prisma.academicPerson.findUnique({
    where: { slug },
    include: { period: true, tags: true, works: { include: { work: true } } },
  });
}
