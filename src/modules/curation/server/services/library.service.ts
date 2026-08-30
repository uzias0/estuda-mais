/**
 * Serviço de domínio para `LibraryItem` — biblioteca acadêmica/livros
 * gratuitos (Módulo 7, seção 5/6). `AcademicWork` NÃO é duplicado: quando o
 * material É uma obra já rastreada, `academicWorkId` aponta para ela;
 * `Source` NÃO é duplicado: procedência/URL/licença vivem lá (Módulo 2).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  NotFoundError,
} from "@/modules/curation/server/services/publicationPolicy";
import { assertLibraryItemPublishable } from "./content-publication.service";
import { ContentValidationError } from "./errors";
import {
  AuditableEntityType,
  LibraryMaterialType,
  PublicationStatus,
} from "@/generated/prisma/enums";
import {
  LibraryItemCreateInputSchema,
  LibraryItemUpdateInputSchema,
  type LibraryItemCreateInput,
  type LibraryItemUpdateInput,
} from "@/modules/curation/types/library-item.schema";

type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];
type LibraryMaterialTypeValue = (typeof LibraryMaterialType)[keyof typeof LibraryMaterialType];

async function assertSourceExists(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw new NotFoundError(`Source "${sourceId}" não encontrada.`);
}

async function assertAcademicWorkExists(academicWorkId?: string) {
  if (!academicWorkId) return;
  const work = await prisma.academicWork.findUnique({ where: { id: academicWorkId } });
  if (!work) throw new NotFoundError(`AcademicWork "${academicWorkId}" não encontrada.`);
}

export async function createLibraryItem(actor: Actor, input: LibraryItemCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = LibraryItemCreateInputSchema.parse(input);
  await assertSourceExists(data.sourceId);
  await assertAcademicWorkExists(data.academicWorkId);

  const item = await prisma.libraryItem.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.LIBRARY_ITEM,
    entityId: item.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: item,
  });
  return item;
}

export async function updateLibraryItem(actor: Actor, id: string, input: LibraryItemUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = LibraryItemUpdateInputSchema.parse(input);

  const existing = await prisma.libraryItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LibraryItem "${id}" não encontrado.`);
  if (data.sourceId) await assertSourceExists(data.sourceId);
  if (data.academicWorkId) await assertAcademicWorkExists(data.academicWorkId);

  // Revalida isFree/freeAccessReason com o resultado final (existente +
  // patch) — mesma regra cruzando campos de `question.service.ts` (Módulo 3):
  // um PATCH parcial não pode driblar a exigência via omissão de um dos dois campos.
  const nextIsFree = data.isFree ?? existing.isFree;
  const nextReason =
    data.freeAccessReason !== undefined ? data.freeAccessReason : existing.freeAccessReason;
  if (nextIsFree && !nextReason) {
    throw new ContentValidationError(
      "isFree=true exige freeAccessReason (procedência do acesso gratuito).",
    );
  }

  const item = await prisma.libraryItem.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.LIBRARY_ITEM,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: item,
  });
  return item;
}

export async function publishLibraryItem(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.libraryItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LibraryItem "${id}" não encontrado.`);
  await assertLibraryItemPublishable(existing);

  const item = await prisma.libraryItem.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.LIBRARY_ITEM,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: item,
  });
  return item;
}

export async function archiveLibraryItem(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.libraryItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LibraryItem "${id}" não encontrado.`);
  assertArchivable(existing.status);

  const item = await prisma.libraryItem.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.LIBRARY_ITEM,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: item,
  });
  return item;
}

/**
 * Restaura um item arquivado para `DRAFT` (Módulo 7, seção 20: "restaurar
 * quando permitido") — só a partir de `ARCHIVED`; nunca pula direto para
 * `PUBLISHED` (precisa passar de novo por `publishLibraryItem`, com todo o
 * gate de publicação reaplicado).
 */
export async function restoreLibraryItem(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.libraryItem.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LibraryItem "${id}" não encontrado.`);
  if (existing.status !== PublicationStatus.ARCHIVED) {
    throw new ContentValidationError("Só é possível restaurar um item que está arquivado.");
  }

  const item = await prisma.libraryItem.update({
    where: { id },
    data: { status: PublicationStatus.DRAFT },
  });
  await recordAudit({
    entityType: AuditableEntityType.LIBRARY_ITEM,
    entityId: id,
    action: AUDIT_ACTIONS.RESTORE,
    actorUserId: actor.userId,
    snapshot: item,
  });
  return item;
}

export async function getLibraryItem(id: string) {
  return prisma.libraryItem.findUnique({
    where: { id },
    include: { academicWork: true, source: true, knowledgeTags: true },
  });
}

export async function listLibraryItems(params?: {
  status?: PublicationStatusValue;
  materialType?: LibraryMaterialTypeValue;
  take?: number;
  skip?: number;
}) {
  return prisma.libraryItem.findMany({
    where: { status: params?.status, materialType: params?.materialType },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}
