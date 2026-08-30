/**
 * Resumo consolidado do estudante (Módulo 9, seção 28) —
 * `getGamificationSummary(actor, targetUserId?)`. Só composição de leituras
 * já existentes deste módulo; nenhum cálculo novo aqui.
 */
import { Actor } from "@/server/auth/authorize";
import { assertOwnGamificationDataOrAdmin } from "./privacy";
import { getTotalXp } from "./xp.service";
import { getXpProgressToNextLevel } from "./level";
import { getStreak } from "./streak.service";
import { getDailyGoalStatus } from "./daily-goal.service";
import { listAchievementsForUser } from "./achievement.service";
import { getStudentProgress } from "./student-progress.service";

export async function getGamificationSummary(actor: Actor, targetUserId: string = actor.userId) {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);

  const [totalXp, streak, dailyGoal, achievements, academicProgress] = await Promise.all([
    getTotalXp(actor, targetUserId),
    getStreak(actor, targetUserId),
    getDailyGoalStatus(actor, targetUserId),
    listAchievementsForUser(actor, targetUserId),
    getStudentProgress(actor, targetUserId),
  ]);

  return {
    xp: getXpProgressToNextLevel(totalXp),
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastStudyDate: streak.lastStudyDate,
    },
    dailyGoal,
    achievements: {
      recent: achievements.unlocked.slice(0, 5),
      upcoming: achievements.upcoming.slice(0, 5),
    },
    academicProgress,
  };
}
