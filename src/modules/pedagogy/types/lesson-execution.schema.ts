import { z } from "zod";
import { AttemptAnswerDataSchema } from "@/modules/assessment/types/question-attempt.schema";

/**
 * Entrada para responder/consumir um bloco de lição (Módulo 8, seção 49).
 * `answerData`/`timeSpentMs` só fazem sentido para blocos QUESTION — a
 * exigência cruzada (obrigatórios quando o bloco é QUESTION, ignorados nos
 * demais) é validada em `lesson-execution.service.ts`, mesmo padrão de
 * `assertLessonBlockShapeValid` (Módulo 4) e `assertQuestionShapeValid`
 * (Módulo 3): regra que cruza campos não cabe no Zod isolado. Deliberadamente
 * SEM `isCorrect`/`score`/`completed`/`mastered` — são sempre calculados pelo
 * servidor (seção 11/39).
 */
export const SubmitLessonActivityInputSchema = z.object({
  lessonId: z.string().min(1),
  blockId: z.string().min(1),
  answerData: AttemptAnswerDataSchema.optional(),
  timeSpentMs: z.number().int().nonnegative().optional(),
});
export type SubmitLessonActivityInput = z.input<typeof SubmitLessonActivityInputSchema>;
