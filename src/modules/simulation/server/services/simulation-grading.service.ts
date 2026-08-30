/**
 * Cálculo do resultado de uma tentativa de simulado (Módulo 6, seção 13) —
 * determinístico, sempre recalculado a partir dos `QuestionAttempt`
 * gravados (mesmo princípio do diagnóstico/revisão: nunca um valor
 * armazenado à parte é a fonte da verdade, mesmo que `SimulationAttempt.
 * score/correctCount/totalCount` guardem uma cópia ao finalizar — mesmo
 * padrão de denormalização de `Question.correctRate`/`answerCount`).
 */
import { prisma } from "@/server/db";
import { classifyPerformance } from "@/config/simulation";

export interface SimulationResult {
  /** Quantidade de questões RESPONDIDAS nesta tentativa (seção 13 — "total: 40" no exemplo é corretas+erradas). */
  total: number;
  correct: number;
  incorrect: number;
  percentage: number;
  classification: { level: string; label: string };
  /** Quantas questões o simulado tem no total (pode ser > `total` se o aluno não respondeu tudo). */
  assignedCount: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function calculateSimulationResult(attemptId: string): Promise<SimulationResult> {
  const [attempt, questionAttempts] = await Promise.all([
    prisma.simulationAttempt.findUniqueOrThrow({ where: { id: attemptId } }),
    prisma.questionAttempt.findMany({
      where: { simAttemptId: attemptId },
      select: { isCorrect: true },
    }),
  ]);

  const total = questionAttempts.length;
  const correct = questionAttempts.filter((a) => a.isCorrect).length;
  const incorrect = total - correct;
  const percentage = total === 0 ? 0 : round2((correct / total) * 100);

  return {
    total,
    correct,
    incorrect,
    percentage,
    classification: classifyPerformance(percentage),
    assignedCount: attempt.totalCount,
  };
}
