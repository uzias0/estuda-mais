export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getCurrentAffair } from "@/modules/curation/server/services/current-affairs.service";
import { listTags } from "@/modules/knowledge/server/services/tag.service";
import {
  updateCurrentAffairAction,
  publishCurrentAffairAction,
  archiveCurrentAffairAction,
  restoreCurrentAffairAction,
  linkCurrentAffairToKnowledgeAction,
  unlinkCurrentAffairFromKnowledgeAction,
  linkCurrentAffairToTagAction,
  unlinkCurrentAffairFromTagAction,
} from "@/server/actions/admin/current-affairs-actions";
import { Badge } from "@/components/Badge";
import { publicationStatusLabel, knowledgeEntityTypeLabel, formatDate } from "@/lib/format";

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

export default async function CurrentAffairDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const affair = await getCurrentAffair(id);
  if (!affair) notFound();

  const tags = await listTags();
  const linkedTagIds = new Set(affair.tags.map((t) => t.id));

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{affair.title}</h1>
        <Badge
          tone={
            affair.status === "PUBLISHED"
              ? "success"
              : affair.status === "ARCHIVED"
                ? "muted"
                : "warning"
          }
        >
          {publicationStatusLabel(affair.status)}
        </Badge>
      </div>
      <p style={{ color: "var(--color-text-muted)" }}>
        Acontecimento em {formatDate(affair.eventDate)}
      </p>

      <form action={updateCurrentAffairAction.bind(null, id)} className="card stack">
        <p className="card-title">Editar</p>
        <div className="form-grid">
          <div className="field field--full">
            <label htmlFor="title">Título</label>
            <input id="title" name="title" className="text-input" defaultValue={affair.title} />
          </div>
          <div className="field">
            <label htmlFor="eventDate">Data do acontecimento</label>
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              className="text-input"
              defaultValue={affair.eventDate.toISOString().slice(0, 10)}
            />
          </div>
        </div>
        <div className="field field--full">
          <label htmlFor="summary">Resumo</label>
          <textarea
            id="summary"
            name="summary"
            className="text-input"
            rows={3}
            defaultValue={affair.summary}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
          Salvar
        </button>
      </form>

      <div className="card stack">
        <p className="card-title">Conhecimento relacionado</p>
        <div className="row-wrap">
          {affair.knowledgeTags.map((t) => (
            <form
              key={`${t.entityType}-${t.entityId}`}
              action={unlinkCurrentAffairFromKnowledgeAction.bind(
                null,
                id,
                t.entityType,
                t.entityId,
              )}
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
          action={linkCurrentAffairToKnowledgeAction.bind(null, id)}
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
        <p className="card-title">Tags</p>
        <div className="row-wrap">
          {affair.tags.map((t) => (
            <form key={t.id} action={unlinkCurrentAffairFromTagAction.bind(null, id, t.id)}>
              <button
                type="submit"
                className="badge badge-muted"
                style={{ border: "none", cursor: "pointer" }}
              >
                {t.name} ✕
              </button>
            </form>
          ))}
        </div>
        <form
          action={linkCurrentAffairToTagAction.bind(null, id)}
          className="row-wrap"
          style={{ alignItems: "end" }}
        >
          <select name="tagId" className="text-input" required>
            <option value="">— selecione uma tag —</option>
            {tags
              .filter((t) => !linkedTagIds.has(t.id))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
          <button type="submit" className="btn btn-secondary">
            Vincular
          </button>
        </form>
      </div>

      <div className="card stack">
        <p className="card-title">Publicação</p>
        <div className="admin-actions-row">
          {affair.status !== "PUBLISHED" ? (
            <form action={publishCurrentAffairAction.bind(null, id)}>
              <button type="submit" className="btn btn-primary">
                Publicar
              </button>
            </form>
          ) : null}
          {affair.status !== "ARCHIVED" ? (
            <form action={archiveCurrentAffairAction.bind(null, id)}>
              <button type="submit" className="btn btn-secondary">
                Arquivar
              </button>
            </form>
          ) : null}
          {affair.status === "ARCHIVED" ? (
            <form action={restoreCurrentAffairAction.bind(null, id)}>
              <button type="submit" className="btn btn-secondary">
                Restaurar
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
