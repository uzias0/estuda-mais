/**
 * Testes unitários puros do algoritmo de revisão espaçada (Módulo 5, seção
 * 9) — sem banco, sem I/O. Cobre a escada de intervalos, o reset por erro,
 * o ajuste por dificuldade, os limites de `easeFactor`, e o limiar de
 * `MASTERED` (seção 28: "criação", "acerto", "erro", "repetição").
 */
import { describe, it, expect } from "vitest";
import {
  EASE_FACTOR_MAX,
  EASE_FACTOR_MIN,
  MASTERY_REPETITIONS_THRESHOLD,
  MAX_INTERVAL_DAYS,
  REVIEW_INTERVAL_STAIRCASE_DAYS,
} from "@/config/review";
import {
  computeNextReview,
  deriveActiveState,
  type ReviewSchedulingState,
} from "./spacedRepetition";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

const FRESH: ReviewSchedulingState = {
  repetitions: 0,
  intervalDays: 1,
  easeFactor: 2.5,
  state: "NEW",
};

describe("computeNextReview — acertos consecutivos seguem a escada", () => {
  it("primeiro acerto agenda para 1 dia e vai para REVIEW", () => {
    const result = computeNextReview(FRESH, true, "INTERMEDIARIO", NOW);
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(REVIEW_INTERVAL_STAIRCASE_DAYS[0]);
    expect(result.state).toBe("REVIEW");
    expect(daysBetween(result.dueAt, NOW)).toBe(result.intervalDays);
  });

  it("acertos consecutivos 2ª–5ª seguem 3, 7, 14, 30 dias (dificuldade neutra)", () => {
    let state = FRESH;
    const expected = REVIEW_INTERVAL_STAIRCASE_DAYS;
    for (let i = 0; i < expected.length; i++) {
      const result = computeNextReview(state, true, "INTERMEDIARIO", NOW);
      expect(result.intervalDays).toBe(expected[i]);
      state = result;
    }
  });

  it("atinge MASTERED exatamente na 5ª repetição consecutiva (fim da escada)", () => {
    let state = FRESH;
    for (let i = 0; i < MASTERY_REPETITIONS_THRESHOLD - 1; i++) {
      state = computeNextReview(state, true, "INTERMEDIARIO", NOW);
      expect(state.state).toBe("REVIEW");
    }
    state = computeNextReview(state, true, "INTERMEDIARIO", NOW);
    expect(state.repetitions).toBe(MASTERY_REPETITIONS_THRESHOLD);
    expect(state.state).toBe("MASTERED");
  });

  it("além da escada, o intervalo cresce multiplicando pelo easeFactor, respeitando o teto", () => {
    let state = FRESH;
    for (let i = 0; i < MASTERY_REPETITIONS_THRESHOLD; i++) {
      state = computeNextReview(state, true, "INTERMEDIARIO", NOW);
    }
    const beyond = computeNextReview(state, true, "INTERMEDIARIO", NOW);
    expect(beyond.intervalDays).toBeGreaterThan(state.intervalDays);
    expect(beyond.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it("easeFactor aumenta a cada acerto, sem ultrapassar o teto", () => {
    const state: ReviewSchedulingState = { ...FRESH, easeFactor: EASE_FACTOR_MAX - 0.01 };
    const result = computeNextReview(state, true, "INTERMEDIARIO", NOW);
    expect(result.easeFactor).toBeLessThanOrEqual(EASE_FACTOR_MAX);
  });
});

describe("computeNextReview — erro reseta e reduz o intervalo", () => {
  it("erro zera repetitions, volta o intervalo ao mínimo e o estado para LEARNING", () => {
    // Avança 3 acertos (intervalo chega a 7 dias) antes de errar, para que a
    // redução seja observável — no 1º acerto o intervalo já nasce no piso
    // (1 dia), então não haveria "queda" visível para testar ali.
    let advanced = FRESH;
    for (let i = 0; i < 3; i++) advanced = computeNextReview(advanced, true, "INTERMEDIARIO", NOW);
    expect(advanced.intervalDays).toBe(REVIEW_INTERVAL_STAIRCASE_DAYS[2]);

    const afterError = computeNextReview(advanced, false, "INTERMEDIARIO", NOW);
    expect(afterError.repetitions).toBe(0);
    expect(afterError.state).toBe("LEARNING");
    expect(afterError.intervalDays).toBeLessThan(advanced.intervalDays);
  });

  it("easeFactor diminui a cada erro, sem cair abaixo do piso", () => {
    const result = computeNextReview(
      { ...FRESH, easeFactor: EASE_FACTOR_MIN + 0.01 },
      false,
      "INTERMEDIARIO",
      NOW,
    );
    expect(result.easeFactor).toBeGreaterThanOrEqual(EASE_FACTOR_MIN);
  });

  it("um MASTERED que erra volta para LEARNING (não fica preso em MASTERED)", () => {
    let state = FRESH;
    for (let i = 0; i < MASTERY_REPETITIONS_THRESHOLD; i++) {
      state = computeNextReview(state, true, "INTERMEDIARIO", NOW);
    }
    expect(state.state).toBe("MASTERED");
    const afterError = computeNextReview(state, false, "INTERMEDIARIO", NOW);
    expect(afterError.state).toBe("LEARNING");
    expect(afterError.repetitions).toBe(0);
  });
});

describe("computeNextReview — dificuldade ajusta o intervalo (seção 10)", () => {
  it("item DOMINIO (difícil) volta mais rápido que INICIANTE (fácil), mesmo com o mesmo desempenho", () => {
    // No 1º acerto o intervalo nasce no piso de 1 dia para qualquer
    // dificuldade (arredondamento não deixa diferença aparecer) — a
    // diferença é observável a partir de intervalos maiores (aqui, o 4º
    // acerto consecutivo, base 14 dias antes do multiplicador).
    let easy: ReviewSchedulingState = FRESH;
    let hard: ReviewSchedulingState = FRESH;
    for (let i = 0; i < 4; i++) {
      easy = computeNextReview(easy, true, "INICIANTE", NOW);
      hard = computeNextReview(hard, true, "DOMINIO", NOW);
    }
    expect(hard.intervalDays).toBeLessThan(easy.intervalDays);
  });

  it("dificuldade nula (sem dado) não altera o intervalo (multiplicador neutro)", () => {
    const withoutDifficulty = computeNextReview(FRESH, true, null, NOW);
    const neutral = computeNextReview(FRESH, true, "INTERMEDIARIO", NOW);
    expect(withoutDifficulty.intervalDays).toBe(neutral.intervalDays);
  });
});

describe("computeNextReview — alternância (repetição de acertos e erros)", () => {
  it("acerto, acerto, erro, acerto: reseta no erro e recomeça a escada", () => {
    let state = computeNextReview(FRESH, true, "INTERMEDIARIO", NOW); // rep=1
    state = computeNextReview(state, true, "INTERMEDIARIO", NOW); // rep=2
    state = computeNextReview(state, false, "INTERMEDIARIO", NOW); // erro -> rep=0
    expect(state.repetitions).toBe(0);
    state = computeNextReview(state, true, "INTERMEDIARIO", NOW); // rep=1 de novo
    expect(state.repetitions).toBe(1);
    expect(state.intervalDays).toBe(REVIEW_INTERVAL_STAIRCASE_DAYS[0]);
  });
});

describe("deriveActiveState — reconstitui estado a partir do histórico (resumeReviewItem)", () => {
  it("item nunca revisado (lastReviewedAt nulo) volta como NEW", () => {
    expect(deriveActiveState(0, null)).toBe("NEW");
  });

  it("item com repetitions=0 mas já revisado (último evento foi erro) volta como LEARNING", () => {
    expect(deriveActiveState(0, NOW)).toBe("LEARNING");
  });

  it("item com repetitions abaixo do limiar volta como REVIEW", () => {
    expect(deriveActiveState(2, NOW)).toBe("REVIEW");
  });

  it("item com repetitions no limiar de maestria volta como MASTERED", () => {
    expect(deriveActiveState(MASTERY_REPETITIONS_THRESHOLD, NOW)).toBe("MASTERED");
  });
});
