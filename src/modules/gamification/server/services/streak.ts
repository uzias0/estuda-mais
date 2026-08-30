/**
 * Regras PURAS de streak (Módulo 9, seções 11-13) — sem Prisma, sem I/O.
 * "Dia estudado" nunca é decidido por `new Date().getDate()` (depende do
 * fuso do processo) — sempre por `getStudyDayKey`, deslocamento fixo e
 * determinístico (seção 13: não existe timezone por usuário no domínio
 * ainda; ver `src/config/gamification.ts`).
 */
import { DEFAULT_TIMEZONE_OFFSET_MINUTES } from "@/config/gamification";

/** "Que dia (YYYY-MM-DD) é isto", no fuso configurado — puro, determinístico, independente do TZ do host. */
export function getStudyDayKey(
  date: Date,
  offsetMinutes: number = DEFAULT_TIMEZONE_OFFSET_MINUTES,
): string {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayKeyToUtcMidnightMs(dayKey: string): number {
  const [year, month, day] = dayKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** `next` é exatamente o dia calendário seguinte a `previous` (mesma escala de `dayKey`). */
export function isNextDayKey(previous: string, next: string): boolean {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return dayKeyToUtcMidnightMs(next) - dayKeyToUtcMidnightMs(previous) === ONE_DAY_MS;
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastStudyDayKey: string | null;
  daysStudied: number;
}

/**
 * Deriva o próximo estado do streak a partir de um dia de atividade real
 * (seção 12):
 * - mesmo dia de `lastStudyDayKey` → nada muda (não soma de novo);
 * - dia seguinte → `currentStreak += 1`;
 * - qualquer lacuna (ou primeiro estudo) → `currentStreak = 1`;
 * - `longestStreak` nunca diminui.
 */
export function deriveNextStreakState(state: StreakState, activityDayKey: string): StreakState {
  if (state.lastStudyDayKey === activityDayKey) return state;

  const isConsecutive =
    state.lastStudyDayKey !== null && isNextDayKey(state.lastStudyDayKey, activityDayKey);
  const currentStreak = isConsecutive ? state.currentStreak + 1 : 1;

  return {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastStudyDayKey: activityDayKey,
    daysStudied: state.daysStudied + 1,
  };
}
