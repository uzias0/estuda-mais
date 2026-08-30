export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getAcademicWork } from "@/modules/knowledge/server/services/academicWork.service";
import { listAcademicPersons } from "@/modules/knowledge/server/services/academicPerson.service";
import {
  updateWorkAction,
  publishWorkAction,
  archiveWorkAction,
  addAuthorToWorkAction,
  removeAuthorFromWorkAction,
} from "@/server/actions/admin/knowledge-actions";
import { Badge } from "@/components/Badge";
import { publicationStatusLabel, academicWorkTypeLabel } from "@/lib/format";

const AUTHOR_ROLES = ["AUTOR", "COAUTOR", "ORGANIZADOR", "TRADUTOR"];

export default async function WorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const work = await getAcademicWork(id);
  if (!work) notFound();

  const people = await listAcademicPersons({ take: 200 });
  const linkedPersonIds = new Set(work.authors.map((a) => a.personId));

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{work.title}</h1>
        <Badge
          tone={
            work.status === "PUBLISHED"
              ? "success"
              : work.status === "ARCHIVED"
                ? "muted"
                : "warning"
          }
        >
          {publicationStatusLabel(work.status)}
        </Badge>
      </div>
      <p style={{ color: "var(--color-text-muted)" }}>{academicWorkTypeLabel(work.type)}</p>

      <form action={updateWorkAction.bind(null, id)} className="card stack">
        <p className="card-title">Editar</p>
        <div className="form-grid">
          <div className="field field--full">
            <label htmlFor="title">Título</label>
            <input id="title" name="title" className="text-input" defaultValue={work.title} />
          </div>
          <div className="field">
            <label htmlFor="year">Ano</label>
            <input
              id="year"
              name="year"
              type="number"
              className="text-input"
              defaultValue={work.year ?? ""}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
          Salvar
        </button>
      </form>

      <div className="card stack">
        <p className="card-title">Autores</p>
        <div className="row-wrap">
          {work.authors.map((a) => (
            <form key={a.personId} action={removeAuthorFromWorkAction.bind(null, id, a.personId)}>
              <button
                type="submit"
                className="badge badge-brand"
                style={{ border: "none", cursor: "pointer" }}
              >
                {a.person.name} ({a.role}) ✕
              </button>
            </form>
          ))}
        </div>
        <form
          action={addAuthorToWorkAction.bind(null, id)}
          className="row-wrap"
          style={{ alignItems: "end" }}
        >
          <select name="personId" className="text-input" required>
            <option value="">— selecione um autor —</option>
            {people
              .filter((p) => !linkedPersonIds.has(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <select name="role" className="text-input" defaultValue="AUTOR">
            {AUTHOR_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
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
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
          `AcademicWork` não exige Citation para publicar (procedência secundária via{" "}
          <code>sourceId</code>, opcional) — decisão do Módulo 2.
        </p>
        <div className="admin-actions-row">
          {work.status !== "PUBLISHED" ? (
            <form action={publishWorkAction.bind(null, id)}>
              <button type="submit" className="btn btn-primary">
                Publicar
              </button>
            </form>
          ) : null}
          {work.status !== "ARCHIVED" ? (
            <form action={archiveWorkAction.bind(null, id)}>
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
