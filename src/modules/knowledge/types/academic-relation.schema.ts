import { z } from "zod";
import { KnowledgeEntityType } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";
import { RELATION_TYPES } from "@/config/relation-types";

/**
 * `KnowledgeEntityType` — conjunto fechado dos TIPOS DE NÓ do grafo de
 * conhecimento. Distinto de `CitationEntityType` (ver
 * src/shared/schemas/citation.schema.ts) — não confundir os dois.
 */
export const KnowledgeEntityTypeSchema = zodEnumFromPrisma(KnowledgeEntityType);

/**
 * `relationType` é validado contra a allow-list de `config/relation-types.ts`,
 * não contra um enum de banco — é assim que ele pode crescer sem migration
 * (docs/RELATORIO_REVISAO_V3.md, seção 5).
 */
export const RelationTypeSchema = z.enum(Object.keys(RELATION_TYPES) as [string, ...string[]]);

/**
 * Entrada para criar uma `AcademicRelation`. Sem FK nativa em
 * `sourceId`/`targetId` — a existência dos nós referenciados é responsabilidade
 * do serviço de resolução (`knowledge/server/services/resolveEntity.ts`),
 * chamado pela camada de curadoria antes da escrita, não por este schema.
 */
export const AcademicRelationCreateInputSchema = z
  .object({
    sourceType: KnowledgeEntityTypeSchema,
    sourceId: z.string().min(1),
    relationType: RelationTypeSchema,
    targetType: KnowledgeEntityTypeSchema,
    targetId: z.string().min(1),
    description: z.string().max(2000).optional(),
    citationId: z.string().min(1).optional(),
  })
  .refine((v) => !(v.sourceType === v.targetType && v.sourceId === v.targetId), {
    message: "Uma AcademicRelation não pode apontar uma entidade para ela mesma.",
    path: ["targetId"],
  });
export type AcademicRelationCreateInput = z.infer<typeof AcademicRelationCreateInputSchema>;

/**
 * Entrada para atualizar uma `AcademicRelation` — só `description`/`citationId`.
 * `sourceType`/`sourceId`/`relationType`/`targetType`/`targetId` definem a
 * própria identidade da aresta (há inclusive `@@unique` sobre esses 5 campos);
 * mudá-los é, na prática, criar outra relação, não editar esta.
 */
export const AcademicRelationUpdateInputSchema = z.object({
  description: z.string().max(2000).optional(),
  citationId: z.string().min(1).nullable().optional(),
});
export type AcademicRelationUpdateInput = z.infer<typeof AcademicRelationUpdateInputSchema>;
