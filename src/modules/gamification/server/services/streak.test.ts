/** Testes puros (sem banco) do streak (Módulo 9, seções 11-13/40). */
import { describe, it, expect } from "vitest";
import { getStudyDayKey, isNextDayKey, deriveNextStreakState, type StreakState } from "./streak";

const EMPTY: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDayKey: null,
  daysStudied: 0,
};

describe("streak (puro)", () => {
  it("getStudyDayKey: usa o fuso configurado, não o do processo — 2026-01-01T01:30Z em UTC-3 ainda é 2025-12-31", () => {
    const date = new Date("2026-01-01T01:30:00Z");
    expect(getStudyDayKey(date, -180)).toBe("2025-12-31");
  });

  it("isNextDayKey: dias consecutivos e não consecutivos", () => {
    expect(isNextDayKey("2026-01-01", "2026-01-02")).toBe(true);
    expect(isNextDayKey("2026-01-31", "2026-02-01")).toBe(true); // vira o mês
    expect(isNextDayKey("2026-01-01", "2026-01-03")).toBe(false);
    expect(isNextDayKey("2026-01-02", "2026-01-01")).toBe(false); // ordem invertida
  });

  it("primeiro estudo: currentStreak = 1", () => {
    const next = deriveNextStreakState(EMPTY, "2026-01-01");
    expect(next).toMatchObject({ currentStreak: 1, longestStreak: 1, daysStudied: 1 });
  });

  it("estudo no dia seguinte: currentStreak += 1", () => {
    const day1 = deriveNextStreakState(EMPTY, "2026-01-01");
    const day2 = deriveNextStreakState(day1, "2026-01-02");
    expect(day2.currentStreak).toBe(2);
    expect(day2.longestStreak).toBe(2);
    expect(day2.daysStudied).toBe(2);
  });

  it("repetição no mesmo dia: não aumenta de novo (idempotente)", () => {
    const day1 = deriveNextStreakState(EMPTY, "2026-01-01");
    const sameDayAgain = deriveNextStreakState(day1, "2026-01-01");
    expect(sameDayAgain).toEqual(day1);
  });

  it("falta de um dia: quebra a sequência e recomeça em 1", () => {
    const day1 = deriveNextStreakState(EMPTY, "2026-01-01");
    const day2 = deriveNextStreakState(day1, "2026-01-02");
    const day3 = deriveNextStreakState(day2, "2026-01-03");
    // salta 01-04, estuda só em 01-05 — quebra.
    const afterGap = deriveNextStreakState(day3, "2026-01-05");
    expect(afterGap.currentStreak).toBe(1);
    expect(afterGap.daysStudied).toBe(4);
  });

  it("o melhor streak histórico nunca diminui após uma quebra", () => {
    const day1 = deriveNextStreakState(EMPTY, "2026-01-01");
    const day2 = deriveNextStreakState(day1, "2026-01-02");
    const day3 = deriveNextStreakState(day2, "2026-01-03"); // longestStreak = 3
    const afterGap = deriveNextStreakState(day3, "2026-01-10"); // currentStreak volta a 1
    expect(afterGap.currentStreak).toBe(1);
    expect(afterGap.longestStreak).toBe(3);
  });

  it("um novo streak pode superar o antigo melhor streak", () => {
    const day1 = deriveNextStreakState(EMPTY, "2026-01-01");
    const day2 = deriveNextStreakState(day1, "2026-01-02"); // longestStreak = 2
    const afterGap1 = deriveNextStreakState(day2, "2026-01-10"); // quebra, currentStreak=1
    const afterGap2 = deriveNextStreakState(afterGap1, "2026-01-11");
    const afterGap3 = deriveNextStreakState(afterGap2, "2026-01-12"); // currentStreak=3 > 2
    expect(afterGap3.currentStreak).toBe(3);
    expect(afterGap3.longestStreak).toBe(3);
  });
});
