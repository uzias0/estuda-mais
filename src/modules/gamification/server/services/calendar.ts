/**
 * Regras PURAS de calendário SEMANAL (fase "missões semanais/ranking
 * semanal") — sem Prisma, sem I/O, mesmo espírito de `getStudyDayKey`
 * (`streak.ts`, Módulo 9, seção 13): nunca decidido por `new
 * Date().getDay()` (depende do fuso do processo), sempre pelo mesmo
 * deslocamento fixo já configurado (`DEFAULT_TIMEZONE_OFFSET_MINUTES`).
 *
 * "Semana" aqui é sempre segunda a domingo (convenção comum no Brasil) —
 * `weekKey` é a data (YYYY-MM-DD) da SEGUNDA-FEIRA daquela semana, no
 * fuso configurado. Não é numeração ISO de semana (evita ambiguidade de
 * "semana 1" em virada de ano) — só uma data-âncora estável, a mesma
 * técnica de `getStudyDayKey`.
 */
import { DEFAULT_TIMEZONE_OFFSET_MINUTES } from "@/config/gamification";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Segunda-feira (YYYY-MM-DD) da semana que contém `date`, no fuso configurado. */
export function getWeekStartDayKey(
  date: Date,
  offsetMinutes: number = DEFAULT_TIMEZONE_OFFSET_MINUTES,
): string {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const dayOfWeek = shifted.getUTCDay(); // 0=domingo, 1=segunda, ..., 6=sábado
  const daysSinceMonday = (dayOfWeek + 6) % 7; // segunda=0, terça=1, ..., domingo=6
  const monday = new Date(shifted.getTime() - daysSinceMonday * ONE_DAY_MS);
  const year = monday.getUTCFullYear();
  const month = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const day = String(monday.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converte um `weekKey` (segunda-feira, no fuso configurado) de volta para
 * o intervalo real em UTC `[start, end)` — usado para filtrar
 * `createdAt`/`completedAt` no banco (que sempre grava em UTC real, nunca
 * "deslocado"). Inverte exatamente o deslocamento de `getStudyDayKey`.
 */
export function weekRangeFromKey(
  weekKey: string,
  offsetMinutes: number = DEFAULT_TIMEZONE_OFFSET_MINUTES,
): { start: Date; end: Date } {
  const [year, month, day] = weekKey.split("-").map(Number);
  const shiftedMondayMidnightMs = Date.UTC(year, month - 1, day);
  const start = new Date(shiftedMondayMidnightMs - offsetMinutes * 60_000);
  const end = new Date(start.getTime() + 7 * ONE_DAY_MS);
  return { start, end };
}

/** Atalho: início/fim da semana ATUAL (a que contém `now`), já convertido pra UTC real. */
export function currentWeekRange(
  now: Date = new Date(),
  offsetMinutes: number = DEFAULT_TIMEZONE_OFFSET_MINUTES,
): { weekKey: string; start: Date; end: Date } {
  const weekKey = getWeekStartDayKey(now, offsetMinutes);
  return { weekKey, ...weekRangeFromKey(weekKey, offsetMinutes) };
}
