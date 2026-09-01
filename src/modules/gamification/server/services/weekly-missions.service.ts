/**
 * Missões semanais (pedido do usuário — ver `src/config/missions.ts` para
 * a decisão de arquitetura completa: catálogo fixo + seleção
 * determinística por semana, sem cron). Progresso sempre DERIVADO dos
 * mesmos dados de origem já usados em outros lugares (LessonProgress/
 * QuestionAttempt/GamificationEvent) — nenhum contador redundante
 * persistido; só a RECOMPENSA concedida precisa de idempotência (mesmo
 * padrão de `awardXp`/`creditGems`), ancorada em `weekKey:missionId`.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { assertOwnGamificationDataOrAdmin } from "./privacy";
import { getStudyDayKey } from "./streak";
import { currentWeekRange } from "./calendar";
import { awardXp } from "./xp.service";
import { creditGems } from "./gems.service";
import { GAMIFICATION_EVENT_TYPES } from "@/config/gamification";
import { GEM_EVENT_TYPES } from "@/config/hearts";
import { MISSION_CATALOG, ACTIVE_MISSIONS_PER_WEEK, type MissionTemplate } from "@/config/missions";

/**
 * Escolhe quais missões do catálogo estão ativas nesta semana — hash
 * simples e determinístico do `weekKey` (nunca `Math.random()`/`Date.now()`
 * soltos: a mesma semana sempre seleciona o mesmo conjunto, para todo
 * mundo, mesmo recalculado em processos/dias diferentes).
 */
export function selectActiveMissions(
  weekKey: string,
  catalog: MissionTemplate[] = MISSION_CATALOG,
  count: number = ACTIVE_MISSIONS_PER_WEEK,
): MissionTemplate[] {
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = (hash * 31 + weekKey.charCodeAt(i)) >>> 0;
  }
  const start = hash % catalog.length;
  return Array.from(
    { length: Math.min(count, catalog.length) },
    (_, i) => catalog[(start + i) % catalog.length],
  );
}

interface WeeklyStats {
  lessonsCompleted: number;
  questionsCorrect: number;
  xpEarned: number;
  daysStudied: number;
}

async function gatherWeeklyStats(
  userId: string,
  range: { start: Date; end: Date },
): Promise<WeeklyStats> {
  const [lessonsCompleted, questionsCorrect, xpAgg, events] = await Promise.all([
    prisma.lessonProgress.count({
      where: { userId, completedAt: { gte: range.start, lt: range.end } },
    }),
    prisma.questionAttempt.count({
      where: { userId, isCorrect: true, createdAt: { gte: range.start, lt: range.end } },
    }),
    prisma.gamificationEvent.aggregate({
      where: { userId, createdAt: { gte: range.start, lt: range.end } },
      _sum: { xpAwarded: true },
    }),
    prisma.gamificationEvent.findMany({
      where: { userId, createdAt: { gte: range.start, lt: range.end } },
      select: { createdAt: true },
    }),
  ]);

  const daysStudied = new Set(events.map((e) => getStudyDayKey(e.createdAt))).size;

  return {
    lessonsCompleted,
    questionsCorrect,
    xpEarned: xpAgg._sum.xpAwarded ?? 0,
    daysStudied,
  };
}

function statValueFor(type: MissionTemplate["type"], stats: WeeklyStats): number {
  switch (type) {
    case "LESSONS_COMPLETED_WEEK":
      return stats.lessonsCompleted;
    case "QUESTIONS_CORRECT_WEEK":
      return stats.questionsCorrect;
    case "XP_EARNED_WEEK":
      return stats.xpEarned;
    case "DAYS_STUDIED_WEEK":
      return stats.daysStudied;
  }
}

export interface MissionStatus {
  mission: MissionTemplate;
  current: number;
  target: number;
  met: boolean;
  progressPercentage: number;
  /** `true` quando a recompensa já foi concedida (nesta semana) — ledger é a fonte de verdade, não um flag solto. */
  rewarded: boolean;
}

function missionIdempotencyKey(userId: string, weekKey: string, missionId: string): string {
  return `WEEKLY_MISSION:${userId}:${weekKey}:${missionId}`;
}

export interface WeeklyMissionsResult {
  weekKey: string;
  weekEndsAt: Date;
  missions: MissionStatus[];
  /** Soma do XP/joia concedidos NESTA chamada (0 se nada foi cumprido agora, ou se tudo já tinha sido concedido antes). */
  xpGrantedNow: number;
  gemsGrantedNow: number;
}

/**
 * Núcleo interno (SEM checagem de privacidade — só chamado depois de um
 * evento acadêmico real já verificado, mesmo padrão de
 * `evaluateAndUnlockAchievements(userId)` em `achievement.service.ts`):
 * calcula o progresso das missões ativas desta semana e concede a
 * recompensa (XP+joia) de qualquer uma recém-cumprida. Idempotente por
 * `weekKey:missionId` — chamar de novo no meio da semana nunca duplica
 * nada, então é seguro rodar a cada evento de gamificação (ver
 * `gamification-events.service.ts`) E toda vez que o aluno abre a tela de
 * missões.
 */
export async function evaluateAndRewardWeeklyMissions(
  userId: string,
  now: Date = new Date(),
): Promise<WeeklyMissionsResult> {
  const { weekKey, start, end } = currentWeekRange(now);
  const active = selectActiveMissions(weekKey);
  const stats = await gatherWeeklyStats(userId, { start, end });

  const missions: MissionStatus[] = [];
  let xpGrantedNow = 0;
  let gemsGrantedNow = 0;

  for (const mission of active) {
    const current = statValueFor(mission.type, stats);
    const target = mission.count;
    const met = current >= target;
    const progressPercentage =
      target <= 0 ? 100 : Math.min(100, Math.round((current / target) * 10000) / 100);

    let rewarded = false;
    if (met) {
      const idempotencyKey = missionIdempotencyKey(userId, weekKey, mission.id);
      const xpAward = await awardXp({
        userId,
        type: GAMIFICATION_EVENT_TYPES.WEEKLY_MISSION_COMPLETED,
        idempotencyKey,
        amount: mission.xpReward,
        referenceType: "WeeklyMission",
        referenceId: mission.id,
        metadata: { weekKey, title: mission.title },
      });
      const gemAward = await creditGems({
        userId,
        type: GEM_EVENT_TYPES.WEEKLY_MISSION_COMPLETED,
        idempotencyKey,
        amount: mission.gemReward,
        referenceType: "WeeklyMission",
        referenceId: mission.id,
        metadata: { weekKey, title: mission.title },
      });
      if (!xpAward.alreadyAwarded) xpGrantedNow += xpAward.event.xpAwarded;
      if (!gemAward.alreadyProcessed) gemsGrantedNow += gemAward.transaction.amount;
      rewarded = true;
    }

    missions.push({ mission, current, target, met, progressPercentage, rewarded });
  }

  return { weekKey, weekEndsAt: end, missions, xpGrantedNow, gemsGrantedNow };
}

/**
 * Versão exposta para a TELA de missões (Perfil/página dedicada) — mesma
 * lógica, com a checagem de privacidade padrão do módulo (seção 32) por
 * cima, já que aqui um `Actor` externo está pedindo os dados.
 */
export async function getWeeklyMissionsStatus(
  actor: Actor,
  targetUserId: string = actor.userId,
  now: Date = new Date(),
): Promise<WeeklyMissionsResult> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);
  return evaluateAndRewardWeeklyMissions(targetUserId, now);
}
