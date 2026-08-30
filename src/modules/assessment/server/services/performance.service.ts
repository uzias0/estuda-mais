/**
 * Desempenho do usuário em tentativas de questão (Módulo 3, seção 20) — só
 * serviços/estruturas de domínio, nenhuma UI/dashboard. Determinístico,
 * calculado a partir de `QuestionAttempt` já gravados.
 *
 * `simAttemptId` adicionado no Módulo 6 (docs/MODULO-6.md, "Decisões
 * técnicas") — o desempenho por disciplina/conceito/dificuldade/tipo de UMA
 * tentativa de simulado é exatamente este cálculo, só filtrado por
 * `simAttemptId` em vez de `userId` isolado; reaproveitar evita duplicar a
 * lógica de bucketing em `simulation-performance.service.ts`.
 */
import { prisma } from "@/server/db";
import { KnowledgeEntityType, type AttemptContext } from "@/generated/prisma/enums";

type AttemptContextValue = (typeof AttemptContext)[keyof typeof AttemptContext];

interface Summary {
  total: number;
  correct: number;
  incorrect: number;
  accuracyPercentage: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function summarize(items: { isCorrect: boolean }[]): Summary {
  const total = items.length;
  const correct = items.filter((i) => i.isCorrect).length;
  return {
    total,
    correct,
    incorrect: total - correct,
    accuracyPercentage: total === 0 ? 0 : round2((correct / total) * 100),
  };
}

function groupBy<T, K extends string>(items: T[], keyOf: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }
  return map;
}

function summarizeGroups<T extends { isCorrect: boolean }, K extends string>(
  map: Map<K, T[]>,
): Record<string, Summary> {
  const result: Record<string, Summary> = {};
  for (const [key, items] of map) result[key] = summarize(items);
  return result;
}

export interface PerformanceReport {
  totalAnswered: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPercentage: number;
  averageTimeMs: number;
  byDifficulty: Record<string, Summary>;
  byType: Record<string, Summary>;
  byConcept: Record<string, Summary>;
  byDiscipline: Record<string, Summary>;
}

export async function computePerformance(
  userId: string,
  filters?: { context?: AttemptContextValue; simAttemptId?: string },
): Promise<PerformanceReport> {
  const attempts = await prisma.questionAttempt.findMany({
    where: { userId, context: filters?.context, simAttemptId: filters?.simAttemptId },
    include: { question: { include: { knowledgeTags: true } } },
  });

  const overall = summarize(attempts);
  const totalTimeMs = attempts.reduce((sum, a) => sum + a.timeSpentMs, 0);

  const byDifficulty = summarizeGroups(groupBy(attempts, (a) => a.question.difficulty));
  const byType = summarizeGroups(groupBy(attempts, (a) => a.question.type));

  // Uma tentativa pode contar para vários conceitos/disciplinas (a questão
  // pode ter mais de uma QuestionKnowledgeTag do mesmo tipo).
  const conceptBuckets = new Map<string, typeof attempts>();
  const disciplineBuckets = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    for (const tag of attempt.question.knowledgeTags) {
      if (tag.entityType === KnowledgeEntityType.CONCEPT) {
        const bucket = conceptBuckets.get(tag.entityId) ?? [];
        bucket.push(attempt);
        conceptBuckets.set(tag.entityId, bucket);
      }
      if (tag.entityType === KnowledgeEntityType.DISCIPLINE) {
        const bucket = disciplineBuckets.get(tag.entityId) ?? [];
        bucket.push(attempt);
        disciplineBuckets.set(tag.entityId, bucket);
      }
    }
  }

  return {
    totalAnswered: overall.total,
    correctCount: overall.correct,
    incorrectCount: overall.incorrect,
    accuracyPercentage: overall.accuracyPercentage,
    averageTimeMs: overall.total === 0 ? 0 : round2(totalTimeMs / overall.total),
    byDifficulty,
    byType,
    byConcept: summarizeGroups(conceptBuckets),
    byDiscipline: summarizeGroups(disciplineBuckets),
  };
}
