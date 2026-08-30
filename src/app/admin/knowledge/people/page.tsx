export const dynamic = "force-dynamic";
import Link from "next/link";
import { listAcademicPersons } from "@/modules/knowledge/server/services/academicPerson.service";
import { listHistoricalPeriods } from "@/modules/knowledge/server/services/historicalPeriod.service";
import { createPersonAction } from "@/server/actions/admin/knowledge-actions";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { publicationStatusLabel } from "@/lib/format";

export default async function PeoplePage() {
  const [people, periods] = await Promise.all([
    listAcademicPersons({ take: 100 }),
    listHistoricalPeriods({ take: 200 }),
  ]);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Autores/pesquisadores</h1>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Novo autor/pesquisador</summary>
        <form action={createPersonAction} className="stack" style={{ marginTop: "var(--space-4)" }}>
          <div className="field">
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              name="slug"
              className="text-input"
              required
              placeholder="ex.: sigmund-freud"
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" name="name" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="fullName">Nome completo</label>
              <input id="fullName" name="fullName" className="text-input" />
            </div>
            <div className="field">
              <label htmlFor="countryContext">País/contexto</label>
              <input id="countryContext" name="countryContext" className="text-input" />
            </div>
            <div className="field">
              <label htmlFor="periodId">Período</label>
              <select id="periodId" name="periodId" className="text-input" defaultValue="">
                <option value="">— nenhum —</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="bio">Biografia</label>
            <textarea id="bio" name="bio" className="text-input" rows={3} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
            Criar
          </button>
        </form>
      </details>

      {people.length === 0 ? (
        <EmptyState title="Nenhum autor cadastrado ainda." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/knowledge/people/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>
                    <Badge
                      tone={
                        p.status === "PUBLISHED"
                          ? "success"
                          : p.status === "ARCHIVED"
                            ? "muted"
                            : "warning"
                      }
                    >
                      {publicationStatusLabel(p.status)}
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
