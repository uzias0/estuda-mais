/**
 * Conquistas (Módulo 9, seções 18-20) — usa `Achievement`/`UserAchievement`
 * (Módulo 1), sem nenhum serviço até aqui; nenhuma entidade nova. Critérios
 * (`Achievement.criteria`, Json) são avaliados deterministicamente contra
 * estatísticas reais dos módulos anteriores — nunca contra
 * `unlockAchievement` enviado pelo cliente (seção 19).
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { LessonProgressStatus, StudyMode } from "@/generated/prisma/enums";
import type { Achievement } from "@/generated/prisma/client";
import { GAMIFICATION_EVENT_TYPES } from "@/config/gamification";
import { computePerformance } from "@/modules/assessment/server/services/performance.service";
import { AchievementCriteriaSchema } from "@/modules/gamification/types/achievement-criteria.schema";
import {
  evaluateAchievementCriteria,
  type AchievementEvaluation,
  type StudentGamificationStats,
} from "./achievement-evaluator";
import { assertOwnGamificationDataOrAdmin } from "./privacy";
import { awardXp } from "./xp.service";

/**
 * Reúne, a partir de dados JÁ existentes dos Módulos 3/5/6/8 (nunca
 * recalculados de outra forma), tudo que os critérios de conquista podem
 * consultar. `lessonsCompleted`/`lessonsMastered` reaproveitam diretamente
 * `LessonProgress.status` (Módulo 8) — não redefine o que significa
 * concluir/dominar uma lição (seção 26).
 */
export async function gatherStudentGamificationStats(
  userId: string,
): Promise<StudentGamificationStats> {
  const [
    lessonsCompleted,
    lessonsMastered,
    performance,
    streak,
    simulationsCompleted,
    reviewSessionsCompleted,
  ] = await Promise.all([
    prisma.lessonProgress.count({
      where: {
        userId,
        status: { in: [LessonProgressStatus.COMPLETED, LessonProgressStatus.MASTERED] },
      },
    }),
    prisma.lessonProgress.count({ where: { userId, status: LessonProgressStatus.MASTERED } }),
    computePerformance(userId),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.simulationAttempt.count({ where: { userId, finishedAt: { not: null } } }),
    prisma.studySession.count({
      where: { userId, mode: StudyMode.REVISAO, endedAt: { not: null } },
    }),
  ]);

  return {
    lessonsCompleted,
    lessonsMastered,
    questionsAnsweredCorrect: performance.correctCount,
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    simulationsCompleted,
    reviewSessionsCompleted,
    disciplinesStudied: Object.keys(performance.byDiscipline).length,
  };
}

async function unlockAchievementOnce(
  userId: string,
  achievement: Achievement,
): Promise<{ created: boolean }> {
  try {
    await prisma.userAchievement.create({ data: { userId, achievementId: achievement.id } });
  } catch (error) {
    // `@@id([userId, achievementId])` já garante que uma conquista nunca é
    // desbloqueada duas vezes (seção 20) — se a criação falhou porque já
    // existia (corrida ou reavaliação), não concede XP de novo.
    const alreadyExists = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
    });
    if (alreadyExists) return { created: false };

    // A `Achievement` pode ter sido removida entre a listagem (em
    // `evaluateAndUnlockAchievements`) e esta tentativa de desbloqueio
    // (ex.: curadoria removendo uma conquista de teste/descontinuada) —
    // viola a FK, não a chave primária. Não é motivo para quebrar todo o
    // processamento de gamificação por uma conquista que já não existe
    // mais; ignora silenciosamente esta, as demais continuam avaliando.
    const stillExists = await prisma.achievement.findUnique({ where: { id: achievement.id } });
    if (!stillExists) return { created: false };

    throw error;
  }

  await awardXp({
    userId,
    type: GAMIFICATION_EVENT_TYPES.ACHIEVEMENT_UNLOCKED,
    idempotencyKey: `${GAMIFICATION_EVENT_TYPES.ACHIEVEMENT_UNLOCKED}:${userId}:${achievement.id}`,
    amount: achievement.xpReward,
    referenceType: "Achievement",
    referenceId: achievement.id,
    metadata: { code: achievement.code, name: achievement.name },
  });
  return { created: true };
}

export interface AchievementUnlockOutcome {
  achievement: Achievement;
  /** `true` só quando esta chamada de fato desbloqueou agora (não já estava desbloqueada). */
  justUnlocked: boolean;
}

/**
 * Avalia TODAS as conquistas ainda não desbloqueadas por `userId` contra as
 * estatísticas reais atuais e desbloqueia (com XP) as que atingiram o
 * critério (seção 19: `evaluateAchievements(userId)`). Determinística —
 * chamar de novo sem novo progresso não desbloqueia nada além do que já foi.
 * Critério malformado (`Achievement.criteria` inválido) é ignorado, não
 * quebra a avaliação das demais conquistas.
 */
export async function evaluateAndUnlockAchievements(
  userId: string,
): Promise<AchievementUnlockOutcome[]> {
  const [achievements, unlockedRows] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);
  const unlockedIds = new Set(unlockedRows.map((u) => u.achievementId));
  const candidates = achievements.filter((a) => !unlockedIds.has(a.id));
  if (candidates.length === 0) return [];

  const stats = await gatherStudentGamificationStats(userId);

  const outcomes: AchievementUnlockOutcome[] = [];
  for (const achievement of candidates) {
    const parsed = AchievementCriteriaSchema.safeParse(achievement.criteria);
    if (!parsed.success) continue;
    if (!evaluateAchievementCriteria(parsed.data, stats).met) continue;

    const { created } = await unlockAchievementOnce(userId, achievement);
    outcomes.push({ achievement, justUnlocked: created });
  }
  return outcomes;
}

export interface UnlockedAchievementView {
  achievement: Achievement;
  unlockedAt: Date;
}
export interface UpcomingAchievementView {
  achievement: Achievement;
  evaluation: AchievementEvaluation;
}

/** Leitura pura (não desbloqueia nada): conquistas já desbloqueadas + as próximas, ordenadas por progresso. */
export async function listAchievementsForUser(
  actor: Actor,
  targetUserId: string = actor.userId,
): Promise<{ unlocked: UnlockedAchievementView[]; upcoming: UpcomingAchievementView[] }> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);

  const [achievements, unlockedRows, stats] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { code: "asc" } }),
    prisma.userAchievement.findMany({
      where: { userId: targetUserId },
      include: { achievement: true },
    }),
    gatherStudentGamificationStats(targetUserId),
  ]);
  const unlockedIds = new Set(unlockedRows.map((u) => u.achievementId));

  const unlocked = unlockedRows
    .map((u) => ({ achievement: u.achievement, unlockedAt: u.unlockedAt }))
    .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime());

  const upcoming = achievements
    .filter((a) => !unlockedIds.has(a.id))
    .map((achievement) => {
      const parsed = AchievementCriteriaSchema.safeParse(achievement.criteria);
      if (!parsed.success) return null;
      return { achievement, evaluation: evaluateAchievementCriteria(parsed.data, stats) };
    })
    .filter((entry): entry is UpcomingAchievementView => entry !== null)
    .sort((a, b) => b.evaluation.progressPercentage - a.evaluation.progressPercentage);

  return { unlocked, upcoming };
}
