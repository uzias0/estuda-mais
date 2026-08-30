import { z } from "zod";
import { BlockType } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";

export const BlockTypeSchema = zodEnumFromPrisma(BlockType);

/**
 * Entrada para criar um `LessonBlock`. A validação de que `content` OU
 * `questionId` é exigido conforme `type` (ex.: QUESTION exige `questionId`
 * e não `content`) é regra de domínio cruzando campos — vive em
 * `lesson-block.service.ts` (`assertLessonBlockShapeValid`), não aqui,
 * mesmo padrão de `assertQuestionShapeValid` no Módulo 3.
 */
export const LessonBlockCreateInputSchema = z.object({
  order: z.number().int().nonnegative(),
  type: BlockTypeSchema,
  content: z.string().max(20000).optional(),
  questionId: z.string().min(1).optional(),
});
export type LessonBlockCreateInput = z.infer<typeof LessonBlockCreateInputSchema>;

/**
 * `order` fica de fora do update — trocar a posição de um bloco é um ato de
 * reordenação explícito (`reorderLessonBlocks`), nunca um patch solto que
 * poderia colidir com o `@@unique([lessonId, order])` do schema.
 */
export const LessonBlockUpdateInputSchema = LessonBlockCreateInputSchema.omit({
  order: true,
}).partial();
export type LessonBlockUpdateInput = z.infer<typeof LessonBlockUpdateInputSchema>;
