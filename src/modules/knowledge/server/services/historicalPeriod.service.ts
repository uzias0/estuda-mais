/**
 * Serviço de domínio para `HistoricalPeriod`. Sem `status`/publicação no
 * schema (é taxonomia de referência, não conteúdo curado com procedência
 * própria) — só CRUD + consulta por período/pessoas/teorias (Módulo 2, seção 19).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { AuditableEntityType } from "@/generated/prisma/enums";
import {
  HistoricalPeriodCreateInputSchema,
  HistoricalPeriodUpdateInputSchema,
  type HistoricalPeriodCreateInput,
  type HistoricalPeriodUpdateInput,
} from "@/modules/knowledge/types/historical-period.schema";

export async function createHistoricalPeriod(actor: Actor, input: HistoricalPeriodCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = HistoricalPeriodCreateInputSchema.parse(input);

  const period = await prisma.historicalPeriod.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.PERIOD,
    entityId: period.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: period,
  });
  return period;
}

export async function updateHistoricalPeriod(
  actor: Actor,
  id: string,
  input: HistoricalPeriodUpdateInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = HistoricalPeriodUpdateInputSchema.parse(input);

  const existing = await prisma.historicalPeriod.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`HistoricalPeriod "${id}" não encontrado.`);

  const period = await prisma.historicalPeriod.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.PERIOD,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: period,
  });
  return period;
}

export async function getHistoricalPeriod(id: string) {
  return prisma.historicalPeriod.findUnique({
    where: { id },
    include: { people: true, theories: true },
  });
}

/** Consulta por nome, faixa de ano — Módulo 2, seção 19 ("suportar consulta por..."). */
export async function listHistoricalPeriods(params?: {
  nameContains?: string;
  yearWithinRange?: number;
  take?: number;
  skip?: number;
}) {
  return prisma.historicalPeriod.findMany({
    where: {
      name: params?.nameContains
        ? { contains: params.nameContains, mode: "insensitive" }
        : undefined,
      AND: params?.yearWithinRange
        ? [
            { OR: [{ startYear: null }, { startYear: { lte: params.yearWithinRange } }] },
            { OR: [{ endYear: null }, { endYear: { gte: params.yearWithinRange } }] },
          ]
        : undefined,
    },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { startYear: "asc" },
  });
}
