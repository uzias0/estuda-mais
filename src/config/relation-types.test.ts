import { describe, it, expect } from "vitest";
import { isValidRelationType, assertValidRelationType, RELATION_TYPES } from "./relation-types";

describe("relation-types allow-list", () => {
  it("aceita um relationType conhecido", () => {
    expect(isValidRelationType("INFLUENCIOU")).toBe(true);
  });

  it("rejeita um relationType desconhecido", () => {
    expect(isValidRelationType("INVENTOU_ISSO_AGORA")).toBe(false);
  });

  it("assertValidRelationType não lança para tipo conhecido", () => {
    expect(() => assertValidRelationType("COLABOROU_COM")).not.toThrow();
  });

  it("assertValidRelationType lança para tipo desconhecido", () => {
    expect(() => assertValidRelationType("NAO_EXISTE")).toThrow(/não está na allow-list/);
  });

  it("a allow-list é pequena e extensível (não centenas de relações)", () => {
    expect(Object.keys(RELATION_TYPES).length).toBeGreaterThan(0);
    expect(Object.keys(RELATION_TYPES).length).toBeLessThan(30);
  });
});
