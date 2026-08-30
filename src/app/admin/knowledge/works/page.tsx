export const dynamic = "force-dynamic";
import Link from "next/link";
import { listAcademicWorks } from "@/modules/knowledge/server/services/academicWork.service";
import { createWorkAction } from "@/server/actions/admin/knowledge-actions";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { publicationStatusLabel, academicWorkTypeLabel } from "@/lib/format";

const WORK_TYPES = [
  "LIVRO",
  "ARTIGO",
  "ENSAIO",
  "EXPERIMENTO_PUBLICADO",
  "DOCUMENTO",
  "TEORIA_PUBLICADA",
  "OUTRO",
];

export default async function WorksPage() {
  const works = await listAcademicWorks({ take: 100 });

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Obras</h1>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Nova obra</summary>
        <form action={createWorkAction} className="stack" style={{ marginTop: "var(--space-4)" }}>
          <div className="form-grid">
            <div className="field field--full">
              <label htmlFor="title">Título</label>
              <input id="title" name="title" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="type">Tipo</label>
              <select id="type" name="type" className="text-input" required>
                {WORK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {academicWorkTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="year">Ano</label>
              <input id="year" name="year" type="number" className="text-input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
            Criar
          </button>
        </form>
      </details>

      {works.length === 0 ? (
        <EmptyState title="Nenhuma obra cadastrada ainda." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Ano</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {works.map((w) => (
                <tr key={w.id}>
                  <td>
                    <Link href={`/admin/knowledge/works/${w.id}`}>{w.title}</Link>
                  </td>
                  <td>{academicWorkTypeLabel(w.type)}</td>
                  <td>{w.year ?? "—"}</td>
                  <td>
                    <Badge
                      tone={
                        w.status === "PUBLISHED"
                          ? "success"
                          : w.status === "ARCHIVED"
                            ? "muted"
                            : "warning"
                      }
                    >
                      {publicationStatusLabel(w.status)}
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
