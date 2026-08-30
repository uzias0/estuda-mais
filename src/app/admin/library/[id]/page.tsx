export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getLibraryItem } from "@/modules/curation/server/services/library.service";
import {
  updateLibraryItemAction,
  publishLibraryItemAction,
  archiveLibraryItemAction,
  restoreLibraryItemAction,
  linkLibraryItemToKnowledgeAction,
  unlinkLibraryItemFromKnowledgeAction,
} from "@/server/actions/admin/library-actions";
import { Badge } from "@/components/Badge";
import {
  publicationStatusLabel,
  libraryMaterialTypeLabel,
  knowledgeEntityTypeLabel,
} from "@/lib/format";

const NODE_TYPES = [
  "PERSON",
  "WORK",
  "THEORY",
  "CONCEPT",
  "SCHOOL",
  "DISCIPLINE",
  "PERIOD",
  "DEVELOPMENTAL_STAGE",
];

export default async function LibraryItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getLibraryItem(id);
  if (!item) notFound();

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{item.title}</h1>
        <Badge
          tone={
            item.status === "PUBLISHED"
              ? "success"
              : item.status === "ARCHIVED"
                ? "muted"
                : "warning"
          }
        >
          {publicationStatusLabel(item.status)}
        </Badge>
      </div>
      <p style={{ color: "var(--color-text-muted)" }}>
        {libraryMaterialTypeLabel(item.materialType)} · Fonte: {item.source.name}
        {item.isFree ? " · Gratuito" : ""}
      </p>

      <form action={updateLibraryItemAction.bind(null, id)} className="card stack">
        <p className="card-title">Editar</p>
        <div className="form-grid">
          <div className="field field--full">
            <label htmlFor="title">Título</label>
            <input id="title" name="title" className="text-input" defaultValue={item.title} />
          </div>
          <div className="field">
            <label htmlFor="authorName">Autor</label>
            <input
              id="authorName"
              name="authorName"
              className="text-input"
              defaultValue={item.authorName ?? ""}
            />
          </div>
        </div>
        <div className="field field--full">
          <label htmlFor="description">Descrição</label>
          <textarea
            id="description"
            name="description"
            className="text-input"
            rows={3}
            defaultValue={item.description ?? ""}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
          Salvar
        </button>
      </form>

      <div className="card stack">
        <p className="card-title">Conhecimento relacionado</p>
        <div className="row-wrap">
          {item.knowledgeTags.map((t) => (
            <form
              key={`${t.entityType}-${t.entityId}`}
              action={unlinkLibraryItemFromKnowledgeAction.bind(null, id, t.entityType, t.entityId)}
            >
              <button
                type="submit"
                className="badge badge-brand"
                style={{ border: "none", cursor: "pointer" }}
              >
                {knowledgeEntityTypeLabel(t.entityType)}: {t.entityId} ✕
              </button>
            </form>
          ))}
        </div>
        <form
          action={linkLibraryItemToKnowledgeAction.bind(null, id)}
          className="row-wrap"
          style={{ alignItems: "end" }}
        >
          <select name="entityType" className="text-input" required>
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>
                {knowledgeEntityTypeLabel(t)}
              </option>
            ))}
          </select>
          <input name="entityId" className="text-input" placeholder="ID da entidade" required />
          <button type="submit" className="btn btn-secondary">
            Vincular
          </button>
        </form>
      </div>

      <div className="card stack">
        <p className="card-title">Publicação</p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
          Exige fonte válida, URL quando gratuito, licença quando `OPEN_LICENSE`, e ao menos um
          vínculo com a Base de Conhecimento (Módulo 7).
        </p>
        <div className="admin-actions-row">
          {item.status !== "PUBLISHED" ? (
            <form action={publishLibraryItemAction.bind(null, id)}>
              <button type="submit" className="btn btn-primary">
                Publicar
              </button>
            </form>
          ) : null}
          {item.status !== "ARCHIVED" ? (
            <form action={archiveLibraryItemAction.bind(null, id)}>
              <button type="submit" className="btn btn-secondary">
                Arquivar
              </button>
            </form>
          ) : null}
          {item.status === "ARCHIVED" ? (
            <form action={restoreLibraryItemAction.bind(null, id)}>
              <button type="submit" className="btn btn-secondary">
                Restaurar (volta para rascunho)
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
