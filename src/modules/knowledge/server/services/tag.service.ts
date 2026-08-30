/**
 * Serviço de domínio para `Tag` — rótulo transversal (Módulo 2, seção 20).
 * Sem `status`/publicação no schema — só CRUD. Associações a `Concept` e
 * `AcademicPerson` já vivem em `concept.service.ts`/`academicPerson.service.ts`
 * (`linkConceptToTag`/`linkPersonToTag`) — não duplicadas aqui.
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { AuditableEntityType } from "@/generated/prisma/enums";
import {
  TagCreateInputSchema,
  TagUpdateInputSchema,
  type TagCreateInput,
  type TagUpdateInput,
} from "@/modules/knowledge/types/tag.schema";

export async function createTag(actor: Actor, input: TagCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = TagCreateInputSchema.parse(input);

  const tag = await prisma.tag.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.TAG,
    entityId: tag.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: tag,
  });
  return tag;
}

export async function updateTag(actor: Actor, id: string, input: TagUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = TagUpdateInputSchema.parse(input);

  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Tag "${id}" não encontrada.`);

  const tag = await prisma.tag.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.TAG,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: tag,
  });
  return tag;
}

export async function getTag(id: string) {
  return prisma.tag.findUnique({ where: { id }, include: { concepts: true, people: true } });
}

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}
