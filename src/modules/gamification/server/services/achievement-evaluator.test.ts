/** Testes puros (sem banco) do avaliador de critérios de conquista (Módulo 9, seções 18/19/40). */
import { describe, it, expect } from "vitest";
import {
  evaluateAchievementCriteria,
  type StudentGamificationStats,
} from "./achievement-evaluator";

const ZERO_STATS: StudentGamificationStats = {
  lessonsCompleted: 0,
  lessonsMastered: 0,
  questionsAnsweredCorrect: 0,
  currentStreak: 0,
  longestStreak: 0,
  simulationsCompleted: 0,
  reviewSessionsCompleted: 0,
  disciplinesStudied: 0,
};

describe("achievement-evaluator (puro)", () => {
  it("critério verdadeiro: lessonsCompleted >= count", () => {
    const result = evaluateAchievementCriteria(
      { type: "LESSONS_COMPLETED", count: 1 },
      { ...ZERO_STATS, lessonsCompleted: 1 },
    );
    expect(result.met).toBe(true);
    expect(result.progressPercentage).toBe(100);
  });

  it("critério falso: abaixo do alvo", () => {
    const result = evaluateAchievementCriteria(
      { type: "QUESTIONS_ANSWERED_CORRECT", count: 10 },
      { ...ZERO_STATS, questionsAnsweredCorrect: 4 },
    );
    expect(result.met).toBe(false);
    expect(result.current).toBe(4);
    expect(result.progressPercentage).toBe(40);
  });

  it("STREAK_DAYS usa o melhor streak histórico, não o atual (não revoga conquista após quebra)", () => {
    const result = evaluateAchievementCriteria(
      { type: "STREAK_DAYS", count: 7 },
      { ...ZERO_STATS, currentStreak: 1, longestStreak: 7 },
    );
    expect(result.met).toBe(true);
  });

  it("progressPercentage nunca passa de 100 mesmo excedendo o alvo", () => {
    const result = evaluateAchievementCriteria(
      { type: "SIMULATIONS_COMPLETED", count: 1 },
      { ...ZERO_STATS, simulationsCompleted: 5 },
    );
    expect(result.progressPercentage).toBe(100);
  });

  it("cobre todos os tipos de critério suportados", () => {
    const stats: StudentGamificationStats = {
      lessonsCompleted: 3,
      lessonsMastered: 2,
      questionsAnsweredCorrect: 15,
      currentStreak: 4,
      longestStreak: 9,
      simulationsCompleted: 1,
      reviewSessionsCompleted: 6,
      disciplinesStudied: 2,
    };
    expect(evaluateAchievementCriteria({ type: "LESSONS_MASTERED", count: 2 }, stats).met).toBe(
      true,
    );
    expect(
      evaluateAchievementCriteria({ type: "REVIEW_SESSIONS_COMPLETED", count: 6 }, stats).met,
    ).toBe(true);
    expect(evaluateAchievementCriteria({ type: "DISCIPLINES_STUDIED", count: 3 }, stats).met).toBe(
      false,
    );
  });
});
