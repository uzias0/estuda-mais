/**
 * Streak persistido (Módulo 9, seções 11-13) — usa o modelo `Streak` que já
 * existia desde o Módulo 1 (`currentStreak`/`longestStreak`/`lastStudyDate`/
 * `daysStudied`/`minutesStudied`), sem nenhum serviço até aqui. Este módulo
 * é o primeiro a escrever nele — reaproveitado integralmente, sem migration.
 * `minutesStudied` é deliberadamente NUNCA escrito (seção 15: não existe
 * telemetria confiável de duração de estudo em nenhum módulo anterior —
 * inventar esse número violaria "não inventar métricas sem dado real").
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import type { Streak } from "@/generated/prisma/client";
import { assertOwnGamificationDataOrAdmin } from "./privacy";
import { getStudyDayKey, deriveNextStreakState, type StreakState } from "./streak";

function toStreakState(
  row: Pick<Streak, "currentStreak" | "longestStreak" | "lastStudyDate" | "daysStudied">,
): StreakState {
  return {
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    lastStudyDayKey: row.lastStudyDate ? getStudyDayKey(row.lastStudyDate) : null,
    daysStudied: row.daysStudied,
  };
}

/**
 * Registra que houve pelo menos uma atividade acadêmica válida em `now`
 * (seção 11 — nunca só login). Idempotente por dia: chamado várias vezes no
 * mesmo dia (ex.: duas lições concluídas) não altera o streak de novo —
 * `deriveNextStreakState` devolve o mesmo estado, e esta função então nem
 * grava.
 */
export async function recordStudyActivity(userId: string, now: Date = new Date()): Promise<Streak> {
  const existing = await prisma.streak.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const state = toStreakState(existing);
  const next = deriveNextStreakState(state, getStudyDayKey(now));
  if (next === state) return existing; // mesmo dia — nada a gravar.

  return prisma.streak.update({
    where: { userId },
    data: {
      currentStreak: next.currentStreak,
      longestStreak: next.longestStreak,
      lastStudyDate: now,
      daysStudied: next.daysStudied,
    },
  });
}

/** Leitura pura do streak — cria a linha padrão (tudo zerado) se o usuário nunca estudou. */
export async function getStreak(
  actor: Actor,
  targetUserId: string = actor.userId,
): Promise<Streak> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);
  return prisma.streak.upsert({
    where: { userId: targetUserId },
    create: { userId: targetUserId },
    update: {},
  });
}
