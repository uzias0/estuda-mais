/**
 * Serviço de domínio para `DevelopmentalStage`. Sem `status`/publicação no
 * schema — só CRUD (Módulo 2, seção 6).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { AuditableEntityType } from "@/generated/prisma/enums";
import {
  DevelopmentalStageCreateInputSchema,
  DevelopmentalStageUpdateInputSchema,
  type DevelopmentalStageCreateInput,
  type DevelopmentalStageUpdateInput,
} from "@/modules/knowledge/types/developmental-stage.schema";

export async function createDevelopmentalStage(actor: Actor, input: DevelopmentalStageCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = DevelopmentalStageCreateInputSchema.parse(input);

  const stage = await prisma.developmentalStage.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.DEVELOPMENTAL_STAGE,
    entityId: stage.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: stage,
  });
  return stage;
}

export async function updateDevelopmentalStage(
  actor: Actor,
  id: string,
  input: DevelopmentalStageUpdateInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = DevelopmentalStageUpdateInputSchema.parse(input);

  const existing = await prisma.developmentalStage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`DevelopmentalStage "${id}" não encontrado.`);

  const stage = await prisma.developmentalStage.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.DEVELOPMENTAL_STAGE,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: stage,
  });
  return stage;
}

export async function getDevelopmentalStage(id: string) {
  return prisma.developmentalStage.findUnique({ where: { id }, include: { concepts: true } });
}

export async function listDevelopmentalStages() {
  return prisma.developmentalStage.findMany({ orderBy: { order: "asc" } });
}
