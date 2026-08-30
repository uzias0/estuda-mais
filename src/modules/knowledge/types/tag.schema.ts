import { z } from "zod";

/** Entrada para criar uma `Tag` — rótulo transversal reutilizável (ex.: "Mulheres, Gênero e História do Pensamento"). */
export const TagCreateInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case"),
  name: z.string().min(1).max(200),
});
export type TagCreateInput = z.infer<typeof TagCreateInputSchema>;

export const TagUpdateInputSchema = TagCreateInputSchema.omit({ slug: true }).partial();
export type TagUpdateInput = z.infer<typeof TagUpdateInputSchema>;
