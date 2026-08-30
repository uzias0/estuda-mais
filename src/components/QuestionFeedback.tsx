/**
 * Feedback pós-correção (Módulo 11, seção 12) — só apresenta o que o
 * servidor já decidiu (`isCorrect`/`explanation`); nunca decide nada aqui.
 * Explicação só aparece quando existir de verdade (`explanation` real
 * armazenado) — nunca inventada (seção 12: "não inventar explicações").
 */
export function QuestionFeedback({
  isCorrect,
  explanation,
}: {
  isCorrect: boolean;
  explanation?: string | null;
}) {
  return (
    <div className={`card ${isCorrect ? "feedback-correct" : "feedback-incorrect"}`} role="status">
      <p style={{ fontWeight: 800, fontSize: "1.05rem" }}>
        {isCorrect ? "✓ Resposta correta" : "✗ Resposta incorreta"}
      </p>
      <p style={{ marginTop: 6, color: "var(--color-text-muted)" }}>
        {isCorrect ? "Muito bem!" : "Use esta questão como oportunidade de revisar o conceito."}
      </p>
      {explanation ? (
        <p style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
          {explanation}
        </p>
      ) : null}
    </div>
  );
}
