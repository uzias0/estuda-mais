import { z } from "zod";

/** Entrada para criar uma `School` (escola/corrente teórica) — ver docs/ARQUITETURA.md, seção 3. */
export const SchoolCreateInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case (ex.: psicanalise)"),
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
});
export type SchoolCreateInput = z.infer<typeof SchoolCreateInputSchema>;

export const SchoolUpdateInputSchema = SchoolCreateInputSchema.omit({ slug: true }).partial();
export type SchoolUpdateInput = z.infer<typeof SchoolUpdateInputSchema>;
