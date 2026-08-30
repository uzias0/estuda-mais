import { z } from "zod";
import { AttemptAnswerDataSchema } from "@/modules/assessment/types/question-attempt.schema";
import { ReviewScopeSchema } from "./review-item.schema";

/**
 * Entrada para `ensureReviewItem` — cria (ou devolve, se já existir) o item
 * revisável do próprio `actor`. `userId`/`dueAt`/`intervalDays`/`easeFactor`/
 * `repetitions`/`state` nunca vêm do cliente (Módulo 5, seção 20) — todos são
 * decididos pelo servidor no momento da criação.
 */
export const EnsureReviewItemInputSchema = z
  .object({
    scope: ReviewScopeSchema,
    questionId: z.string().min(1).optional(),
    conceptId: z.string().min(1).optional(),
  })
  .refine(
    (v) =>
      (v.scope === "QUESTION" && !!v.questionId && !v.conceptId) ||
      (v.scope === "CONCEPT" && !!v.conceptId && !v.questionId),
    {
      message:
        'scope="QUESTION" exige questionId (e nenhum conceptId); ' +
        'scope="CONCEPT" exige conceptId (e nenhum questionId).',
      path: ["scope"],
    },
  );
export type EnsureReviewItemInput = z.infer<typeof EnsureReviewItemInputSchema>;

/**
 * Entrada para `submitReviewAnswer`. `questionId` é aceito do cliente (para
 * identificar QUAL questão, entre as elegíveis para este `reviewItemId`, ele
 * está respondendo — necessário quando `scope=CONCEPT`, já que um conceito
 * pode ter várias questões tagueadas) mas é sempre VALIDADO contra o item
 * antes de aceitar (`reviewSession.service.ts`) — nunca confiado às cegas.
 * `isCorrect`/`nextReviewAt`/`priority`/`state`/`userId` nunca aparecem aqui:
 * são todos derivados pelo servidor (seção 20).
 */
export const SubmitReviewAnswerInputSchema = z.object({
  sessionId: z.string().min(1),
  reviewItemId: z.string().min(1),
  questionId: z.string().min(1),
  answerData: AttemptAnswerDataSchema,
  timeSpentMs: z.number().int().nonnegative(),
});
export type SubmitReviewAnswerInput = z.infer<typeof SubmitReviewAnswerInputSchema>;
