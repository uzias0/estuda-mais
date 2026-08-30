/** Testes puros (sem banco) de formatação de apresentação (Módulo 11). */
import { describe, it, expect } from "vitest";
import {
  formatPercentage,
  formatInteger,
  questionTypeLabel,
  difficultyLabel,
  studyActionTypeLabel,
  lessonProgressStatusLabel,
} from "./format";

describe("format (puro)", () => {
  it("formatPercentage formata em pt-BR com 1 casa decimal", () => {
    expect(formatPercentage(85.5)).toBe("85,5%");
    expect(formatPercentage(100)).toBe("100%");
    expect(formatPercentage(0)).toBe("0%");
  });

  it("formatInteger formata em pt-BR", () => {
    expect(formatInteger(1000)).toBe("1.000");
  });

  it("questionTypeLabel traduz tipos conhecidos e devolve o valor original para desconhecidos", () => {
    expect(questionTypeLabel("MULTIPLE_CHOICE")).toBe("Múltipla escolha");
    expect(questionTypeLabel("ALGO_NOVO")).toBe("ALGO_NOVO");
  });

  it("difficultyLabel trata null/undefined sem quebrar", () => {
    expect(difficultyLabel(null)).toBe("Sem dificuldade definida");
    expect(difficultyLabel("AVANCADO")).toBe("Avançado");
  });

  it("studyActionTypeLabel cobre os 7 tipos de NextStudyAction", () => {
    for (const type of [
      "START_DIAGNOSTIC",
      "LESSON",
      "REVIEW",
      "QUESTION",
      "SIMULATION",
      "LIBRARY",
      "CURRENT_AFFAIR",
    ]) {
      expect(studyActionTypeLabel(type)).not.toBe(type);
    }
  });

  it("lessonProgressStatusLabel cobre os 4 status do Módulo 8", () => {
    expect(lessonProgressStatusLabel("NOT_STARTED")).toBe("Não iniciada");
    expect(lessonProgressStatusLabel("MASTERED")).toBe("Dominada");
  });
});
