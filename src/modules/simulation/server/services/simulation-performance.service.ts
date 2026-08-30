/**
 * Desempenho detalhado (Módulo 6, seções 13-17): breakdown por disciplina/
 * conceito/dificuldade/tipo (reaproveita `computePerformance` do Módulo 3),
 * mais prova/área pedagógica (dimensões novas deste módulo) e evolução
 * histórica entre simulados. Tudo determinístico, sem IA.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { KnowledgeEntityType } from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { computePerformance } from "@/modules/assessment/server/services/performance.service";
import { getPedagogicalContextForConcepts } from "@/modules/pedagogy/server/services/pedagogy-query.service";
import { EVOLUTION_TREND_EPSILON } from "@/config/simulation";
import { assertOwnSimulationDataOrCurator } from "./privacy";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Breakdown completo de UMA tentativa: disciplina/conceito/dificuldade/tipo
 * (reaproveitados do Módulo 3, filtrando por `simAttemptId`) + prova/área
 * pedagógica (novos, seção 13/14).
 */
export async function getSimulationPerformanceBreakdown(actor: Actor, attemptId: string) {
  const attempt = await prisma.simulationAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new NotFoundError(`SimulationAttempt "${attemptId}" não encontrado.`);
  assertOwnSimulationDataOrCurator(actor, attempt.userId);

  const base = await computePerformance(attempt.userId, { simAttemptId: attemptId });

  const questionAttempts = await prisma.questionAttempt.findMany({
    where: { simAttemptId: attemptId },
    include: { question: { include: { knowledgeTags: true, examEdition: true } } },
  });

  const byExamEdition: Record<
    string,
    { total: number; correct: number; incorrect: number; accuracyPercentage: number }
  > = {};
  for (const qa of questionAttempts) {
    const key = qa.question.examEdition?.name ?? "SEM_PROVA";
    const bucket = byExamEdition[key] ?? {
      total: 0,
      correct: 0,
      incorrect: 0,
      accuracyPercentage: 0,
    };
    bucket.total += 1;
    if (qa.isCorrect) bucket.correct += 1;
    bucket.incorrect = bucket.total - bucket.correct;
    bucket.accuracyPercentage = round2((bucket.correct / bucket.total) * 100);
    byExamEdition[key] = bucket;
  }

  const trackBuckets = new Map<string, { total: number; correct: number }>();
  for (const qa of questionAttempts) {
    const conceptIds = qa.question.knowledgeTags
      .filter((t) => t.entityType === KnowledgeEntityType.CONCEPT)
      .map((t) => t.entityId);
    if (conceptIds.length === 0) continue;
    const context = await getPedagogicalContextForConcepts(conceptIds, qa.questionId);
    for (const trackId of context.trackIds) {
      const bucket = trackBuckets.get(trackId) ?? { total: 0, correct: 0 };
      bucket.total += 1;
      if (qa.isCorrect) bucket.correct += 1;
      trackBuckets.set(trackId, bucket);
    }
  }
  const byPedagogyTrack: Record<
    string,
    { total: number; correct: number; incorrect: number; accuracyPercentage: number }
  > = {};
  for (const [trackId, bucket] of trackBuckets) {
    byPedagogyTrack[trackId] = {
      total: bucket.total,
      correct: bucket.correct,
      incorrect: bucket.total - bucket.correct,
      accuracyPercentage: round2((bucket.correct / bucket.total) * 100),
    };
  }

  return { ...base, byExamEdition, byPedagogyTrack };
}

export type EvolutionTrend = "MELHORANDO" | "PIORANDO" | "ESTAVEL" | "SEM_DADOS";

export interface SimulationEvolution {
  history: Array<{
    attemptId: string;
    simulationId: string;
    finishedAt: Date | null;
    percentage: number;
  }>;
  first: number | null;
  last: number | null;
  best: number | null;
  average: number | null;
  variation: number | null;
  trend: EvolutionTrend;
}

function computeTrend(percentages: number[]): EvolutionTrend {
  if (percentages.length < 2) return "SEM_DADOS";
  const diff = percentages[percentages.length - 1] - percentages[0];
  if (diff > EVOLUTION_TREND_EPSILON) return "MELHORANDO";
  if (diff < -EVOLUTION_TREND_EPSILON) return "PIORANDO";
  return "ESTAVEL";
}

/**
 * Evolução ao longo do tempo (seção 17) — primeiro/último/melhor
 * resultado, média, variação e tendência, sempre a partir de
 * `SimulationAttempt.score` das tentativas FINALIZADAS do usuário, em
 * ordem cronológica (`startedAt` asc).
 */
export async function getSimulationEvolution(
  actor: Actor,
  targetUserId: string = actor.userId,
  params?: { take?: number },
): Promise<SimulationEvolution> {
  assertOwnSimulationDataOrCurator(actor, targetUserId);

  const attempts = await prisma.simulationAttempt.findMany({
    where: { userId: targetUserId, finishedAt: { not: null } },
    orderBy: { startedAt: "asc" },
    take: params?.take ?? 100,
  });

  const history = attempts.map((a) => ({
    attemptId: a.id,
    simulationId: a.simulationId,
    finishedAt: a.finishedAt,
    percentage: a.score ?? 0,
  }));
  const percentages = history.map((h) => h.percentage);

  if (percentages.length === 0) {
    return {
      history: [],
      first: null,
      last: null,
      best: null,
      average: null,
      variation: null,
      trend: "SEM_DADOS",
    };
  }

  const first = percentages[0];
  const last = percentages[percentages.length - 1];
  const best = Math.max(...percentages);
  const average = round2(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);

  return {
    history,
    first,
    last,
    best,
    average,
    variation: round2(last - first),
    trend: computeTrend(percentages),
  };
}
