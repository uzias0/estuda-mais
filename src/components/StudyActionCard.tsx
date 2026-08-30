/**
 * Cartão de uma ação de estudo (Módulo 11, seções 7/14/44) — Server
 * Component assíncrono: resolve o título/rota de exibição
 * (`resolveStudyActionDisplay`/`resolveStudyActionHref`) e mostra
 * `reason`/`priority` exatamente como o Módulo 10 devolveu, sem recalcular
 * nada.
 */
import Link from "next/link";
import type { NextStudyAction } from "@/modules/study-engine/types/next-study-action";
import { resolveStudyActionDisplay } from "@/lib/study-action-display";
import { resolveStudyActionHref, studyActionButtonLabel } from "@/lib/study-action-links";
import { studyActionTypeLabel } from "@/lib/format";
import { Badge } from "./Badge";

export async function StudyActionCard({
  action,
  rank,
  emphasized = false,
}: {
  action: NextStudyAction;
  rank?: number;
  emphasized?: boolean;
}) {
  const display = await resolveStudyActionDisplay(action);
  const href = resolveStudyActionHref(action);
  const buttonLabel = studyActionButtonLabel(action);

  return (
    <div className={emphasized ? "card card-hero fade-in-up" : "card card--tight"}>
      <div className="row-wrap" style={{ justifyContent: "space-between" }}>
        <Badge tone="brand">
          {rank ? `${rank}. ` : ""}
          {studyActionTypeLabel(action.type)}
        </Badge>
      </div>
      <h3 style={{ marginTop: 12, fontSize: emphasized ? "1.4rem" : "1.05rem" }}>
        {display.title}
      </h3>
      {display.subtitle ? (
        <p style={{ color: "var(--color-text-muted)", marginTop: 4 }}>{display.subtitle}</p>
      ) : null}
      <p style={{ color: "var(--color-text-muted)", marginTop: 10, fontSize: "0.9rem" }}>
        {action.reason}
      </p>
      <Link
        href={href}
        className={`btn ${emphasized ? "btn-primary" : "btn-secondary"} btn-block`}
        style={{ marginTop: 16 }}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}
