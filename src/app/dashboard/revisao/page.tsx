/**
 * Fila de revisão (Módulo 11, seção 18) — consome `getReviewQueue` (Módulo
 * 5) integralmente; a ordem/prioridade já vem calculada pelo servidor,
 * nunca recalculada aqui.
 *
 * `force-dynamic`: evita pré-renderização estática (dados ficariam
 * congelados no momento do build).
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireSessionActor } from "@/server/auth/session";
import { getReviewQueue } from "@/modules/review/server/services/reviewQueue.service";
import { resolveConceptNames } from "@/lib/resolve-names";
import { formatOverdueDuration, reviewStateLabel } from "@/lib/format";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";

export default async function RevisaoPage() {
  const actor = await requireSessionActor();
  const [queue, overdue] = await Promise.all([
    getReviewQueue(actor, actor.userId),
    getReviewQueue(actor, actor.userId, { overdueOnly: true }),
  ]);

  if (queue.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          title="Você ainda não possui revisões."
          description="Continue estudando para criar sua primeira fila de revisão."
        />
      </div>
    );
  }

  const conceptIds = queue
    .map((entry) => entry.reviewItem.conceptId)
    .filter((id): id is string => !!id);
  const conceptNames = await resolveConceptNames(conceptIds);
  const now = new Date();

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Revisão</h1>

      {overdue.length > 0 ? (
        <div className="row-wrap">
          <Badge tone="danger">🔴 {overdue.length} revisão(ões) atrasada(s)</Badge>
        </div>
      ) : null}

      <div className="stack">
        {queue.map((entry) => {
          const isOverdue = entry.reviewItem.dueAt <= now;
          const conceptName = entry.reviewItem.conceptId
            ? (conceptNames.get(entry.reviewItem.conceptId) ?? "Conceito")
            : "Questão específica";
          return (
            <div key={entry.reviewItem.id} className="card card--tight">
              <div className="row-wrap" style={{ justifyContent: "space-between" }}>
                <Badge tone={isOverdue ? "danger" : "brand"}>
                  {isOverdue ? formatOverdueDuration(entry.reviewItem.dueAt, now) : "No prazo"}
                </Badge>
                <Badge tone="muted">{reviewStateLabel(entry.reviewItem.state)}</Badge>
              </div>
              <p style={{ marginTop: 10, fontWeight: 700 }}>{conceptName}</p>
              <p style={{ color: "var(--color-text-muted)", marginTop: 4, fontSize: "0.9rem" }}>
                {entry.reason}
              </p>
            </div>
          );
        })}
      </div>

      <Link href="/dashboard/revisao/sessao" className="btn btn-primary btn-block">
        Revisar agora
      </Link>
    </div>
  );
}
