/**
 * Vinculação de `LibraryItem`/`CurrentAffair` a nós de conhecimento e (só
 * para atualidades) a `Tag` (Módulo 7, seção 10/33). Reaproveita
 * `resolveEntity`/`entityExists` (Módulo 1/2) — nenhum mecanismo
 * polimórfico novo, mesmo padrão de `linkLessonToKnowledge`/
 * `linkQuestionToKnowledge` (Módulos 3/4). Duas funções por entidade, não
 * uma abstração genérica sobre o *delegate* do Prisma — mesma decisão já
 * tomada no Módulo 3 (`examReference.service.ts`, decisão 6: "tipagem
 * estrita do Prisma incompatível com generalização").
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { AuditableEntityType } from "@/generated/prisma/enums";
import { entityExists } from "@/modules/knowledge/server/services/resolveEntity";
import {
  LibraryItemKnowledgeTagInputSchema,
  type LibraryItemKnowledgeTagInput,
} from "@/modules/curation/types/library-item.schema";
import {
  CurrentAffairKnowledgeTagInputSchema,
  type CurrentAffairKnowledgeTagInput,
} from "@/modules/curation/types/current-affair.schema";

export async function linkLibraryItemToKnowledge(
  actor: Actor,
  libraryItemId: string,
  input: LibraryItemKnowledgeTagInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = LibraryItemKnowledgeTagInputSchema.parse(input);

  const item = await prisma.libraryItem.findUnique({ where: { id: libraryItemId } });
  if (!item) throw new NotFoundError(`LibraryItem "${libraryItemId}" não encontrado.`);
  if (!(await entityExists(data.entityType, data.entityId))) {
    throw new NotFoundError(`Entidade ${data.entityType}("${data.entityId}") não encontrada.`);
  }

  const tag = await prisma.libraryItemKnowledgeTag.upsert({
    where: {
      libraryItemId_entityType_entityId: {
        libraryItemId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
    create: { libraryItemId, entityType: data.entityType, entityId: data.entityId },
    update: {},
  });
  await recordAudit({
    entityType: AuditableEntityType.LIBRARY_ITEM,
    entityId: libraryItemId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: tag,
  });
  return tag;
}

export async function unlinkLibraryItemFromKnowledge(
  actor: Actor,
  libraryItemId: string,
  input: LibraryItemKnowledgeTagInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = LibraryItemKnowledgeTagInputSchema.parse(input);
  await prisma.libraryItemKnowledgeTag.delete({
    where: {
      libraryItemId_entityType_entityId: {
        libraryItemId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
  });
  await recordAudit({
    entityType: AuditableEntityType.LIBRARY_ITEM,
    entityId: libraryItemId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: input,
  });
}

export async function linkCurrentAffairToKnowledge(
  actor: Actor,
  currentAffairId: string,
  input: CurrentAffairKnowledgeTagInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = CurrentAffairKnowledgeTagInputSchema.parse(input);

  const affair = await prisma.currentAffair.findUnique({ where: { id: currentAffairId } });
  if (!affair) throw new NotFoundError(`CurrentAffair "${currentAffairId}" não encontrada.`);
  if (!(await entityExists(data.entityType, data.entityId))) {
    throw new NotFoundError(`Entidade ${data.entityType}("${data.entityId}") não encontrada.`);
  }

  const tag = await prisma.currentAffairKnowledgeTag.upsert({
    where: {
      currentAffairId_entityType_entityId: {
        currentAffairId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
    create: { currentAffairId, entityType: data.entityType, entityId: data.entityId },
    update: {},
  });
  await recordAudit({
    entityType: AuditableEntityType.CURRENT_AFFAIR,
    entityId: currentAffairId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: tag,
  });
  return tag;
}

export async function unlinkCurrentAffairFromKnowledge(
  actor: Actor,
  currentAffairId: string,
  input: CurrentAffairKnowledgeTagInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = CurrentAffairKnowledgeTagInputSchema.parse(input);
  await prisma.currentAffairKnowledgeTag.delete({
    where: {
      currentAffairId_entityType_entityId: {
        currentAffairId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
  });
  await recordAudit({
    entityType: AuditableEntityType.CURRENT_AFFAIR,
    entityId: currentAffairId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: input,
  });
}

/** Vincula uma `CurrentAffair` a uma `Tag` (Módulo 2) — rótulo transversal livre, além dos nós de conhecimento tipados acima. */
export async function linkCurrentAffairToTag(actor: Actor, currentAffairId: string, tagId: string) {
  assertRole(actor, CURATOR_ROLES);
  const [affair, tag] = await Promise.all([
    prisma.currentAffair.findUnique({ where: { id: currentAffairId } }),
    prisma.tag.findUnique({ where: { id: tagId } }),
  ]);
  if (!affair) throw new NotFoundError(`CurrentAffair "${currentAffairId}" não encontrada.`);
  if (!tag) throw new NotFoundError(`Tag "${tagId}" não encontrada.`);

  const updated = await prisma.currentAffair.update({
    where: { id: currentAffairId },
    data: { tags: { connect: { id: tagId } } },
    include: { tags: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.CURRENT_AFFAIR,
    entityId: currentAffairId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: { linkedTagId: tagId },
  });
  return updated;
}

export async function unlinkCurrentAffairFromTag(
  actor: Actor,
  currentAffairId: string,
  tagId: string,
) {
  assertRole(actor, CURATOR_ROLES);
  const updated = await prisma.currentAffair.update({
    where: { id: currentAffairId },
    data: { tags: { disconnect: { id: tagId } } },
    include: { tags: true },
  });
  await recordAudit({
    entityType: AuditableEntityType.CURRENT_AFFAIR,
    entityId: currentAffairId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedTagId: tagId },
  });
  return updated;
}
