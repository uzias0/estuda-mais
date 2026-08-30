import { z } from "zod";

/**
 * Entrada para criar uma `LearningArea` — "prateleira" curatorial do Núcleo
 * Pedagógico (docs/ARQUITETURA.md, seção 5). Não é taxonomia acadêmica: o
 * nome é livre, definido por quem cura a trilha, não pela Base de
 * Conhecimento.
 */
export const LearningAreaCreateInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case"),
  name: z.string().min(1).max(200),
});
export type LearningAreaCreateInput = z.infer<typeof LearningAreaCreateInputSchema>;

export const LearningAreaUpdateInputSchema = LearningAreaCreateInputSchema.omit({
  slug: true,
}).partial();
export type LearningAreaUpdateInput = z.infer<typeof LearningAreaUpdateInputSchema>;

/** Vincular uma `Unit` a uma `LearningArea` (`AreaUnit`) — mesma convenção de `order` opcional de `TrackAreaLinkInputSchema`. */
export const AreaUnitLinkInputSchema = z.object({
  unitId: z.string().min(1),
  order: z.number().int().nonnegative().optional(),
});
export type AreaUnitLinkInput = z.infer<typeof AreaUnitLinkInputSchema>;
