/**
 * Testes unitários puros da função de prioridade (Módulo 5, seção 11) — sem
 * banco. Verifica a propriedade central exigida pelo prompt: atraso domina
 * a ordenação ("quanto mais atrasado, maior a prioridade"), e os demais
 * fatores (erro, dificuldade, recência, conceito fraco) desempatam dentro
 * do mesmo nível de atraso, sem nunca subverter o atraso.
 */
import { describe, it, expect } from "vitest";
import {
  computeReviewPriority,
  explainReviewPriority,
  type ReviewPriorityInput,
} from "./reviewPriority";

const NOW = new Date("2026-01-10T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function baseInput(overrides: Partial<ReviewPriorityInput> = {}): ReviewPriorityInput {
  return {
    dueAt: NOW,
    lastReviewedAt: NOW,
    createdAt: NOW,
    difficulty: "INTERMEDIARIO",
    errorRate: 0,
    isWeakConcept: false,
    ...overrides,
  };
}

describe("computeReviewPriority — atraso domina a ordenação", () => {
  it("item vencido há mais dias sempre supera um item vencido há menos dias, mesmo com pior desempenho no segundo", () => {
    const moreOverdue = computeReviewPriority(
      baseInput({ dueAt: new Date(NOW.getTime() - 10 * DAY), errorRate: 0 }),
      NOW,
    );
    const lessOverdueButWorsePerformance = computeReviewPriority(
      baseInput({ dueAt: new Date(NOW.getTime() - 1 * DAY), errorRate: 1, isWeakConcept: true }),
      NOW,
    );
    expect(moreOverdue).toBeGreaterThan(lessOverdueButWorsePerformance);
  });

  it("item vencido (dueAt no passado) sempre tem prioridade maior que um item ainda não vencido", () => {
    const overdue = computeReviewPriority(
      baseInput({ dueAt: new Date(NOW.getTime() - 1 * DAY) }),
      NOW,
    );
    const notDueYet = computeReviewPriority(
      baseInput({ dueAt: new Date(NOW.getTime() + 1 * DAY) }),
      NOW,
    );
    expect(overdue).toBeGreaterThan(notDueYet);
  });

  it("entre itens igualmente vencidos, maior taxa de erro produz maior prioridade", () => {
    const highError = computeReviewPriority(baseInput({ errorRate: 0.9 }), NOW);
    const lowError = computeReviewPriority(baseInput({ errorRate: 0.1 }), NOW);
    expect(highError).toBeGreaterThan(lowError);
  });

  it("entre itens igualmente vencidos, dificuldade maior (DOMINIO) produz maior prioridade que INICIANTE", () => {
    const hard = computeReviewPriority(baseInput({ difficulty: "DOMINIO" }), NOW);
    const easy = computeReviewPriority(baseInput({ difficulty: "INICIANTE" }), NOW);
    expect(hard).toBeGreaterThan(easy);
  });

  it("conceito identificado como lacuna diagnóstica (isWeakConcept) recebe bônus de prioridade", () => {
    const weak = computeReviewPriority(baseInput({ isWeakConcept: true }), NOW);
    const notWeak = computeReviewPriority(baseInput({ isWeakConcept: false }), NOW);
    expect(weak).toBeGreaterThan(notWeak);
  });

  it("item não revisado há mais tempo (recência) recebe prioridade levemente maior", () => {
    const stale = computeReviewPriority(
      baseInput({ lastReviewedAt: new Date(NOW.getTime() - 60 * DAY) }),
      NOW,
    );
    const fresh = computeReviewPriority(baseInput({ lastReviewedAt: NOW }), NOW);
    expect(stale).toBeGreaterThan(fresh);
  });

  it("item nunca revisado usa createdAt como referência de recência", () => {
    const neverReviewed = computeReviewPriority(
      baseInput({ lastReviewedAt: null, createdAt: new Date(NOW.getTime() - 5 * DAY) }),
      NOW,
    );
    const reviewedRecently = computeReviewPriority(baseInput({ lastReviewedAt: NOW }), NOW);
    expect(neverReviewed).toBeGreaterThan(reviewedRecently);
  });
});

describe("explainReviewPriority — justificativa determinística e legível", () => {
  it("menciona dias de atraso, percentual de erro, e não menciona lacuna quando não é o caso", () => {
    const reason = explainReviewPriority(
      baseInput({ dueAt: new Date(NOW.getTime() - 3 * DAY), errorRate: 0.4 }),
      NOW,
    );
    expect(reason).toContain("vencido há 3 dia(s)");
    expect(reason).toContain("40% de erro");
    expect(reason).not.toContain("lacuna");
  });

  it("menciona explicitamente quando o conceito é uma lacuna diagnóstica", () => {
    const reason = explainReviewPriority(baseInput({ isWeakConcept: true }), NOW);
    expect(reason).toContain("lacuna no diagnóstico");
  });

  it("é determinística: mesma entrada produz sempre a mesma string", () => {
    const input = baseInput({ dueAt: new Date(NOW.getTime() - 2 * DAY), errorRate: 0.25 });
    expect(explainReviewPriority(input, NOW)).toBe(explainReviewPriority(input, NOW));
  });
});
