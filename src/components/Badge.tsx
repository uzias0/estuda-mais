export type BadgeTone = "success" | "danger" | "warning" | "brand" | "muted";

export function Badge({
  tone = "muted",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
