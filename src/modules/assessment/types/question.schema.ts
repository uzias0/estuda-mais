import { z } from "zod";
import { QuestionType } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";
import { DifficultySchema } from "@/modules/knowledge/types/concept.schema";
import { KnowledgeEntityTypeSchema } from "@/modules/knowledge/types/academic-relation.schema";

export const QuestionTypeSchema = zodEnumFromPrisma(QuestionType);

/** Uma alternativa — usada por MULTIPLE_CHOICE/TRUE_FALSE/MULTI_SELECT/ORDERING/CASE_STUDY. */
export const QuestionOptionInputSchema = z.object({
  text: z.string().min(1).max(2000),
  isCorrect: z.boolean().default(false),
  order: z.number().int().nonnegative(),
});
export type QuestionOptionInput = z.input<typeof QuestionOptionInputSchema>;

export const MatchingPairSchema = z.object({
  left: z.string().min(1).max(500),
  right: z.string().min(1).max(500),
});

/**
 * Resposta canônica para os tipos que `QuestionOption` não comporta
 * corretamente (Módulo 3, seção 6) — ver comentário em `Question.answerKey`
 * no schema.prisma para a justificativa completa da decisão de usar JSON
 * aqui (mesmo padrão já usado por `QuestionAttempt.answerData` etc.).
 * `kind` torna o formato autodescritivo ao ser lido de volta do banco.
 */
export const AnswerKeySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("MATCHING"), pairs: z.array(MatchingPairSchema).min(2) }),
  z.object({
    kind: z.literal("FILL_BLANK"),
    blanks: z.array(z.object({ accepted: z.array(z.string().min(1)).min(1) })).min(1),
  }),
  z.object({ kind: z.literal("SHORT_ANSWER"), accepted: z.array(z.string().min(1)).min(1) }),
]);
export type AnswerKey = z.infer<typeof AnswerKeySchema>;

/**
 * Entrada para criar uma `Question`. `sourceId` é sempre obrigatório (Módulo
 * 3, seção 9 — procedência da questão nunca é opcional, diferente de
 * `AcademicWork.sourceId`). `subject`/`subtopic` continuam bootstrap
 * transitório (Módulo 1) — a fonte de verdade é `QuestionKnowledgeTag`.
 * A validação estrutural por `type` (options/answerKey exigidos conforme o
 * tipo) é feita em `question.service.ts`, não aqui — envolve regra de
 * domínio cruzando campos, não só formato.
 */
export const QuestionCreateInputSchema = z.object({
  prompt: z.string().min(1).max(4000),
  type: QuestionTypeSchema,
  explanation: z.string().max(4000).optional(),
  difficulty: DifficultySchema,
  subject: z.string().max(200).optional(),
  subtopic: z.string().max(200).optional(),
  examEditionId: z.string().min(1).optional(),
  sourceId: z.string().min(1),
  reproductionAllowed: z.boolean().default(true),
  options: z.array(QuestionOptionInputSchema).optional(),
  answerKey: AnswerKeySchema.optional(),
});
export type QuestionCreateInput = z.input<typeof QuestionCreateInputSchema>;

/**
 * Entrada para atualizar uma `Question`. `type` não é atualizável — trocar o
 * tipo de uma questão muda inteiramente sua forma de correção; na prática é
 * outra questão, não uma edição. `reviewStatus` fica de fora (só via
 * publish/archive).
 */
export const QuestionUpdateInputSchema = QuestionCreateInputSchema.omit({ type: true }).partial();
export type QuestionUpdateInput = z.input<typeof QuestionUpdateInputSchema>;

/** Associação de uma Question a um nó de conhecimento (`QuestionKnowledgeTag`). */
export const QuestionKnowledgeTagInputSchema = z.object({
  entityType: KnowledgeEntityTypeSchema,
  entityId: z.string().min(1),
});
export type QuestionKnowledgeTagInput = z.infer<typeof QuestionKnowledgeTagInputSchema>;
