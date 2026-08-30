/**
 * Detalhe de material da biblioteca (Módulo 11, seção 26) — sempre dado
 * real do Módulo 7; a fonte/licença exibidas são exatamente as gravadas
 * (`Source.url`/`Source.license`) — nunca hospeda o material em si (seção
 * 26: "a plataforma deve divulgar somente acesso legal").
 */
import { getLibraryItem } from "@/modules/curation/server/services/library.service";
import { resolveKnowledgeEntityLabel } from "@/lib/resolve-names";
import { libraryMaterialTypeLabel, formatDate } from "@/lib/format";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";

export default async function LibraryItemPage({ params }: PageProps<"/dashboard/biblioteca/[id]">) {
  const { id } = await params;
  const item = await getLibraryItem(id);

  if (!item || item.status !== "PUBLISHED") {
    return (
      <div className="page-container">
        <EmptyState title="Este material não está disponível." />
      </div>
    );
  }

  const subjectLabels = await Promise.all(
    item.knowledgeTags.map((tag) => resolveKnowledgeEntityLabel(tag.entityType, tag.entityId)),
  );

  return (
    <div className="page-container stack">
      <div className="card stack">
        <div className="row-wrap">
          <Badge tone="muted">{libraryMaterialTypeLabel(item.materialType)}</Badge>
          {item.isFree ? (
            <>
              <Badge tone="success">GRATUITO</Badge>
              <Badge tone="brand">Acesso legal</Badge>
            </>
          ) : null}
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{item.title}</h1>
        {item.authorName ? (
          <p style={{ color: "var(--color-text-muted)" }}>{item.authorName}</p>
        ) : null}
        {item.description ? <p style={{ marginTop: 8 }}>{item.description}</p> : null}
        <div className="row-wrap" style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          {item.year ? <span>Ano: {item.year}</span> : null}
          {item.language ? <span>Idioma: {item.language}</span> : null}
        </div>
      </div>

      {subjectLabels.length > 0 ? (
        <div className="card card--tight">
          <p className="card-title">Assuntos relacionados</p>
          <div className="row-wrap" style={{ marginTop: 8 }}>
            {subjectLabels.map((label, index) => (
              <Badge key={index} tone="brand">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card card--tight">
        <p className="card-title">Fonte</p>
        <p style={{ marginTop: 8, fontWeight: 700 }}>{item.source.name}</p>
        {item.source.license ? (
          <p style={{ color: "var(--color-text-muted)", marginTop: 4 }}>
            Licença: {item.source.license}
          </p>
        ) : null}
        {item.source.publishedAt ? (
          <p style={{ color: "var(--color-text-muted)", marginTop: 4 }}>
            Publicado em {formatDate(item.source.publishedAt)}
          </p>
        ) : null}
        {item.source.url ? (
          <a
            href={item.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ marginTop: 12 }}
          >
            Acessar fonte oficial
          </a>
        ) : (
          <p style={{ marginTop: 12, color: "var(--color-text-muted)" }}>
            Nenhum link de acesso direto cadastrado para esta fonte.
          </p>
        )}
      </div>
    </div>
  );
}
