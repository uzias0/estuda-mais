import { z } from "zod";
import { Difficulty } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";

export const DifficultySchema = zodEnumFromPrisma(Difficulty);

/** Entrada para criar um `Concept` — entidade central da Base de Conhecimento. */
export const ConceptCreateInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case"),
  name: z.string().min(1).max(200),
  definition: z.string().min(1).max(4000),
  didacticExplanation: z.string().max(4000).optional(),
  difficulty: DifficultySchema.optional(),
  developmentalStageId: z.string().min(1).optional(),
});
export type ConceptCreateInput = z.infer<typeof ConceptCreateInputSchema>;

export const ConceptUpdateInputSchema = ConceptCreateInputSchema.omit({ slug: true }).partial();
export type ConceptUpdateInput = z.infer<typeof ConceptUpdateInputSchema>;
