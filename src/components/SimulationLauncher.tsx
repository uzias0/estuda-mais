"use client";

/**
 * Início do simulado (Módulo 11, seção 21) — só chama `startSimulation`
 * (cria uma `SimulationAttempt` real, Módulo 6) quando o aluno clica em
 * "Começar", nunca automaticamente ao carregar a página; a página só lê
 * dados (seção 28: "não criar registro simplesmente porque o aluno abriu"
 * — visitar/pré-carregar a rota nunca deve, por si só, criar uma tentativa).
 */
import { useState } from "react";
import { startSimulationAction } from "@/server/actions/simulation-actions";
import { SimulationRunner } from "./SimulationRunner";
import { ErrorState } from "./ErrorState";
import type { PublicQuestionViewLike } from "./QuestionRenderer";

export function SimulationLauncher({
  simulationId,
  title,
  questionCount,
}: {
  simulationId: string;
  title: string;
  questionCount: number;
}) {
  const [started, setStarted] = useState<{
    attemptId: string;
    questions: PublicQuestionViewLike[];
  } | null>(null);
  const [error, setError] = useState(false);

  async function handleStart() {
    try {
      const result = await startSimulationAction(simulationId);
      setStarted({ attemptId: result.attemptId, questions: result.questions });
    } catch {
      setError(true);
    }
  }

  if (error) {
    return <ErrorState message="Não foi possível iniciar este simulado." onRetry={handleStart} />;
  }

  if (started) {
    return (
      <SimulationRunner
        attemptId={started.attemptId}
        simulationId={simulationId}
        questions={started.questions}
      />
    );
  }

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>{title}</h1>
      <p style={{ color: "var(--color-text-muted)", marginTop: 8 }}>
        {questionCount} questão(ões).
      </p>
      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 16 }}
        onClick={handleStart}
      >
        Começar simulado
      </button>
    </div>
  );
}
