import { z } from "zod";
import { StageType } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";

export const StageTypeSchema = zodEnumFromPrisma(StageType);

export const StageCreateInputSchema = z.object({
  name: z.string().min(1).max(200),
  type: StageTypeSchema.default(StageType.LESSON),
  xpReward: z.number().int().nonnegative().default(10),
});
// z.input, não z.infer: `type`/`xpReward` têm `.default(...)` (mesma convenção
// já usada nos Módulos 2/3 — ver user.schema.ts/question.schema.ts).
export type StageCreateInput = z.input<typeof StageCreateInputSchema>;

export const StageUpdateInputSchema = StageCreateInputSchema.partial();
export type StageUpdateInput = z.input<typeof StageUpdateInputSchema>;

/** Vincular uma `Lesson` a uma `Stage` (`StageLesson`) — join que permite reuso de Lesson entre Stages. */
export const StageLessonLinkInputSchema = z.object({
  lessonId: z.string().min(1),
  order: z.number().int().nonnegative().optional(),
});
export type StageLessonLinkInput = z.infer<typeof StageLessonLinkInputSchema>;
