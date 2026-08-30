export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getExamEdition } from "@/modules/assessment/server/services/examEdition.service";
import {
  listExamBoards,
  listOrganizations,
  listPositions,
} from "@/modules/assessment/server/services/examReference.service";
import { listSources } from "@/modules/curation/server/services/source.service";
import {
  updateExamEditionAction,
  publishExamEditionAction,
  archiveExamEditionAction,
} from "@/server/actions/admin/exams-actions";
import { Badge } from "@/components/Badge";
import { publicationStatusLabel } from "@/lib/format";

export default async function ExamEditionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const edition = await getExamEdition(id);
  if (!edition) notFound();

  const [boards, orgs, positions, sources] = await Promise.all([
    Promise.resolve(listExamBoards({ take: 200 })),
    Promise.resolve(listOrganizations({ take: 200 })),
    Promise.resolve(listPositions({ take: 200 })),
    listSources({ take: 200 }),
  ]);

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{edition.name}</h1>
        <Badge
          tone={
            edition.status === "PUBLISHED"
              ? "success"
              : edition.status === "ARCHIVED"
                ? "muted"
                : "warning"
          }
        >
          {publicationStatusLabel(edition.status)}
        </Badge>
      </div>
      <p style={{ color: "var(--color-text-muted)" }}>
        {edition.exam.name} · {edition.year}
      </p>

      <form action={updateExamEditionAction.bind(null, id)} className="card stack">
        <p className="card-title">Editar</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" className="text-input" defaultValue={edition.name} />
          </div>
          <div className="field">
            <label htmlFor="year">Ano</label>
            <input
              id="year"
              name="year"
              type="number"
              className="text-input"
              defaultValue={edition.year}
            />
          </div>
          <div className="field">
            <label htmlFor="examBoardId">Banca</label>
            <select
              id="examBoardId"
              name="examBoardId"
              className="text-input"
              defaultValue={edition.examBoardId ?? ""}
            >
              <option value="">— nenhuma —</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="organizationId">Órgão</label>
            <select
              id="organizationId"
              name="organizationId"
              className="text-input"
              defaultValue={edition.organizationId ?? ""}
            >
              <option value="">— nenhum —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="positionId">Cargo</label>
            <select
              id="positionId"
              name="positionId"
              className="text-input"
              defaultValue={edition.positionId ?? ""}
            >
              <option value="">— nenhum —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sourceId">Fonte</label>
            <select
              id="sourceId"
              name="sourceId"
              className="text-input"
              defaultValue={edition.sourceId ?? ""}
            >
              <option value="">— nenhuma —</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
          Salvar
        </button>
      </form>

      <div className="card stack">
        <p className="card-title">Publicação</p>
        <div className="admin-actions-row">
          {edition.status !== "PUBLISHED" ? (
            <form action={publishExamEditionAction.bind(null, id)}>
              <button type="submit" className="btn btn-primary">
                Publicar
              </button>
            </form>
          ) : null}
          {edition.status !== "ARCHIVED" ? (
            <form action={archiveExamEditionAction.bind(null, id)}>
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
