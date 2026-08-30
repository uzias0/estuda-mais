/**
 * Meta diária (Módulo 9, seções 15-17) — usa `DailyGoal` (Módulo 1,
 * `targetXp`/`todayXp`/`lastResetAt`), sem nenhum serviço até aqui. O
 * schema só modela uma meta baseada em XP — não em contagem de questões,
 * lições ou minutos (seção 15: "se não existe dado confiável... não
 * implementar meta baseada em tempo até existir telemetria real"; o mesmo
 * raciocínio se aplica a metas por contagem de atividade, que exigiriam
 * campos que o schema não tem — decisão registrada em `docs/MODULO-9.md`).
 * Toda meta concluída neste módulo é, portanto, "ganhar N XP hoje".
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import type { DailyGoal } from "@/generated/prisma/client";
import { GAMIFICATION_EVENT_TYPES, XP_REWARDS } from "@/config/gamification";
import { assertOwnGamificationDataOrAdmin } from "./privacy";
import { getStudyDayKey } from "./streak";
import { awardXp } from "./xp.service";

function isSameStudyDay(a: Date, b: Date): boolean {
  return getStudyDayKey(a) === getStudyDayKey(b);
}

/** Garante a linha (`DailyGoal.targetXp` default do schema, 20) e reinicia `todayXp` quando o dia (seção 13) virou. */
async function loadOrResetDailyGoal(userId: string, now: Date): Promise<DailyGoal> {
  const existing = await prisma.dailyGoal.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  if (isSameStudyDay(existing.lastResetAt, now)) return existing;

  return prisma.dailyGoal.update({
    where: { userId },
    data: { todayXp: 0, lastResetAt: now },
  });
}

export interface DailyGoalStatus {
  target: number;
  current: number;
  percentage: number;
  completed: boolean;
  remaining: number;
}

function toStatus(goal: DailyGoal): DailyGoalStatus {
  const percentage =
    goal.targetXp <= 0
      ? 100
      : Math.min(100, Math.round((goal.todayXp / goal.targetXp) * 10000) / 100);
  return {
    target: goal.targetXp,
    current: goal.todayXp,
    percentage,
    completed: goal.todayXp >= goal.targetXp,
    remaining: Math.max(0, goal.targetXp - goal.todayXp),
  };
}

/**
 * Aplica XP ganho agora ao progresso da meta diária (seção 15-17):
 * reinicia se o dia virou, soma o XP, e — se isso cruzar o alvo pela
 * primeira vez NESTE dia — concede a recompensa da meta, idempotente por
 * dia (`DAILY_GOAL_COMPLETED:<userId>:<dayKey>`; seção 17: "não permitir
 * que a mesma meta diária gere recompensa múltiplas vezes"). A própria
 * recompensa da meta NÃO é somada de volta a `todayXp` — evita a
 * circularidade de uma meta contar o próprio bônus de tê-la concluído.
 */
export async function applyXpToDailyGoal(
  userId: string,
  xpAmount: number,
  now: Date = new Date(),
): Promise<DailyGoalStatus> {
  const goal = await loadOrResetDailyGoal(userId, now);
  const wasCompleted = goal.todayXp >= goal.targetXp;

  const updated = await prisma.dailyGoal.update({
    where: { userId },
    data: { todayXp: goal.todayXp + Math.max(0, xpAmount) },
  });

  const isCompletedNow = updated.todayXp >= updated.targetXp;
  if (!wasCompleted && isCompletedNow) {
    const dayKey = getStudyDayKey(now);
    await awardXp({
      userId,
      type: GAMIFICATION_EVENT_TYPES.DAILY_GOAL_COMPLETED,
      idempotencyKey: `${GAMIFICATION_EVENT_TYPES.DAILY_GOAL_COMPLETED}:${userId}:${dayKey}`,
      amount: XP_REWARDS.DAILY_GOAL_COMPLETED,
      referenceType: "DailyGoal",
      referenceId: userId,
      metadata: { dayKey, targetXp: updated.targetXp },
    });
  }

  return toStatus(updated);
}

/** Leitura pura do status da meta de hoje — cria a linha padrão se necessário, mas não concede XP. */
export async function getDailyGoalStatus(
  actor: Actor,
  targetUserId: string = actor.userId,
  now: Date = new Date(),
): Promise<DailyGoalStatus> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);
  const goal = await loadOrResetDailyGoal(targetUserId, now);
  return toStatus(goal);
}
