/** Testes puros (sem banco) do sistema de níveis (Módulo 9, seção 40 — "Nível"). */
import { describe, it, expect } from "vitest";
import { calculateLevelFromXp, getXpRequiredForLevel, getXpProgressToNextLevel } from "./level";
import { LEVEL_XP_TABLE, MAX_LEVEL } from "@/config/gamification";

describe("level (puro)", () => {
  it("calculateLevelFromXp: 0 XP é nível 1", () => {
    expect(calculateLevelFromXp(0)).toBe(1);
  });

  it("calculateLevelFromXp: XP negativo é tratado como 0 (nível 1)", () => {
    expect(calculateLevelFromXp(-500)).toBe(1);
  });

  it("calculateLevelFromXp: exatamente no limiar de um nível já conta para ele", () => {
    expect(calculateLevelFromXp(LEVEL_XP_TABLE[1])).toBe(2);
    expect(calculateLevelFromXp(LEVEL_XP_TABLE[1] - 1)).toBe(1);
  });

  it("calculateLevelFromXp: XP entre dois limiares fica no nível mais baixo", () => {
    const xp = LEVEL_XP_TABLE[2] + 1;
    expect(calculateLevelFromXp(xp)).toBe(3);
  });

  it("calculateLevelFromXp: XP muito alto não passa do MAX_LEVEL", () => {
    expect(calculateLevelFromXp(10_000_000)).toBe(MAX_LEVEL);
  });

  it("getXpRequiredForLevel: nível 1 exige 0 XP; clampa em [1, MAX_LEVEL]", () => {
    expect(getXpRequiredForLevel(1)).toBe(0);
    expect(getXpRequiredForLevel(0)).toBe(0);
    expect(getXpRequiredForLevel(MAX_LEVEL + 100)).toBe(LEVEL_XP_TABLE[MAX_LEVEL - 1]);
  });

  it("getXpProgressToNextLevel: 0 XP", () => {
    const progress = getXpProgressToNextLevel(0);
    expect(progress.currentLevel).toBe(1);
    expect(progress.nextLevel).toBe(2);
    expect(progress.xpIntoCurrentLevel).toBe(0);
    expect(progress.progressPercentage).toBe(0);
  });

  it("getXpProgressToNextLevel: no meio do nível 2", () => {
    const currentLevelXp = LEVEL_XP_TABLE[1];
    const nextLevelXp = LEVEL_XP_TABLE[2];
    const xp = currentLevelXp + Math.floor((nextLevelXp - currentLevelXp) / 2);
    const progress = getXpProgressToNextLevel(xp);
    expect(progress.currentLevel).toBe(2);
    expect(progress.nextLevel).toBe(3);
    expect(progress.progressPercentage).toBeCloseTo(50, 0);
    expect(progress.xpRemaining).toBe(nextLevelXp - xp);
  });

  it("getXpProgressToNextLevel: no nível máximo, sem próximo nível e 100%", () => {
    const progress = getXpProgressToNextLevel(LEVEL_XP_TABLE[MAX_LEVEL - 1] + 999_999);
    expect(progress.currentLevel).toBe(MAX_LEVEL);
    expect(progress.nextLevel).toBeNull();
    expect(progress.nextLevelXp).toBeNull();
    expect(progress.xpRemaining).toBeNull();
    expect(progress.progressPercentage).toBe(100);
  });
});
