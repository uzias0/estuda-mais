"use client";

/**
 * Botão de manutenção (ver `admin-maintenance-actions.ts`) — mesmo padrão
 * de `RunAnswerLengthBiasFixButton.tsx`: só chama a Server Action e
 * exibe o resultado, nenhuma lógica de negócio aqui.
 */
import { useState } from "react";
import {
  runPersonPortraitsFixAction,
  type RunPersonPortraitsFixResult,
} from "@/server/actions/admin-maintenance-actions";

export function RunPersonPortraitsFixButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RunPersonPortraitsFixResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const outcome = await runPersonPortraitsFixAction();
      setResult(outcome);
    } catch {
      setError("Não foi possível aplicar os retratos — tente de novo em alguns instantes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <button type="button" className="btn btn-primary" onClick={handleClick} disabled={pending}>
        {pending ? "Aplicando…" : "Aplicar retratos agora"}
      </button>
      {error ? (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="card stack" role="status">
          <p style={{ fontWeight: 700 }}>
            {result.updated} pessoa(s) atualizada(s) agora
            {result.updated === 0 ? " — já estava tudo em dia." : "."}
          </p>
          <div className="stack" style={{ gap: 4 }}>
            {result.results.map((r) => (
              <p key={r.slug} style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                {r.status === "set"
                  ? "✓ retrato definido"
                  : r.status === "not-found"
                    ? "⚠ não encontrada"
                    : "— já atualizada"}
                {": "}
                {r.name}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
