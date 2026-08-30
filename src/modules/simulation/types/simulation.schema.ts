import { z } from "zod";
import { DifficultySchema } from "@/modules/knowledge/types/concept.schema";
import { QuestionTypeSchema } from "@/modules/assessment/types/question.schema";
import { AttemptAnswerDataSchema } from "@/modules/assessment/types/question-attempt.schema";
import { MIN_QUESTIONS_PER_SIMULATION, MAX_QUESTIONS_PER_SIMULATION } from "@/config/simulation";

const CountSchema = z
  .number()
  .int()
  .min(MIN_QUESTIONS_PER_SIMULATION)
  .max(MAX_QUESTIONS_PER_SIMULATION);

/**
 * Filtros de um simulado PERSONALIZADO (Módulo 6, seção 6.1). Os três
 * booleanos de "já respondida" (seção 9) são independentes e determinísticos
 * — nenhum deles usa aleatoriedade, todos derivam de `QuestionAttempt` real
 * na camada de serviço (`simulation-builder.service.ts`), nunca aqui.
 */
export const SimulationFiltersSchema = z.object({
  count: CountSchema,
  disciplineId: z.string().min(1).optional(),
  conceptId: z.string().min(1).optional(),
  difficulty: DifficultySchema.optional(),
  questionType: QuestionTypeSchema.optional(),
  examId: z.string().min(1).optional(),
  examEditionId: z.string().min(1).optional(),
  examBoardId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  positionId: z.string().min(1).optional(),
  year: z.number().int().min(1900).optional(),
  yearFrom: z.number().int().min(1900).optional(),
  yearTo: z.number().int().min(1900).optional(),
  tagIds: z.array(z.string().min(1)).max(20).optional(),
  trackId: z.string().min(1).optional(),
  areaId: z.string().min(1).optional(),
  unitId: z.string().min(1).optional(),
  stageId: z.string().min(1).optional(),
  lessonId: z.string().min(1).optional(),
  /** `false` exclui QUALQUER questão já respondida antes pelo aluno (qualquer contexto). Default `true`. */
  includePreviouslyAnswered: z.boolean().default(true),
  /** `true` exclui questões que o aluno já acertou antes (mesmo com `includePreviouslyAnswered=true`). */
  excludePreviouslyCorrect: z.boolean().default(false),
  /** `false` exclui questões que o aluno já errou antes. Default `true` (reforça pontos fracos). */
  includePreviouslyWrong: z.boolean().default(true),
  seed: z.number().int().optional(),
});
export type SimulationFilters = z.input<typeof SimulationFiltersSchema>;

/**
 * `buildSimulation` aceita 3 modos (seção 6.2/6.3/6.5 — personalizado, por
 * prova, de revisão), discriminados por `kind`. Nenhum campo de resultado
 * (`isCorrect`, gabarito, score) existe em nenhum ramo — a entrada só
 * descreve COMO montar, nunca o resultado.
 */
export const BuildSimulationInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("PERSONALIZED"),
    title: z.string().min(1).max(200),
    filters: SimulationFiltersSchema,
  }),
  z.object({
    kind: z.literal("EXAM_EDITION"),
    title: z.string().min(1).max(200),
    examEditionId: z.string().min(1),
    count: CountSchema.optional(),
    seed: z.number().int().optional(),
  }),
  z.object({
    kind: z.literal("REVIEW"),
    title: z.string().min(1).max(200),
    count: CountSchema,
    seed: z.number().int().optional(),
  }),
]);
export type BuildSimulationInput = z.input<typeof BuildSimulationInputSchema>;

/**
 * Entrada para responder um item do simulado. `isCorrect`/`score`/
 * `percentage`/`userId` nunca aparecem aqui — são sempre derivados pelo
 * servidor (Módulo 6, seção 30).
 */
export const SubmitSimulationAnswerInputSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  answerData: AttemptAnswerDataSchema,
  timeSpentMs: z.number().int().nonnegative(),
});
export type SubmitSimulationAnswerInput = z.infer<typeof SubmitSimulationAnswerInputSchema>;
