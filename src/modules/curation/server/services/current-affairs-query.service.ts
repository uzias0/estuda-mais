/**
 * Consultas de leitura de atualidades (Módulo 7, seção 12/14/31) —
 * determinísticas, sem IA. `getRecentCurrentAffairs` é a resposta a "quais
 * acontecimentos recentes existem" (seção 14), sempre por `eventDate` (o
 * acontecimento real), nunca `createdAt`.
 */
import { prisma } from "@/server/db";
import { KnowledgeEntityType, PublicationStatus } from "@/generated/prisma/enums";
import { resolveWindowRange } from "./recentWindow";
import {
  DateRangeFilterSchema,
  type DateRangeFilter,
} from "@/modules/curation/types/current-affair.schema";

type KnowledgeEntityTypeValue = (typeof KnowledgeEntityType)[keyof typeof KnowledgeEntityType];

export interface CurrentAffairQueryParams {
  publishedOnly?: boolean;
  take?: number;
  skip?: number;
}

function statusFilter(params?: CurrentAffairQueryParams) {
  return params?.publishedOnly === false ? undefined : PublicationStatus.PUBLISHED;
}

/** Busca textual determinística (título/resumo) — nenhum ranqueamento por IA. */
export async function searchCurrentAffairs(query: string, params?: CurrentAffairQueryParams) {
  return prisma.currentAffair.findMany({
    where: {
      status: statusFilter(params),
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
      ],
    },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { eventDate: "desc" },
  });
}

const KNOWLEDGE_FILTER_KEYS = ["conceptId", "disciplineId", "theoryId", "schoolId"] as const;
const KNOWLEDGE_ENTITY_TYPE_BY_FILTER_KEY: Record<
  (typeof KNOWLEDGE_FILTER_KEYS)[number],
  KnowledgeEntityTypeValue
> = {
  conceptId: KnowledgeEntityType.CONCEPT,
  disciplineId: KnowledgeEntityType.DISCIPLINE,
  theoryId: KnowledgeEntityType.THEORY,
  schoolId: KnowledgeEntityType.SCHOOL,
};

export interface RecentCurrentAffairsFilters extends DateRangeFilter, CurrentAffairQueryParams {
  conceptId?: string;
  disciplineId?: string;
  theoryId?: string;
  schoolId?: string;
  tagIds?: string[];
}

/**
 * "Quais acontecimentos recentes estão relacionados a X?" (seção 12/14) —
 * janela pré-definida (7/30/90 dias) ou intervalo customizado, mais os
 * filtros acadêmicos/tags de sempre. Determinística.
 */
export async function getRecentCurrentAffairs(filters: RecentCurrentAffairsFilters = {}) {
  const { window, from, to } = DateRangeFilterSchema.parse(filters);
  const range = resolveWindowRange(window, from, to);

  const knowledgeFilters = KNOWLEDGE_FILTER_KEYS.filter((key) => filters[key]).map((key) => ({
    entityType: KNOWLEDGE_ENTITY_TYPE_BY_FILTER_KEY[key],
    entityId: filters[key] as string,
  }));

  return prisma.currentAffair.findMany({
    where: {
      eventDate: { gte: range.from, lte: range.to },
      status: statusFilter(filters),
      knowledgeTags: knowledgeFilters.length ? { some: { OR: knowledgeFilters } } : undefined,
      tags: filters.tagIds?.length ? { some: { id: { in: filters.tagIds } } } : undefined,
    },
    take: filters.take ?? 50,
    skip: filters.skip ?? 0,
    orderBy: { eventDate: "desc" },
  });
}

async function getCurrentAffairsByKnowledgeEntity(
  entityType: KnowledgeEntityTypeValue,
  entityId: string,
  params?: CurrentAffairQueryParams,
) {
  return prisma.currentAffair.findMany({
    where: {
      knowledgeTags: { some: { entityType, entityId } },
      status: statusFilter(params),
    },
    include: { knowledgeTags: true },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { eventDate: "desc" },
  });
}

export function getCurrentAffairsByConcept(conceptId: string, params?: CurrentAffairQueryParams) {
  return getCurrentAffairsByKnowledgeEntity(KnowledgeEntityType.CONCEPT, conceptId, params);
}
export function getCurrentAffairsByDiscipline(
  disciplineId: string,
  params?: CurrentAffairQueryParams,
) {
  return getCurrentAffairsByKnowledgeEntity(KnowledgeEntityType.DISCIPLINE, disciplineId, params);
}
