import { z } from "zod";

/**
 * Entrada para criar uma `Unit`. `primaryDisciplineId`/`primarySchoolId` são
 * âncoras acadêmicas OPCIONAIS (docs/ARQUITETURA.md, seção 5 — "âncora
 * acadêmica opcional") — a Unit não é dona desse conhecimento, só aponta
 * para ele quando fizer sentido curatorial; existência validada no serviço.
 */
export const UnitCreateInputSchema = z.object({
  name: z.string().min(1).max(200),
  primaryDisciplineId: z.string().min(1).optional(),
  primarySchoolId: z.string().min(1).optional(),
});
export type UnitCreateInput = z.infer<typeof UnitCreateInputSchema>;

export const UnitUpdateInputSchema = UnitCreateInputSchema.partial();
export type UnitUpdateInput = z.infer<typeof UnitUpdateInputSchema>;

/** Vincular uma `Stage` a uma `Unit` (`UnitStage`). */
export const UnitStageLinkInputSchema = z.object({
  stageId: z.string().min(1),
  order: z.number().int().nonnegative().optional(),
});
export type UnitStageLinkInput = z.infer<typeof UnitStageLinkInputSchema>;
