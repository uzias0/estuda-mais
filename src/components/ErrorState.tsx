/**
 * Estado de erro amigável (Módulo 11, seção 40) — NUNCA recebe/mostra
 * stack trace, SQL, segredo, token ou qualquer detalhe interno; só uma
 * mensagem curta e uma ação de tentar de novo.
 */
export function ErrorState({
  message = "Não foi possível carregar seus dados agora.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state card" role="alert">
      <p style={{ fontWeight: 700 }}>{message}</p>
      <p style={{ marginTop: 6, color: "var(--color-text-muted)" }}>
        Tente novamente em alguns instantes.
      </p>
      {onRetry ? (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: 16 }}
          onClick={onRetry}
        >
          Tentar de novo
        </button>
      ) : null}
    </div>
  );
}
