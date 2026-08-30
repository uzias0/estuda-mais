/**
 * Testes unitários puros de `resolveWindowRange` (Módulo 7, seção 14) — sem
 * banco. `now` sempre explícito, nunca `Date.now()` implícito.
 */
import { describe, it, expect } from "vitest";
import { resolveWindowRange } from "./recentWindow";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("resolveWindowRange", () => {
  it("LAST_7_DAYS: from = now - 7 dias, to = now", () => {
    const range = resolveWindowRange("LAST_7_DAYS", undefined, undefined, NOW);
    expect(range.to).toEqual(NOW);
    expect(range.from.getTime()).toBe(NOW.getTime() - 7 * DAY);
  });

  it("LAST_30_DAYS", () => {
    const range = resolveWindowRange("LAST_30_DAYS", undefined, undefined, NOW);
    expect(range.from.getTime()).toBe(NOW.getTime() - 30 * DAY);
  });

  it("LAST_90_DAYS", () => {
    const range = resolveWindowRange("LAST_90_DAYS", undefined, undefined, NOW);
    expect(range.from.getTime()).toBe(NOW.getTime() - 90 * DAY);
  });

  it("CUSTOM: usa exatamente from/to informados", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const to = new Date("2026-02-01T00:00:00.000Z");
    const range = resolveWindowRange("CUSTOM", from, to, NOW);
    expect(range.from).toEqual(from);
    expect(range.to).toEqual(to);
  });

  it("é determinístico: mesma entrada produz sempre o mesmo resultado", () => {
    const a = resolveWindowRange("LAST_30_DAYS", undefined, undefined, NOW);
    const b = resolveWindowRange("LAST_30_DAYS", undefined, undefined, NOW);
    expect(a).toEqual(b);
  });
});
