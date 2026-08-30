/**
 * Avaliação PURA de critério de conquista (Módulo 9, seção 18/19) — sem
 * Prisma, sem I/O. Recebe um snapshot já calculado das estatísticas reais do
 * aluno (`StudentGamificationStats`, montado por `achievement.service.ts` a
 * partir de dados dos módulos 3/5/6/8, nunca inventado) e decide
 * deterministicamente se um critério foi atingido. Nunca confia em
 * `unlockAchievement` enviado pelo cliente (seção 19).
 */

export interface StudentGamificationStats {
  lessonsCompleted: number;
  lessonsMastered: number;
  questionsAnsweredCorrect: number;
  currentStreak: number;
  longestStreak: number;
  simulationsCompleted: number;
  reviewSessionsCompleted: number;
  disciplinesStudied: number;
}

/**
 * Vocabulário de critérios suportado — cada `Achievement.criteria` (Json no
 * schema) deve corresponder a uma destas formas depois de validado por
 * `AchievementCriteriaSchema` (`types/achievement-criteria.schema.ts`).
 */
export type AchievementCriteria =
  | { type: "LESSONS_COMPLETED"; count: number }
  | { type: "LESSONS_MASTERED"; count: number }
  | { type: "QUESTIONS_ANSWERED_CORRECT"; count: number }
  | { type: "STREAK_DAYS"; count: number }
  | { type: "SIMULATIONS_COMPLETED"; count: number }
  | { type: "REVIEW_SESSIONS_COMPLETED"; count: number }
  | { type: "DISCIPLINES_STUDIED"; count: number };

export interface AchievementEvaluation {
  met: boolean;
  current: number;
  target: number;
  /** 0–100, sempre limitado a 100 mesmo quando `current > target`. */
  progressPercentage: number;
}

function statValueFor(type: AchievementCriteria["type"], stats: StudentGamificationStats): number {
  switch (type) {
    case "LESSONS_COMPLETED":
      return stats.lessonsCompleted;
    case "LESSONS_MASTERED":
      return stats.lessonsMastered;
    case "QUESTIONS_ANSWERED_CORRECT":
      return stats.questionsAnsweredCorrect;
    // Usa o melhor streak histórico, não o atual — uma conquista, uma vez
    // alcançada, não deve poder ser "perdida" só porque o streak quebrou
    // depois (seção 20: conquista já desbloqueada nunca é revertida).
    case "STREAK_DAYS":
      return stats.longestStreak;
    case "SIMULATIONS_COMPLETED":
      return stats.simulationsCompleted;
    case "REVIEW_SESSIONS_COMPLETED":
      return stats.reviewSessionsCompleted;
    case "DISCIPLINES_STUDIED":
      return stats.disciplinesStudied;
  }
}

export function evaluateAchievementCriteria(
  criteria: AchievementCriteria,
  stats: StudentGamificationStats,
): AchievementEvaluation {
  const current = statValueFor(criteria.type, stats);
  const target = criteria.count;
  const met = current >= target;
  const progressPercentage =
    target <= 0 ? 100 : Math.min(100, Math.round((current / target) * 10000) / 100);
  return { met, current, target, progressPercentage };
}
