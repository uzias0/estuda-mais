export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getAcademicPerson } from "@/modules/knowledge/server/services/academicPerson.service";
import { listTags } from "@/modules/knowledge/server/services/tag.service";
import { listCitationsForEntity } from "@/modules/curation/server/services/citation.service";
import { CitationEntityType } from "@/generated/prisma/enums";
import {
  updatePersonAction,
  publishPersonAction,
  archivePersonAction,
  linkPersonToTagAction,
  unlinkPersonFromTagAction,
} from "@/server/actions/admin/knowledge-actions";
import { Badge } from "@/components/Badge";
import { publicationStatusLabel } from "@/lib/format";
import { CitationForm } from "@/components/admin/CitationForm";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getAcademicPerson(id);
  if (!person) notFound();

  const [tags, citations] = await Promise.all([
    listTags(),
    listCitationsForEntity(CitationEntityType.PERSON, id),
  ]);
  const linkedTagIds = new Set(person.tags.map((t) => t.id));

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{person.name}</h1>
        <Badge
          tone={
            person.status === "PUBLISHED"
              ? "success"
              : person.status === "ARCHIVED"
                ? "muted"
                : "warning"
          }
        >
          {publicationStatusLabel(person.status)}
        </Badge>
      </div>

      <form action={updatePersonAction.bind(null, id)} className="card stack">
        <p className="card-title">Editar</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" className="text-input" defaultValue={person.name} />
          </div>
          <div className="field">
            <label htmlFor="fullName">Nome completo</label>
            <input
              id="fullName"
              name="fullName"
              className="text-input"
              defaultValue={person.fullName ?? ""}
            />
          </div>
        </div>
        <div className="field field--full">
          <label htmlFor="bio">Biografia</label>
          <textarea
            id="bio"
            name="bio"
            className="text-input"
            rows={3}
            defaultValue={person.bio ?? ""}
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
            Sem nenhuma citação — publicação será recusada.
          </p>
        ) : (
          <ul className="stack">
            {citations.map((c) => (
              <li key={c.id}>Fonte: {c.source.name}</li>
            ))}
          </ul>
        )}
        <CitationForm
          entityType="PERSON"
          entityId={id}
          redirectPath={`/admin/knowledge/people/${id}`}
        />
      </div>

      <div className="card stack">
        <p className="card-title">Tags</p>
        <div className="row-wrap">
          {person.tags.map((t) => (
            <form key={t.id} action={unlinkPersonFromTagAction.bind(null, id, t.id)}>
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
          action={linkPersonToTagAction.bind(null, id)}
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
          {person.status !== "PUBLISHED" ? (
            <form action={publishPersonAction.bind(null, id)}>
              <button type="submit" className="btn btn-primary">
                Publicar
              </button>
            </form>
          ) : null}
          {person.status !== "ARCHIVED" ? (
            <form action={archivePersonAction.bind(null, id)}>
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
