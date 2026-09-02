"use client";

/**
 * Botão de manutenção (ver `admin-maintenance-actions.ts`) — Client
 * Component só porque precisa de estado local para mostrar o resultado
 * depois do clique; nenhuma lógica de correção mora aqui, só chama a
 * Server Action e exibe o que ela devolveu.
 */
import { useState } from "react";
import {
  runAnswerLengthBiasFixAction,
  type RunAnswerLengthBiasFixResult,
} from "@/server/actions/admin-maintenance-actions";

export function RunAnswerLengthBiasFixButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RunAnswerLengthBiasFixResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const outcome = await runAnswerLengthBiasFixAction();
      setResult(outcome);
    } catch {
      setError("Não foi possível rodar a correção — tente de novo em alguns instantes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <button type="button" className="btn btn-primary" onClick={handleClick} disabled={pending}>
        {pending ? "Corrigindo…" : "Rodar correção agora"}
      </button>
      {error ? (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="card stack" role="status">
          <p style={{ fontWeight: 700 }}>
            {result.fixed} questão(ões) corrigida(s) agora
            {result.fixed === 0 ? " — o banco já estava atualizado." : "."}
          </p>
          <div className="stack" style={{ gap: 4 }}>
            {result.results.map((r) => (
              <p
                key={r.questionId}
                style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}
              >
                {r.status === "fixed"
                  ? "✓ corrigida"
                  : r.status === "not-found"
                    ? "⚠ não encontrada"
                    : "— já atualizada"}
                {": "}
                {r.promptPreview}
                {r.promptPreview.length >= 60 ? "…" : ""}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
