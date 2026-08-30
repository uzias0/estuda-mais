/**
 * Barra de progresso puramente visual (Módulo 11, seções 16/34/36) — o
 * percentual É SEMPRE recebido já calculado pelo servidor via `value`
 * (0–100); este componente nunca deriva/recalcula nada (seção 4).
 */
export function ProgressBar({
  value,
  label,
  tone = "brand",
}: {
  value: number;
  label?: string;
  tone?: "brand" | "success";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label ? (
        <div className="row-wrap" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{label}</span>
        </div>
      ) : null}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={tone === "success" ? "progress-fill progress-fill--success" : "progress-fill"}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
