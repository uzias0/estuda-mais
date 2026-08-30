/** Estado vazio padrão (Módulo 11, seção 41) — toda lista precisa de um. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state card">
      <p style={{ fontWeight: 700, color: "var(--color-text)" }}>{title}</p>
      {description ? <p style={{ marginTop: 6 }}>{description}</p> : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}
