/**
 * Recomendações determinísticas (Módulo 6, seções 19/20/23) — nenhuma IA,
 * toda recomendação é derivada de `computePerformance` (Módulo 3) sobre o
 * histórico real de simulados do usuário, com justificativa textual
 * explícita. Aponta para entidades EXISTENTES (Concept/Discipline/
 * ReviewItem) — nunca cria trilha/conteúdo novo (seção 20).
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { AttemptContext, Difficulty } from "@/generated/prisma/enums";
import { computePerformance } from "@/modules/assessment/server/services/performance.service";
import { getPedagogicalContextForConcepts } from "@/modules/pedagogy/server/services/pedagogy-query.service";
import { WEAK_CONCEPT_THRESHOLD, STRONG_CONCEPT_THRESHOLD } from "@/config/diagnostic";
import {
  CRITICAL_GAP_MAX_PERCENTAGE,
  MIN_SAMPLE_SIZE_FOR_RECOMMENDATION,
  NEXT_SIMULATION_DEFAULT_COUNT,
  NEXT_SIMULATION_PRIMARY_SHARE,
  NEXT_SIMULATION_SECONDARY_SHARE,
} from "@/config/simulation";
import { assertOwnSimulationDataOrCurator } from "./privacy";

type DifficultyValue = (typeof Difficulty)[keyof typeof Difficulty];

export interface GapRecommendation {
  conceptId: string;
  percentage: number;
  totalAnswered: number;
  reason: string;
  reviewItemId: string | null;
  lessonIds: string[];
  stageIds: string[];
  unitIds: string[];
  trackIds: string[];
}

export interface StudyRecommendation {
  criticalGaps: GapRecommendation[];
  moderateGaps: GapRecommendation[];
  strengths: GapRecommendation[];
}

/**
 * Lacunas críticas/moderadas e pontos fortes (seção 19) — reaproveita
 * integralmente as faixas do Módulo 3 (`WEAK_CONCEPT_THRESHOLD`,
 * `STRONG_CONCEPT_THRESHOLD`) e `CRITICAL_GAP_MAX_PERCENTAGE` (a mesma
 * faixa "INICIANTE" do Módulo 3, ver `config/simulation.ts`).
 */
export async function getStudyRecommendation(
  actor: Actor,
  targetUserId: string = actor.userId,
): Promise<StudyRecommendation> {
  assertOwnSimulationDataOrCurator(actor, targetUserId);

  const performance = await computePerformance(targetUserId, {
    context: AttemptContext.SIMULATION,
  });

  const criticalGaps: GapRecommendation[] = [];
  const moderateGaps: GapRecommendation[] = [];
  const strengths: GapRecommendation[] = [];

  const entries = Object.entries(performance.byConcept).filter(
    ([, s]) => s.total >= MIN_SAMPLE_SIZE_FOR_RECOMMENDATION,
  );

  for (const [conceptId, summary] of entries) {
    const pct = summary.accuracyPercentage;
    // Aponta para um ReviewItem existente (seção 20) — tanto o scope
    // CONCEPT (revisão do conceito em si) quanto scope QUESTION de uma
    // questão tagueada a este conceito (o que `finishSimulation` cria ao
    // errar, Módulo 5/seção 21) contam como "já em revisão".
    const reviewItem = await prisma.reviewItem.findFirst({
      where: {
        userId: targetUserId,
        OR: [
          { scope: "CONCEPT", conceptId },
          {
            scope: "QUESTION",
            question: { knowledgeTags: { some: { entityType: "CONCEPT", entityId: conceptId } } },
          },
        ],
      },
      select: { id: true },
    });
    const context = await getPedagogicalContextForConcepts([conceptId]);
    const entry: GapRecommendation = {
      conceptId,
      percentage: pct,
      totalAnswered: summary.total,
      reason: `${pct}% de acerto em ${summary.total} questão(ões).`,
      reviewItemId: reviewItem?.id ?? null,
      lessonIds: context.lessonIds,
      stageIds: context.stageIds,
      unitIds: context.unitIds,
      trackIds: context.trackIds,
    };

    if (pct <= CRITICAL_GAP_MAX_PERCENTAGE) criticalGaps.push(entry);
    else if (pct <= WEAK_CONCEPT_THRESHOLD) moderateGaps.push(entry);
    else if (pct >= STRONG_CONCEPT_THRESHOLD) strengths.push(entry);
  }

  criticalGaps.sort((a, b) => a.percentage - b.percentage);
  moderateGaps.sort((a, b) => a.percentage - b.percentage);
  strengths.sort((a, b) => b.percentage - a.percentage);

  return { criticalGaps, moderateGaps, strengths };
}

export interface NextSimulationRecommendation {
  count: number;
  difficulty: DifficultyValue;
  primaryDisciplineId: string | null;
  primaryShare: number;
  secondaryShare: number;
  reason: string;
}

function difficultyForPercentage(pct: number): DifficultyValue {
  if (pct <= WEAK_CONCEPT_THRESHOLD) return Difficulty.BASICO;
  if (pct < STRONG_CONCEPT_THRESHOLD) return Difficulty.INTERMEDIARIO;
  return Difficulty.AVANCADO;
}

/**
 * "O que devo fazer no próximo simulado?" (seção 23) — foca na disciplina
 * de pior desempenho com amostra suficiente; sem dados suficientes, devolve
 * uma recomendação neutra (simulado geral), nunca um erro.
 */
export async function getNextSimulationRecommendation(
  actor: Actor,
  targetUserId: string = actor.userId,
): Promise<NextSimulationRecommendation> {
  assertOwnSimulationDataOrCurator(actor, targetUserId);

  const performance = await computePerformance(targetUserId, {
    context: AttemptContext.SIMULATION,
  });
  const disciplineEntries = Object.entries(performance.byDiscipline).filter(
    ([, s]) => s.total >= MIN_SAMPLE_SIZE_FOR_RECOMMENDATION,
  );

  if (disciplineEntries.length === 0) {
    return {
      count: NEXT_SIMULATION_DEFAULT_COUNT,
      difficulty: Difficulty.INTERMEDIARIO,
      primaryDisciplineId: null,
      primaryShare: NEXT_SIMULATION_PRIMARY_SHARE,
      secondaryShare: NEXT_SIMULATION_SECONDARY_SHARE,
      reason: "Sem histórico suficiente de simulados ainda — comece com um simulado geral.",
    };
  }

  const [weakestId, weakest] = disciplineEntries.sort(
    (a, b) => a[1].accuracyPercentage - b[1].accuracyPercentage,
  )[0];

  return {
    count: NEXT_SIMULATION_DEFAULT_COUNT,
    difficulty: difficultyForPercentage(weakest.accuracyPercentage),
    primaryDisciplineId: weakestId,
    primaryShare: NEXT_SIMULATION_PRIMARY_SHARE,
    secondaryShare: NEXT_SIMULATION_SECONDARY_SHARE,
    reason: `Desempenho mais baixo em ${weakest.total} questão(ões) desta disciplina: ${weakest.accuracyPercentage}% de acerto.`,
  };
}
