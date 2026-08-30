/**
 * Resultado do diagnóstico (Módulo 11, seção 13) — sempre os dados reais de
 * `getDiagnosticResult` (Módulo 3); nada é recalculado aqui.
 */
import Link from "next/link";
import { requireSessionActor } from "@/server/auth/session";
import { getDiagnosticResult } from "@/modules/assessment/server/services/diagnostic.service";
import { resolveConceptNames } from "@/lib/resolve-names";
import { formatPercentage } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";
import { CharacterMessage } from "@/components/characters/CharacterMessage";
import { NEUTRAL_CHARACTER } from "@/config/characters";

export default async function DiagnosticoResultadoPage({
  searchParams,
}: PageProps<"/dashboard/diagnostico/resultado">) {
  const params = await searchParams;
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : null;

  if (!sessionId) {
    return (
      <div className="page-container">
        <EmptyState
          title="Nenhum diagnóstico para mostrar."
          description="Faça o diagnóstico inicial para ver seu resultado aqui."
          action={
            <Link href="/dashboard/diagnostico" className="btn btn-primary">
              Ir para o diagnóstico
            </Link>
          }
        />
      </div>
    );
  }

  const actor = await requireSessionActor();
  let result: Awaited<ReturnType<typeof getDiagnosticResult>>;
  try {
    result = await getDiagnosticResult(actor, sessionId);
  } catch {
    return (
      <div className="page-container">
        <EmptyState
          title="Não foi possível encontrar este diagnóstico."
          action={
            <Link href="/dashboard/diagnostico" className="btn btn-primary">
              Fazer o diagnóstico
            </Link>
          }
        />
      </div>
    );
  }

  const conceptNames = await resolveConceptNames([
    ...result.strongConceptIds,
    ...result.weakConceptIds,
  ]);
  const startingLessonConceptId = result.recommendation.startingConceptIds[0];

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Seu nível atual</h1>

      <CharacterMessage
        character={NEUTRAL_CHARACTER}
        expression="happy"
        message="Terminamos! Aqui está o seu ponto de partida — vamos estudar a partir daqui."
      />

      <div className="card">
        <ProgressBar value={result.percentage} label={formatPercentage(result.percentage)} />
        <p style={{ marginTop: 12, fontSize: "1.1rem", fontWeight: 700 }}>Nível: {result.level}</p>
        <p style={{ color: "var(--color-text-muted)", marginTop: 4 }}>
          {result.correctCount} de {result.questionsAnswered} questão(ões) corretas.
        </p>
      </div>

      <div className="grid-cards">
        <div className="card card--tight">
          <p className="card-title">Conceitos fortes</p>
          {result.strongConceptIds.length === 0 ? (
            <p style={{ marginTop: 8, color: "var(--color-text-muted)" }}>Nenhum ainda.</p>
          ) : (
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {result.strongConceptIds.map((id) => (
                <li key={id}>{conceptNames.get(id) ?? id}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card card--tight">
          <p className="card-title">Conceitos fracos</p>
          {result.weakConceptIds.length === 0 ? (
            <p style={{ marginTop: 8, color: "var(--color-text-muted)" }}>Nenhum identificado.</p>
          ) : (
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {result.weakConceptIds.map((id) => (
                <li key={id}>{conceptNames.get(id) ?? id}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <p className="card-title">Recomendação</p>
        <p style={{ marginTop: 8 }}>{result.recommendation.note}</p>
        {startingLessonConceptId ? (
          <p style={{ marginTop: 8 }}>
            Você pode começar por:{" "}
            <strong>{conceptNames.get(startingLessonConceptId) ?? startingLessonConceptId}</strong>
          </p>
        ) : null}
      </div>

      <Link href="/dashboard" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        Ir para o meu plano de estudo
      </Link>
    </div>
  );
}
