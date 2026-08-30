import { z } from "zod";
import { StudyModeSchema } from "@/shared/schemas/user.schema";

/** Entrada para criar uma `Track` — trilha curatorial de topo do Núcleo Pedagógico. */
export const TrackCreateInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case"),
  name: z.string().min(1).max(200),
  mode: StudyModeSchema,
});
export type TrackCreateInput = z.infer<typeof TrackCreateInputSchema>;

export const TrackUpdateInputSchema = TrackCreateInputSchema.omit({ slug: true }).partial();
export type TrackUpdateInput = z.infer<typeof TrackUpdateInputSchema>;

/**
 * Vincular uma `LearningArea` a uma `Track` (`TrackArea`). `order` é
 * opcional na entrada — quando omitido, o serviço acrescenta ao final da
 * lista atual (não reordena implicitamente; reordenação é um ato explícito
 * separado, ver `reorderTrackAreas`).
 */
export const TrackAreaLinkInputSchema = z.object({
  areaId: z.string().min(1),
  order: z.number().int().nonnegative().optional(),
});
export type TrackAreaLinkInput = z.infer<typeof TrackAreaLinkInputSchema>;
