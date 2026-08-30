import { z } from "zod";

/** Entrada para criar um `DevelopmentalStage` (ex.: "Primeira infância", "Adolescência"). */
export const DevelopmentalStageCreateInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case"),
  name: z.string().min(1).max(200),
  order: z.number().int().nonnegative(),
});
export type DevelopmentalStageCreateInput = z.infer<typeof DevelopmentalStageCreateInputSchema>;

export const DevelopmentalStageUpdateInputSchema = DevelopmentalStageCreateInputSchema.omit({
  slug: true,
}).partial();
export type DevelopmentalStageUpdateInput = z.infer<typeof DevelopmentalStageUpdateInputSchema>;
