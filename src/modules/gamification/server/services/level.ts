/**
 * Regras PURAS de nível (Módulo 9, seção 9/10) — sem Prisma, sem I/O. XP →
 * nível é sempre uma função determinística sobre `LEVEL_XP_TABLE`
 * (`src/config/gamification.ts`); nunca confiar em `level` enviado pelo
 * cliente.
 */
import { LEVEL_XP_TABLE, MAX_LEVEL } from "@/config/gamification";

/** Maior nível cujo XP mínimo (`LEVEL_XP_TABLE[level-1]`) já foi alcançado por `xp`. */
export function calculateLevelFromXp(xp: number): number {
  const clamped = Math.max(0, xp);
  let level = 1;
  for (let i = 1; i < LEVEL_XP_TABLE.length; i++) {
    if (clamped >= LEVEL_XP_TABLE[i]) level = i + 1;
    else break;
  }
  return level;
}

/** XP mínimo necessário para alcançar `level` (clampado em [1, MAX_LEVEL]). */
export function getXpRequiredForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(Math.trunc(level), MAX_LEVEL));
  return LEVEL_XP_TABLE[clampedLevel - 1];
}

export interface LevelProgress {
  totalXp: number;
  currentLevel: number;
  currentLevelXp: number;
  /** `null` quando `currentLevel` já é `MAX_LEVEL` — não há "próximo nível" modelado. */
  nextLevel: number | null;
  nextLevelXp: number | null;
  xpIntoCurrentLevel: number;
  xpRemaining: number | null;
  /** 0–100. Sempre 100 no nível máximo (seção 10). */
  progressPercentage: number;
}

/** Progresso completo para a UI (seção 10 do prompt) — sempre calculado no servidor. */
export function getXpProgressToNextLevel(xp: number): LevelProgress {
  const totalXp = Math.max(0, xp);
  const currentLevel = calculateLevelFromXp(totalXp);
  const currentLevelXp = getXpRequiredForLevel(currentLevel);
  const isMaxLevel = currentLevel >= MAX_LEVEL;
  const nextLevel = isMaxLevel ? null : currentLevel + 1;
  const nextLevelXp = isMaxLevel ? null : getXpRequiredForLevel(currentLevel + 1);

  const xpIntoCurrentLevel = totalXp - currentLevelXp;
  const xpRemaining = nextLevelXp === null ? null : nextLevelXp - totalXp;
  const levelSpan = nextLevelXp === null ? null : nextLevelXp - currentLevelXp;
  const progressPercentage = isMaxLevel
    ? 100
    : Math.round((xpIntoCurrentLevel / (levelSpan as number)) * 10000) / 100;

  return {
    totalXp,
    currentLevel,
    currentLevelXp,
    nextLevel,
    nextLevelXp,
    xpIntoCurrentLevel,
    xpRemaining,
    progressPercentage,
  };
}
