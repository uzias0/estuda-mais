import { z } from "zod";

/**
 * Validação em runtime de `Achievement.criteria` (`Json` no schema — Módulo
 * 1) contra o vocabulário suportado por `achievement-evaluator.ts`. Um
 * `Json` malformado (conquista cadastrada errada) nunca deve quebrar a
 * avaliação das demais — `achievement.service.ts` descarta (com aviso, não
 * exceção fatal) qualquer `Achievement` cujo `criteria` falhe aqui.
 */
export const AchievementCriteriaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("LESSONS_COMPLETED"), count: z.number().int().positive() }),
  z.object({ type: z.literal("LESSONS_MASTERED"), count: z.number().int().positive() }),
  z.object({ type: z.literal("QUESTIONS_ANSWERED_CORRECT"), count: z.number().int().positive() }),
  z.object({ type: z.literal("STREAK_DAYS"), count: z.number().int().positive() }),
  z.object({ type: z.literal("SIMULATIONS_COMPLETED"), count: z.number().int().positive() }),
  z.object({ type: z.literal("REVIEW_SESSIONS_COMPLETED"), count: z.number().int().positive() }),
  z.object({ type: z.literal("DISCIPLINES_STUDIED"), count: z.number().int().positive() }),
]);
export type AchievementCriteriaInput = z.infer<typeof AchievementCriteriaSchema>;
