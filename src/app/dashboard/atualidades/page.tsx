/**
 * Atualidades (Módulo 11, seção 27) — só `CurrentAffair` PUBLICADA (Módulo
 * 7), ordenada por `eventDate` (nunca `createdAt`, seção 27).
 *
 * `force-dynamic`: evita pré-renderização estática (dados ficariam
 * congelados no momento do build).
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { listCurrentAffairs } from "@/modules/curation/server/services/current-affairs.service";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";

export default async function AtualidadesPage() {
  const affairs = await listCurrentAffairs({ status: "PUBLISHED", take: 50 });

  if (affairs.length === 0) {
    return (
      <div className="page-container">
        <EmptyState
          title="Nenhuma atualidade publicada ainda."
          description="Volte em breve para ver acontecimentos recentes relacionados aos seus estudos."
        />
      </div>
    );
  }

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Atualidades</h1>
      <div className="stack">
        {affairs.map((affair) => (
          <Link
            key={affair.id}
            href={`/dashboard/atualidades/${affair.id}`}
            className="card card--tight"
          >
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
              {formatDate(affair.eventDate)}
            </p>
            <p style={{ marginTop: 6, fontWeight: 700 }}>{affair.title}</p>
            <p style={{ marginTop: 4, color: "var(--color-text-muted)" }}>{affair.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
