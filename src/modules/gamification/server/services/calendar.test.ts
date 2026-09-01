/** Testes puros (sem banco) de calendário semanal — mesmo padrão de `streak.test.ts`. */
import { describe, it, expect } from "vitest";
import { getWeekStartDayKey, weekRangeFromKey, currentWeekRange } from "./calendar";

describe("getWeekStartDayKey", () => {
  it("uma terça-feira devolve a segunda-feira da mesma semana", () => {
    // 2026-01-06 é uma terça-feira.
    expect(getWeekStartDayKey(new Date("2026-01-06T12:00:00Z"), 0)).toBe("2026-01-05");
  });

  it("um domingo devolve a segunda-feira ANTERIOR (fim da semana, não o início da próxima)", () => {
    // 2026-01-11 é um domingo.
    expect(getWeekStartDayKey(new Date("2026-01-11T12:00:00Z"), 0)).toBe("2026-01-05");
  });

  it("a própria segunda-feira devolve a si mesma", () => {
    expect(getWeekStartDayKey(new Date("2026-01-05T12:00:00Z"), 0)).toBe("2026-01-05");
  });

  it("usa o fuso configurado, não o do processo — vira o dia (e possivelmente a semana) em UTC-3", () => {
    // Segunda 2026-01-05T01:30Z em UTC-3 ainda é domingo 2026-01-04 — semana anterior.
    expect(getWeekStartDayKey(new Date("2026-01-05T01:30:00Z"), -180)).toBe("2025-12-29");
  });

  it("vira o mês/ano corretamente", () => {
    // 2026-01-01 é uma quinta-feira; a segunda daquela semana é 2025-12-29.
    expect(getWeekStartDayKey(new Date("2026-01-01T12:00:00Z"), 0)).toBe("2025-12-29");
  });
});

describe("weekRangeFromKey / currentWeekRange", () => {
  it("o intervalo tem exatamente 7 dias, começando na meia-noite (fuso real) da segunda-feira", () => {
    const { start, end } = weekRangeFromKey("2026-01-05", 0);
    expect(start.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("aplica o deslocamento de fuso na conversão de volta para UTC real", () => {
    const { start } = weekRangeFromKey("2026-01-05", -180);
    // Meia-noite de 05/01 no fuso UTC-3 é 03:00 UTC do mesmo dia.
    expect(start.toISOString()).toBe("2026-01-05T03:00:00.000Z");
  });

  it("currentWeekRange devolve o weekKey e o intervalo consistentes entre si", () => {
    const now = new Date("2026-01-06T12:00:00Z");
    const result = currentWeekRange(now, 0);
    expect(result.weekKey).toBe("2026-01-05");
    expect(result.start.toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(now.getTime()).toBeGreaterThanOrEqual(result.start.getTime());
    expect(now.getTime()).toBeLessThan(result.end.getTime());
  });
});
