/**
 * Serviço de domínio para `CurrentAffair` — atualidades/acontecimentos
 * recentes contextualizados academicamente (Módulo 7, seção 8/9/10).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  NotFoundError,
} from "@/modules/curation/server/services/publicationPolicy";
import { assertCurrentAffairPublishable } from "./content-publication.service";
import { ContentValidationError } from "./errors";
import { AuditableEntityType, PublicationStatus } from "@/generated/prisma/enums";
import {
  CurrentAffairCreateInputSchema,
  CurrentAffairUpdateInputSchema,
  type CurrentAffairCreateInput,
  type CurrentAffairUpdateInput,
} from "@/modules/curation/types/current-affair.schema";

type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

async function assertSourceExists(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw new NotFoundError(`Source "${sourceId}" não encontrada.`);
}

export async function createCurrentAffair(actor: Actor, input: CurrentAffairCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = CurrentAffairCreateInputSchema.parse(input);
  await assertSourceExists(data.sourceId);

  const affair = await prisma.currentAffair.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.CURRENT_AFFAIR,
    entityId: affair.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: affair,
  });
  return affair;
}

export async function updateCurrentAffair(
  actor: Actor,
  id: string,
  input: CurrentAffairUpdateInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = CurrentAffairUpdateInputSchema.parse(input);

  const existing = await prisma.currentAffair.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`CurrentAffair "${id}" não encontrada.`);
  if (data.sourceId) await assertSourceExists(data.sourceId);

  const affair = await prisma.currentAffair.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.CURRENT_AFFAIR,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: affair,
  });
  return affair;
}

export async function publishCurrentAffair(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.currentAffair.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`CurrentAffair "${id}" não encontrada.`);
  await assertCurrentAffairPublishable(existing);

  const affair = await prisma.currentAffair.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.CURRENT_AFFAIR,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: affair,
  });
  return affair;
}

export async function archiveCurrentAffair(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.currentAffair.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`CurrentAffair "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const affair = await prisma.currentAffair.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.CURRENT_AFFAIR,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: affair,
  });
  return affair;
}

/** Restaura uma atualidade arquivada para `DRAFT` (Módulo 7, seção 20) — mesma regra de `restoreLibraryItem`. */
export async function restoreCurrentAffair(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.currentAffair.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`CurrentAffair "${id}" não encontrada.`);
  if (existing.status !== PublicationStatus.ARCHIVED) {
    throw new ContentValidationError("Só é possível restaurar uma atualidade que está arquivada.");
  }

  const affair = await prisma.currentAffair.update({
    where: { id },
    data: { status: PublicationStatus.DRAFT },
  });
  await recordAudit({
    entityType: AuditableEntityType.CURRENT_AFFAIR,
    entityId: id,
    action: AUDIT_ACTIONS.RESTORE,
    actorUserId: actor.userId,
    snapshot: affair,
  });
  return affair;
}

export async function getCurrentAffair(id: string) {
  return prisma.currentAffair.findUnique({
    where: { id },
    include: { source: true, knowledgeTags: true, tags: true },
  });
}

export async function listCurrentAffairs(params?: {
  status?: PublicationStatusValue;
  take?: number;
  skip?: number;
}) {
  return prisma.currentAffair.findMany({
    where: { status: params?.status },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { eventDate: "desc" },
  });
}
