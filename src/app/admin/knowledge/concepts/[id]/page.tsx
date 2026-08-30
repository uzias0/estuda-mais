export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getConcept } from "@/modules/knowledge/server/services/concept.service";
import { listTags } from "@/modules/knowledge/server/services/tag.service";
import { listAcademicWorks } from "@/modules/knowledge/server/services/academicWork.service";
import { listCitationsForEntity } from "@/modules/curation/server/services/citation.service";
import { CitationEntityType } from "@/generated/prisma/enums";
import {
  updateConceptAction,
  publishConceptAction,
  archiveConceptAction,
  linkConceptToWorkAction,
  unlinkConceptFromWorkAction,
  linkConceptToTagAction,
  unlinkConceptFromTagAction,
} from "@/server/actions/admin/knowledge-actions";
import { Badge } from "@/components/Badge";
import { publicationStatusLabel, difficultyLabel } from "@/lib/format";
import { CitationForm } from "@/components/admin/CitationForm";

export default async function ConceptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const concept = await getConcept(id);
  if (!concept) notFound();

  const [tags, works, citations] = await Promise.all([
    listTags(),
    listAcademicWorks({ take: 200 }),
    listCitationsForEntity(CitationEntityType.CONCEPT, id),
  ]);

  const linkedTagIds = new Set(concept.tags.map((t) => t.id));
  const linkedWorkIds = new Set(concept.works.map((w) => w.id));
  const updateAction = updateConceptAction.bind(null, id);
  const linkWork = linkConceptToWorkAction.bind(null, id);
  const linkTag = linkConceptToTagAction.bind(null, id);

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{concept.name}</h1>
        <Badge
          tone={
            concept.status === "PUBLISHED"
              ? "success"
              : concept.status === "ARCHIVED"
                ? "muted"
                : "warning"
          }
        >
          {publicationStatusLabel(concept.status)}
        </Badge>
      </div>

      <form action={updateAction} className="card stack">
        <p className="card-title">Editar</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" className="text-input" defaultValue={concept.name} />
          </div>
          <div className="field">
            <label htmlFor="difficulty">Dificuldade</label>
            <select
              id="difficulty"
              name="difficulty"
              className="text-input"
              defaultValue={concept.difficulty ?? ""}
            >
              <option value="">— nenhuma —</option>
              {["INICIANTE", "BASICO", "INTERMEDIARIO", "AVANCADO", "DOMINIO"].map((d) => (
                <option key={d} value={d}>
                  {difficultyLabel(d)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field field--full">
          <label htmlFor="definition">Definição</label>
          <textarea
            id="definition"
            name="definition"
            className="text-input"
            rows={3}
            defaultValue={concept.definition}
          />
        </div>
        <div className="field field--full">
          <label htmlFor="didacticExplanation">Explicação didática</label>
          <textarea
            id="didacticExplanation"
            name="didacticExplanation"
            className="text-input"
            rows={3}
            defaultValue={concept.didacticExplanation ?? ""}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
          Salvar
        </button>
      </form>

      <div className="card stack">
        <p className="card-title">Procedência (Citation)</p>
        {citations.length === 0 ? (
          <p style={{ color: "var(--color-danger)" }}>
            Sem nenhuma citação — publicação será recusada pelo servidor.
          </p>
        ) : (
          <ul className="stack">
            {citations.map((c) => (
              <li key={c.id}>
                Fonte: {c.source.name} {c.note ? `— ${c.note}` : ""}
              </li>
            ))}
          </ul>
        )}
        <CitationForm
          entityType="CONCEPT"
          entityId={id}
          redirectPath={`/admin/knowledge/concepts/${id}`}
        />
      </div>

      <div className="card stack">
        <p className="card-title">Obras relacionadas</p>
        <div className="row-wrap">
          {concept.works.map((w) => (
            <form key={w.id} action={unlinkConceptFromWorkAction.bind(null, id, w.id)}>
              <button
                type="submit"
                className="badge badge-brand"
                style={{ border: "none", cursor: "pointer" }}
              >
                {w.title} ✕
              </button>
            </form>
          ))}
        </div>
        <form action={linkWork} className="row-wrap" style={{ alignItems: "end" }}>
          <select name="workId" className="text-input" required>
            <option value="">— selecione uma obra —</option>
            {works
              .filter((w) => !linkedWorkIds.has(w.id))
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
          </select>
          <button type="submit" className="btn btn-secondary">
            Vincular
          </button>
        </form>
      </div>

      <div className="card stack">
        <p className="card-title">Tags</p>
        <div className="row-wrap">
          {concept.tags.map((t) => (
            <form key={t.id} action={unlinkConceptFromTagAction.bind(null, id, t.id)}>
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
        <form action={linkTag} className="row-wrap" style={{ alignItems: "end" }}>
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
          {concept.status !== "PUBLISHED" ? (
            <form action={publishConceptAction.bind(null, id)}>
              <button type="submit" className="btn btn-primary">
                Publicar
              </button>
            </form>
          ) : null}
          {concept.status !== "ARCHIVED" ? (
            <form action={archiveConceptAction.bind(null, id)}>
              <button type="submit" className="btn btn-secondary">
                Arquivar
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
