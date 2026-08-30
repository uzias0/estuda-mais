/**
 * Algoritmo de revisão espaçada — "SM-2-lite" determinístico (Módulo 5,
 * seção 9; política documentada em `config/review.ts`). Função pura: sem
 * Prisma, sem `Date.now()` implícito (recebe `now` explícito) — só
 * matemática sobre os campos já existentes de `ReviewItem`. Quem chama
 * (`reviewSession.service.ts`) busca o estado atual, chama esta função, e
 * persiste o resultado.
 */
import { ReviewState } from "@/generated/prisma/enums";
import {
  DIFFICULTY_INTERVAL_MULTIPLIER,
  EASE_FACTOR_BONUS_ON_CORRECT,
  EASE_FACTOR_MAX,
  EASE_FACTOR_MIN,
  EASE_FACTOR_PENALTY_ON_INCORRECT,
  MASTERY_REPETITIONS_THRESHOLD,
  MAX_INTERVAL_DAYS,
  MIN_INTERVAL_DAYS,
  REVIEW_INTERVAL_STAIRCASE_DAYS,
} from "@/config/review";

type DifficultyValue = keyof typeof DIFFICULTY_INTERVAL_MULTIPLIER;
type ReviewStateValue = (typeof ReviewState)[keyof typeof ReviewState];

export interface ReviewSchedulingState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  state: ReviewStateValue;
}

export interface ReviewSchedulingResult extends ReviewSchedulingState {
  dueAt: Date;
}

function clampInterval(days: number): number {
  return Math.min(MAX_INTERVAL_DAYS, Math.max(MIN_INTERVAL_DAYS, Math.round(days)));
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Estado pós-acerto, derivado só de `repetitions` (Módulo 5, seção 7). */
function stateAfterCorrect(repetitions: number): ReviewStateValue {
  if (repetitions >= MASTERY_REPETITIONS_THRESHOLD) return ReviewState.MASTERED;
  return ReviewState.REVIEW;
}

/**
 * Deriva o estado "ativo" (não-SUSPENDED) coerente com o histórico atual de
 * um item — usado só por `resumeReviewItem` (o único lugar onde um item
 * volta de SUSPENDED sem passar por `computeNextReview`, então precisa
 * reconstituir o estado a partir de `repetitions`/`lastReviewedAt` em vez de
 * herdar o resultado de uma resposta).
 */
export function deriveActiveState(
  repetitions: number,
  lastReviewedAt: Date | null,
): ReviewStateValue {
  if (!lastReviewedAt) return ReviewState.NEW;
  if (repetitions === 0) return ReviewState.LEARNING;
  return stateAfterCorrect(repetitions);
}

/**
 * Calcula o próximo estado de agendamento de um `ReviewItem` a partir do
 * resultado (correto/incorreto) e da dificuldade do conteúdo revisado.
 * `SUSPENDED` nunca é produzido aqui — é uma transição administrativa
 * explícita (`suspendReviewItem`/`resumeReviewItem`), fora deste algoritmo.
 */
export function computeNextReview(
  current: ReviewSchedulingState,
  isCorrect: boolean,
  difficulty: DifficultyValue | null,
  now: Date,
): ReviewSchedulingResult {
  const multiplier = difficulty ? DIFFICULTY_INTERVAL_MULTIPLIER[difficulty] : 1;

  if (!isCorrect) {
    const easeFactor = Math.max(
      EASE_FACTOR_MIN,
      current.easeFactor - EASE_FACTOR_PENALTY_ON_INCORRECT,
    );
    const intervalDays = clampInterval(MIN_INTERVAL_DAYS * multiplier);
    return {
      repetitions: 0,
      intervalDays,
      easeFactor,
      state: ReviewState.LEARNING,
      dueAt: addDays(now, intervalDays),
    };
  }

  const repetitions = current.repetitions + 1;
  const easeFactor = Math.min(EASE_FACTOR_MAX, current.easeFactor + EASE_FACTOR_BONUS_ON_CORRECT);
  const baseInterval =
    repetitions <= REVIEW_INTERVAL_STAIRCASE_DAYS.length
      ? REVIEW_INTERVAL_STAIRCASE_DAYS[repetitions - 1]
      : current.intervalDays * easeFactor;
  const intervalDays = clampInterval(baseInterval * multiplier);

  return {
    repetitions,
    intervalDays,
    easeFactor,
    state: stateAfterCorrect(repetitions),
    dueAt: addDays(now, intervalDays),
  };
}
