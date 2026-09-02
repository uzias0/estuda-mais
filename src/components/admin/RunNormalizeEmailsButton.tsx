"use client";

/**
 * Botão de manutenção (ver `admin-maintenance-actions.ts`) — mesmo
 * padrão de `RunAnswerLengthBiasFixButton.tsx`/
 * `RunPersonPortraitsFixButton.tsx`: só chama a Server Action e exibe o
 * resultado, nenhuma lógica de negócio aqui.
 */
import { useState } from "react";
import {
  runNormalizeEmailsAction,
  type RunNormalizeEmailsResult,
} from "@/server/actions/admin-maintenance-actions";

export function RunNormalizeEmailsButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RunNormalizeEmailsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const outcome = await runNormalizeEmailsAction();
      setResult(outcome);
    } catch {
      setError("Não foi possível normalizar os e-mails — tente de novo em alguns instantes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <button type="button" className="btn btn-primary" onClick={handleClick} disabled={pending}>
        {pending ? "Corrigindo…" : "Normalizar e-mails agora"}
      </button>
      {error ? (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="card stack" role="status">
          <p style={{ fontWeight: 700 }}>
            {result.normalized} conta(s) corrigida(s) agora
            {result.normalized === 0 ? " — já estava tudo em minúsculas." : "."}
          </p>
          <div className="stack" style={{ gap: 4 }}>
            {result.results
              .filter((r) => r.status !== "already-lowercase")
              .map((r) => (
                <p key={r.userId} style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  {r.status === "normalized" ? "✓ corrigido" : "⚠ pulado (colisão real)"}
                  {": "}
                  {r.originalEmail}
                </p>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
