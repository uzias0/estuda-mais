/**
 * Serviço de domínio para `Source` — procedência bibliográfica/documental
 * (docs/RELATORIO_REVISAO_V3.md, seção 6). `Source` não tem regra de
 * publicação gated por Citation (ela É o fundamento de outras publicações,
 * não o contrário) — CRUD simples, protegido por papel de curadoria.
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "./auditLog";
import { AuditableEntityType, SourceType } from "@/generated/prisma/enums";

type SourceTypeValue = (typeof SourceType)[keyof typeof SourceType];
import {
  SourceCreateInputSchema,
  SourceUpdateInputSchema,
  type SourceCreateInput,
  type SourceUpdateInput,
} from "@/shared/schemas/source.schema";
import { NotFoundError } from "./publicationPolicy";

export async function createSource(actor: Actor, input: SourceCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = SourceCreateInputSchema.parse(input);

  const source = await prisma.source.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.SOURCE,
    entityId: source.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: source,
  });
  return source;
}

export async function updateSource(actor: Actor, id: string, input: SourceUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = SourceUpdateInputSchema.parse(input);

  const existing = await prisma.source.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Source "${id}" não encontrada.`);

  const source = await prisma.source.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.SOURCE,
    entityId: source.id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: source,
  });
  return source;
}

export async function getSource(id: string) {
  return prisma.source.findUnique({ where: { id } });
}

export async function listSources(params?: {
  sourceType?: SourceTypeValue;
  take?: number;
  skip?: number;
}) {
  return prisma.source.findMany({
    where: params?.sourceType ? { sourceType: params.sourceType } : undefined,
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { createdAt: "desc" },
  });
}
