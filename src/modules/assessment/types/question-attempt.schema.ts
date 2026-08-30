import { z } from "zod";
import { AttemptContext } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";
import { MatchingPairSchema } from "./question.schema";

export const AttemptContextSchema = zodEnumFromPrisma(AttemptContext);

/**
 * Resposta enviada pelo cliente — só o que a pessoa efetivamente escolheu.
 * Nunca inclui `isCorrect`: quem decide isso é sempre o servidor
 * (`answerGrading.ts`), lendo a `Question` armazenada (Módulo 3, seção 17/31).
 */
export const AttemptAnswerDataSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MULTIPLE_CHOICE"), selectedOptionId: z.string().min(1) }),
  z.object({ type: z.literal("TRUE_FALSE"), selectedOptionId: z.string().min(1) }),
  z.object({
    type: z.literal("MULTI_SELECT"),
    selectedOptionIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({ type: z.literal("ORDERING"), orderedOptionIds: z.array(z.string().min(1)).min(2) }),
  z.object({ type: z.literal("MATCHING"), pairs: z.array(MatchingPairSchema).min(1) }),
  z.object({ type: z.literal("FILL_BLANK"), answers: z.array(z.string()).min(1) }),
  z.object({ type: z.literal("SHORT_ANSWER"), text: z.string().min(1) }),
  z.object({
    type: z.literal("CASE_STUDY"),
    selectedOptionId: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
  }),
]);
export type AttemptAnswerData = z.infer<typeof AttemptAnswerDataSchema>;

/**
 * Entrada para registrar uma tentativa. `userId` nunca vem do payload do
 * cliente — vem do `Actor` autenticado (ver `questionAttempt.service.ts`).
 * `isCorrect` não existe aqui de propósito: é campo de SAÍDA, calculado pelo
 * servidor, nunca de entrada.
 */
export const QuestionAttemptCreateInputSchema = z.object({
  questionId: z.string().min(1),
  answerData: AttemptAnswerDataSchema,
  timeSpentMs: z.number().int().nonnegative(),
  context: AttemptContextSchema,
  sessionId: z.string().min(1).optional(),
  simAttemptId: z.string().min(1).optional(),
});
export type QuestionAttemptCreateInput = z.input<typeof QuestionAttemptCreateInputSchema>;
