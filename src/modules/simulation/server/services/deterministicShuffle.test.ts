/**
 * Testes unitários puros do embaralhamento determinístico (Módulo 6, seção
 * 8) — sem banco. Garante: mesma seed → mesma ordem sempre; seeds
 * diferentes → ordens (em geral) diferentes; nunca perde/duplica itens.
 */
import { describe, it, expect } from "vitest";
import { deterministicShuffle } from "./deterministicShuffle";

describe("deterministicShuffle", () => {
  const items = Array.from({ length: 20 }, (_, i) => `item-${i}`);

  it("é determinístico: a mesma seed sempre produz a mesma ordem", () => {
    const a = deterministicShuffle(items, 42);
    const b = deterministicShuffle(items, 42);
    expect(a).toEqual(b);
  });

  it("seeds diferentes tendem a produzir ordens diferentes", () => {
    const a = deterministicShuffle(items, 1);
    const b = deterministicShuffle(items, 2);
    expect(a).not.toEqual(b);
  });

  it("nunca perde nem duplica itens — só reordena", () => {
    const shuffled = deterministicShuffle(items, 7);
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it("não muta o array original", () => {
    const original = [...items];
    deterministicShuffle(items, 99);
    expect(items).toEqual(original);
  });

  it("seed 0 (padrão) também é reprodutível", () => {
    const a = deterministicShuffle(items, 0);
    const b = deterministicShuffle(items, 0);
    expect(a).toEqual(b);
  });
});
