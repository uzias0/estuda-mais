import { z } from "zod";

/** Entrada para criar uma `Theory`. `originPeriodId` é opcional e validado por existência no serviço. */
export const TheoryCreateInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case"),
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  originPeriodId: z.string().min(1).optional(),
});
export type TheoryCreateInput = z.infer<typeof TheoryCreateInputSchema>;

export const TheoryUpdateInputSchema = TheoryCreateInputSchema.omit({ slug: true }).partial();
export type TheoryUpdateInput = z.infer<typeof TheoryUpdateInputSchema>;
