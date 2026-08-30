/**
 * Detalhe de atualidade (Módulo 11, seções 28/29) — "como isso se relaciona
 * com a Psicologia" é sempre `CurrentAffairKnowledgeTag` real (Módulo 7,
 * nunca inventado por IA); interdisciplinaridade reaproveita
 * `findInterdisciplinaryConnections` (Módulo 10) sobre os conceitos
 * tagueados — só `AcademicRelation` publicada real (seção 29: "somente
 * entidades realmente relacionadas no banco").
 */
import { KnowledgeEntityType } from "@/generated/prisma/enums";
import { getCurrentAffair } from "@/modules/curation/server/services/current-affairs.service";
import { findInterdisciplinaryConnections } from "@/modules/study-engine/server/queries/interdisciplinary";
import { resolveKnowledgeEntityLabel } from "@/lib/resolve-names";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";

export default async function CurrentAffairPage({
  params,
}: PageProps<"/dashboard/atualidades/[id]">) {
  const { id } = await params;
  const affair = await getCurrentAffair(id);

  if (!affair || affair.status !== "PUBLISHED") {
    return (
      <div className="page-container">
        <EmptyState title="Esta atualidade não está disponível." />
      </div>
    );
  }

  const conceptTagIds = affair.knowledgeTags
    .filter((tag) => tag.entityType === KnowledgeEntityType.CONCEPT)
    .map((tag) => tag.entityId);

  const [relatedLabels, interdisciplinaryConnections] = await Promise.all([
    Promise.all(
      affair.knowledgeTags.map((tag) => resolveKnowledgeEntityLabel(tag.entityType, tag.entityId)),
    ),
    Promise.all(conceptTagIds.map((conceptId) => findInterdisciplinaryConnections(conceptId))).then(
      (all) => all.flat(),
    ),
  ]);

  const interdisciplinaryLabels = await Promise.all(
    interdisciplinaryConnections.map((c) => resolveKnowledgeEntityLabel(c.entityType, c.entityId)),
  );
  const uniqueInterdisciplinaryLabels = [...new Set(interdisciplinaryLabels)];

  return (
    <div className="page-container stack">
      <div className="card stack">
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          {formatDate(affair.eventDate)}
        </p>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>{affair.title}</h1>
        <p>{affair.summary}</p>
        {affair.educationalContent ? (
          <p style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--color-border)" }}>
            {affair.educationalContent}
          </p>
        ) : null}
      </div>

      {relatedLabels.length > 0 ? (
        <div className="card card--tight">
          <p className="card-title">Como isso se relaciona com a Psicologia?</p>
          <div className="row-wrap" style={{ marginTop: 8 }}>
            {relatedLabels.map((label, index) => (
              <Badge key={index} tone="brand">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {uniqueInterdisciplinaryLabels.length > 0 ? (
        <div className="card card--tight">
          <p className="card-title">Este assunto também se relaciona com</p>
          <div className="row-wrap" style={{ marginTop: 8 }}>
            {uniqueInterdisciplinaryLabels.map((label, index) => (
              <Badge key={index} tone="muted">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card card--tight">
        <p className="card-title">Fonte</p>
        <p style={{ marginTop: 8, fontWeight: 700 }}>{affair.source.name}</p>
        {affair.source.url ? (
          <a
            href={affair.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ marginTop: 12 }}
          >
            Ver fonte original
          </a>
        ) : null}
      </div>
    </div>
  );
}
