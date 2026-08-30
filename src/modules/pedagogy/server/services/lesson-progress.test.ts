/**
 * Testes puros (sem banco) das regras de progresso de lição (Módulo 8,
 * seção 50: "serviços puros... facilmente testáveis sem banco").
 */
import { describe, it, expect } from "vitest";
import {
  deriveLessonAccuracy,
  deriveLessonProgressStatus,
  computeLessonProgressSummary,
} from "./lesson-progress";

describe("lesson-progress (puro)", () => {
  it("deriveLessonAccuracy: null sem nenhuma atividade avaliativa", () => {
    expect(deriveLessonAccuracy({ totalActivities: 0, correctActivities: 0 })).toBeNull();
  });

  it("deriveLessonAccuracy: percentual correto com atividades", () => {
    expect(deriveLessonAccuracy({ totalActivities: 4, correctActivities: 3 })).toBe(75);
  });

  it("deriveLessonProgressStatus: NOT_STARTED sem nenhum bloco concluído", () => {
    const status = deriveLessonProgressStatus({
      blocksTotal: 3,
      blocksCompleted: 0,
      counters: { totalActivities: 0, correctActivities: 0 },
    });
    expect(status).toBe("NOT_STARTED");
  });

  it("deriveLessonProgressStatus: IN_PROGRESS com parte dos blocos concluídos", () => {
    const status = deriveLessonProgressStatus({
      blocksTotal: 3,
      blocksCompleted: 1,
      counters: { totalActivities: 0, correctActivities: 0 },
    });
    expect(status).toBe("IN_PROGRESS");
  });

  it("deriveLessonProgressStatus: COMPLETED com todos os blocos e sem atividade avaliativa (mastery impossível de medir)", () => {
    const status = deriveLessonProgressStatus({
      blocksTotal: 2,
      blocksCompleted: 2,
      counters: { totalActivities: 0, correctActivities: 0 },
    });
    expect(status).toBe("COMPLETED");
  });

  it("deriveLessonProgressStatus: COMPLETED com todos os blocos mas aproveitamento abaixo do limiar", () => {
    const status = deriveLessonProgressStatus({
      blocksTotal: 2,
      blocksCompleted: 2,
      counters: { totalActivities: 4, correctActivities: 2 }, // 50% < LESSON_MASTERY_THRESHOLD (80)
    });
    expect(status).toBe("COMPLETED");
  });

  it("deriveLessonProgressStatus: MASTERED com todos os blocos e aproveitamento >= limiar", () => {
    const status = deriveLessonProgressStatus({
      blocksTotal: 2,
      blocksCompleted: 2,
      counters: { totalActivities: 5, correctActivities: 4 }, // 80% >= LESSON_MASTERY_THRESHOLD (80)
    });
    expect(status).toBe("MASTERED");
  });

  it("computeLessonProgressSummary: currentBlock é o primeiro pendente, na ordem", () => {
    const summary = computeLessonProgressSummary({
      blocks: [
        { id: "b0", order: 0 },
        { id: "b1", order: 1 },
        { id: "b2", order: 2 },
      ],
      completedBlockIds: new Set(["b0", "b1"]),
      counters: { totalActivities: 0, correctActivities: 0 },
    });
    expect(summary.currentBlock).toEqual({ id: "b2", order: 2 });
    expect(summary.blocksCompleted).toBe(2);
    expect(summary.blocksTotal).toBe(3);
    expect(summary.percentage).toBeCloseTo(66.67, 1);
    expect(summary.status).toBe("IN_PROGRESS");
  });

  it("computeLessonProgressSummary: currentBlock é null quando tudo concluído", () => {
    const summary = computeLessonProgressSummary({
      blocks: [{ id: "b0", order: 0 }],
      completedBlockIds: new Set(["b0"]),
      counters: { totalActivities: 0, correctActivities: 0 },
    });
    expect(summary.currentBlock).toBeNull();
    expect(summary.percentage).toBe(100);
    expect(summary.status).toBe("COMPLETED");
  });

  it("computeLessonProgressSummary: 0% sem nenhum bloco concluído", () => {
    const summary = computeLessonProgressSummary({
      blocks: [
        { id: "b0", order: 0 },
        { id: "b1", order: 1 },
      ],
      completedBlockIds: new Set(),
      counters: { totalActivities: 0, correctActivities: 0 },
    });
    expect(summary.percentage).toBe(0);
    expect(summary.currentBlock).toEqual({ id: "b0", order: 0 });
    expect(summary.status).toBe("NOT_STARTED");
  });
});
