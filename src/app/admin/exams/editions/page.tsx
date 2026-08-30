export const dynamic = "force-dynamic";
import Link from "next/link";
import { listExamEditions } from "@/modules/assessment/server/services/examEdition.service";
import { listExams } from "@/modules/assessment/server/services/exam.service";
import {
  listExamBoards,
  listOrganizations,
  listPositions,
} from "@/modules/assessment/server/services/examReference.service";
import { listSources } from "@/modules/curation/server/services/source.service";
import { createExamEditionAction } from "@/server/actions/admin/exams-actions";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { publicationStatusLabel } from "@/lib/format";

export default async function ExamEditionsPage() {
  const [editions, exams, boards, orgs, positions, sources] = await Promise.all([
    listExamEditions({ take: 100 }),
    listExams({ take: 200 }),
    Promise.resolve(listExamBoards({ take: 200 })),
    Promise.resolve(listOrganizations({ take: 200 })),
    Promise.resolve(listPositions({ take: 200 })),
    listSources({ take: 200 }),
  ]);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Edições de prova</h1>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Nova edição</summary>
        <form
          action={createExamEditionAction}
          className="stack"
          style={{ marginTop: "var(--space-4)" }}
        >
          <div className="form-grid">
            <div className="field">
              <label htmlFor="examId">Prova</label>
              <select id="examId" name="examId" className="text-input" required>
                <option value="">— selecione —</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="name">Nome da edição</label>
              <input
                id="name"
                name="name"
                className="text-input"
                required
                placeholder="ex.: ENADE 2023"
              />
            </div>
            <div className="field">
              <label htmlFor="year">Ano</label>
              <input id="year" name="year" type="number" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="examBoardId">Banca</label>
              <select id="examBoardId" name="examBoardId" className="text-input" defaultValue="">
                <option value="">— nenhuma —</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="organizationId">Órgão/organização</label>
              <select
                id="organizationId"
                name="organizationId"
                className="text-input"
                defaultValue=""
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
              <select id="positionId" name="positionId" className="text-input" defaultValue="">
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
              <select id="sourceId" name="sourceId" className="text-input" defaultValue="">
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
            Criar
          </button>
        </form>
      </details>

      {editions.length === 0 ? (
        <EmptyState title="Nenhuma edição de prova cadastrada ainda." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Edição</th>
                <th>Ano</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {editions.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/exams/editions/${e.id}`}>{e.name}</Link>
                  </td>
                  <td>{e.year}</td>
                  <td>
                    <Badge
                      tone={
                        e.status === "PUBLISHED"
                          ? "success"
                          : e.status === "ARCHIVED"
                            ? "muted"
                            : "warning"
                      }
                    >
                      {publicationStatusLabel(e.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
