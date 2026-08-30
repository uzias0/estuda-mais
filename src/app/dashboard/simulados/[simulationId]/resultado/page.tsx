/**
 * Resultado do simulado (Módulo 11, seção 22) — sempre os dados reais do
 * Módulo 6 (`calculateSimulationResult`/`getSimulationPerformanceBreakdown`/
 * `getSimulationEvolution`/`getNextSimulationRecommendation`); nada
 * recalculado aqui.
 */
import Link from "next/link";
import { requireSessionActor } from "@/server/auth/session";
import { calculateSimulationResult } from "@/modules/simulation/server/services/simulation-grading.service";
import {
  getSimulationPerformanceBreakdown,
  getSimulationEvolution,
} from "@/modules/simulation/server/services/simulation-performance.service";
import { getNextSimulationRecommendation } from "@/modules/simulation/server/services/simulation-recommendation.service";
import { formatPercentage, formatInteger } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";
import { CharacterCelebration } from "@/components/characters/CharacterCelebration";
import { NEUTRAL_CHARACTER } from "@/config/characters";

export default async function SimulationResultPage({
  searchParams,
}: PageProps<"/dashboard/simulados/[simulationId]/resultado">) {
  const params = await searchParams;
  const attemptId = typeof params.attemptId === "string" ? params.attemptId : null;
  if (!attemptId) {
    return (
      <div className="page-container">
        <EmptyState title="Nenhum resultado de simulado para mostrar." />
      </div>
    );
  }

  const actor = await requireSessionActor();
  const [result, breakdown, evolution, nextSimulation] = await Promise.all([
    calculateSimulationResult(attemptId),
    getSimulationPerformanceBreakdown(actor, attemptId),
    getSimulationEvolution(actor, actor.userId),
    getNextSimulationRecommendation(actor, actor.userId),
  ]);

  const strengths = Object.entries(breakdown.byDiscipline).filter(
    ([, s]) => s.accuracyPercentage >= 61,
  );
  const attentionPoints = Object.entries(breakdown.byDiscipline).filter(
    ([, s]) => s.accuracyPercentage <= 40,
  );

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Resultado</h1>

      <CharacterCelebration
        character={NEUTRAL_CHARACTER}
        title="Simulado concluído!"
        subtitle={`${formatInteger(result.correct)} / ${formatInteger(result.total)} — ${formatPercentage(result.percentage)} (${result.classification.label})`}
      />

      <div className="grid-cards">
        <div className="card card--tight">
          <p className="card-title">Pontos fortes</p>
          {strengths.length === 0 ? (
            <p style={{ marginTop: 8, color: "var(--color-text-muted)" }}>
              Sem dados suficientes ainda.
            </p>
          ) : (
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {strengths.map(([id, s]) => (
                <li key={id}>{formatPercentage(s.accuracyPercentage)}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card card--tight">
          <p className="card-title">Pontos de atenção</p>
          {attentionPoints.length === 0 ? (
            <p style={{ marginTop: 8, color: "var(--color-text-muted)" }}>Nenhum identificado.</p>
          ) : (
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {attentionPoints.map(([id, s]) => (
                <li key={id}>{formatPercentage(s.accuracyPercentage)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <p className="card-title">Evolução</p>
        <p style={{ marginTop: 8 }}>
          Tendência: <strong>{evolution.trend}</strong>
          {evolution.average !== null ? ` — média de ${formatPercentage(evolution.average)}` : ""}
        </p>
        {evolution.best !== null ? (
          <div style={{ marginTop: 10 }}>
            <ProgressBar
              value={evolution.best}
              label={`Melhor resultado: ${formatPercentage(evolution.best)}`}
            />
          </div>
        ) : null}
      </div>

      <div className="card">
        <p className="card-title">Próximo simulado recomendado</p>
        <p style={{ marginTop: 8 }}>{nextSimulation.reason}</p>
      </div>

      <Link
        href="/dashboard/simulados"
        className="btn btn-primary"
        style={{ alignSelf: "flex-start" }}
      >
        Ver mais simulados
      </Link>
    </div>
  );
}
