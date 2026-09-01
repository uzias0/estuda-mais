export type BadgeTone = "success" | "danger" | "warning" | "brand" | "muted";

export function Badge({
  tone = "muted",
  children,
  style,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  /** Só para ajustes de posicionamento pontuais (ex.: selo sobreposto a um cartão) — nunca cor/fonte, que já vêm de `.badge-*`. */
  style?: React.CSSProperties;
}) {
  return (
    <span className={`badge badge-${tone}`} style={style}>
      {children}
    </span>
  );
}
