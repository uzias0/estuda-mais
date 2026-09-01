import { describe, it, expect } from "vitest";
import { divisionForLevel, RANKING_DIVISIONS } from "./ranking";

describe("divisionForLevel", () => {
  it("cobre todo nível de 1 a 50 sem buraco (cada nível cai em exatamente uma divisão)", () => {
    for (let level = 1; level <= 50; level++) {
      const division = divisionForLevel(level);
      expect(division).toBeDefined();
      expect(level).toBeGreaterThanOrEqual(division.minLevel);
      expect(level).toBeLessThanOrEqual(division.maxLevel);
    }
  });

  it("nível abaixo do mínimo ainda cai na primeira divisão (Bronze)", () => {
    expect(divisionForLevel(0).id).toBe("bronze");
    expect(divisionForLevel(-5).id).toBe("bronze");
  });

  it("nível acima do máximo modelado cai na última divisão (nunca undefined)", () => {
    expect(divisionForLevel(999).id).toBe(RANKING_DIVISIONS[RANKING_DIVISIONS.length - 1].id);
  });

  it("divisões não se sobrepõem entre si", () => {
    for (let i = 0; i < RANKING_DIVISIONS.length - 1; i++) {
      expect(RANKING_DIVISIONS[i].maxLevel).toBeLessThan(RANKING_DIVISIONS[i + 1].minLevel);
    }
  });
});
