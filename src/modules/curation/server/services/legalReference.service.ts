/**
 * Serviço de domínio para `LegalReference` — extensão 1:1 de `Source` para
 * legislação/normas técnicas (Módulo 2, seção 21). Não vira um módulo
 * separado de legislação — só as operações que o modelo já suporta:
 * criação, atualização de vigência, e substituição (supersededById).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "./auditLog";
import { AuditableEntityType } from "@/generated/prisma/enums";
import {
  LegalReferenceCreateInputSchema,
  LegalReferenceUpdateInputSchema,
  type LegalReferenceCreateInput,
  type LegalReferenceUpdateInput,
} from "@/shared/schemas/source.schema";
import { NotFoundError } from "./publicationPolicy";

export async function createLegalReference(actor: Actor, input: LegalReferenceCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = LegalReferenceCreateInputSchema.parse(input);

  const source = await prisma.source.findUnique({ where: { id: data.sourceId } });
  if (!source) throw new NotFoundError(`Source "${data.sourceId}" não encontrada.`);

  if (data.supersededById) {
    const supersedes = await prisma.legalReference.findUnique({
      where: { sourceId: data.supersededById },
    });
    if (!supersedes) {
      throw new NotFoundError(
        `LegalReference "${data.supersededById}" (supersededById) não encontrada.`,
      );
    }
  }

  const legalReference = await prisma.legalReference.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.LEGAL_REFERENCE,
    entityId: legalReference.sourceId,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: legalReference,
  });
  return legalReference;
}

export async function updateLegalReference(
  actor: Actor,
  sourceId: string,
  input: LegalReferenceUpdateInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = LegalReferenceUpdateInputSchema.parse(input);

  const existing = await prisma.legalReference.findUnique({ where: { sourceId } });
  if (!existing) throw new NotFoundError(`LegalReference "${sourceId}" não encontrada.`);

  const legalReference = await prisma.legalReference.update({ where: { sourceId }, data });
  await recordAudit({
    entityType: AuditableEntityType.LEGAL_REFERENCE,
    entityId: sourceId,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: legalReference,
  });
  return legalReference;
}

export async function getLegalReference(sourceId: string) {
  return prisma.legalReference.findUnique({ where: { sourceId }, include: { source: true } });
}
