import { z } from "zod";

/** Entrada para criar uma `Discipline` — campo `status` fica de fora (só via publish/archive). */
export const DisciplineCreateInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case (ex.: filosofia-antiga)"),
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
});
export type DisciplineCreateInput = z.infer<typeof DisciplineCreateInputSchema>;

export const DisciplineUpdateInputSchema = DisciplineCreateInputSchema.omit({
  slug: true,
}).partial();
export type DisciplineUpdateInput = z.infer<typeof DisciplineUpdateInputSchema>;
