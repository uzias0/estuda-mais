import { z } from "zod";
import { CurrentAffairRelevance } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";
import { KnowledgeEntityTypeSchema } from "@/modules/knowledge/types/academic-relation.schema";

export const CurrentAffairRelevanceSchema = zodEnumFromPrisma(CurrentAffairRelevance);

/**
 * Entrada para criar uma `CurrentAffair` (Módulo 7, seção 8/13). `eventDate`
 * é a data do ACONTECIMENTO real — nunca confundida com `createdAt`/
 * `updatedAt`. `sourceId` é sempre obrigatório (a "URL oficial" pedida na
 * seção 8 vive em `Source.url`, reaproveitado — não duplicado aqui).
 */
export const CurrentAffairCreateInputSchema = z.object({
  title: z.string().min(1).max(300),
  summary: z.string().min(1).max(2000),
  educationalContent: z.string().max(8000).optional(),
  eventDate: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
  relevance: CurrentAffairRelevanceSchema.default("MODERATE"),
  sourceId: z.string().min(1),
});
export type CurrentAffairCreateInput = z.input<typeof CurrentAffairCreateInputSchema>;

export const CurrentAffairUpdateInputSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  summary: z.string().min(1).max(2000).optional(),
  educationalContent: z.string().max(8000).optional(),
  eventDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  relevance: CurrentAffairRelevanceSchema.optional(),
  sourceId: z.string().min(1).optional(),
});
export type CurrentAffairUpdateInput = z.input<typeof CurrentAffairUpdateInputSchema>;

/** Associação de uma `CurrentAffair` a um nó de conhecimento — mesmo mecanismo de `LessonKnowledgeTag`/`QuestionKnowledgeTag`. */
export const CurrentAffairKnowledgeTagInputSchema = z.object({
  entityType: KnowledgeEntityTypeSchema,
  entityId: z.string().min(1),
});
export type CurrentAffairKnowledgeTagInput = z.infer<typeof CurrentAffairKnowledgeTagInputSchema>;

/**
 * Filtro de "conteúdo recente" (Módulo 7, seção 14) — janela pré-definida ou
 * intervalo customizado. `window="CUSTOM"` exige `from`/`to` válidos.
 */
export const RecentWindowSchema = z.enum(["LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS", "CUSTOM"]);
export type RecentWindow = z.infer<typeof RecentWindowSchema>;

export const DateRangeFilterSchema = z
  .object({
    window: RecentWindowSchema.default("LAST_30_DAYS"),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((v) => v.window !== "CUSTOM" || (!!v.from && !!v.to && v.from <= v.to), {
    message: 'window="CUSTOM" exige from/to válidos, com from <= to.',
    path: ["window"],
  });
export type DateRangeFilter = z.input<typeof DateRangeFilterSchema>;
