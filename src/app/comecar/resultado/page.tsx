/**
 * Resultado do diagnóstico ANÔNIMO (fase "diagnóstico antes do
 * cadastro") — mesmo padrão de `/dashboard/diagnostico/resultado`, só
 * trocando a origem do `Actor` (cookie anônimo, nunca cria um novo aqui)
 * e o CTA final (criar conta, não "ir para o plano de estudo" — a conta
 * ainda não existe). Termina com "crie sua conta e continue agora mesmo
 * grátis", pedido explícito do usuário.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";
import { getAnonymousDiagnosticResultAction } from "@/server/actions/anonymous-diagnostic-actions";
import { resolveConceptNames } from "@/lib/resolve-names";
import { formatPercentage } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";
import { CharacterMessage } from "@/components/characters/CharacterMessage";
import { NEUTRAL_CHARACTER } from "@/config/characters";

export default async function ComecarResultadoPage({
  searchParams,
}: PageProps<"/comecar/resultado">) {
  const actor = await getSessionActor();
  if (actor) redirect("/dashboard");

  const params = await searchParams;
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : null;

  const result = sessionId ? await getAnonymousDiagnosticResultAction(sessionId) : null;

  if (!result) {
    return (
      <div className="page-container">
        <EmptyState
          title="Nenhum diagnóstico para mostrar."
          description="Faça o diagnóstico inicial para ver seu resultado aqui."
          action={
            <Link href="/comecar" className="btn btn-primary">
              Ir para o diagnóstico
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
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Seu resultado</h1>

      <CharacterMessage
        character={NEUTRAL_CHARACTER}
        expression="happy"
        message="Terminamos! Aqui está o seu ponto de partida — crie sua conta pra gente continuar juntos."
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

      <Link href="/signup" className="btn btn-primary btn-block" style={{ fontSize: "1.05rem" }}>
        Criar conta e continuar agora mesmo — grátis
      </Link>
    </div>
  );
}
