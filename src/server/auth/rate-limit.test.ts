import { describe, it, expect, beforeEach } from "vitest";
import { consumeRateLimit, RateLimitError, __resetRateLimits } from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    __resetRateLimits();
  });

  it("permite até `max` tentativas dentro da janela", () => {
    for (let i = 0; i < 5; i++) {
      expect(() => consumeRateLimit("k", 5, 60_000)).not.toThrow();
    }
  });

  it("bloqueia a tentativa que excede `max` dentro da janela", () => {
    for (let i = 0; i < 5; i++) consumeRateLimit("k", 5, 60_000);
    expect(() => consumeRateLimit("k", 5, 60_000)).toThrow(RateLimitError);
  });

  it("chaves diferentes têm contadores independentes", () => {
    for (let i = 0; i < 5; i++) consumeRateLimit("a", 5, 60_000);
    expect(() => consumeRateLimit("a", 5, 60_000)).toThrow(RateLimitError);
    expect(() => consumeRateLimit("b", 5, 60_000)).not.toThrow();
  });

  it("reabre a janela depois de `windowMs`", async () => {
    for (let i = 0; i < 3; i++) consumeRateLimit("k", 3, 20);
    expect(() => consumeRateLimit("k", 3, 20)).toThrow(RateLimitError);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(() => consumeRateLimit("k", 3, 20)).not.toThrow();
  });
});
