export const dynamic = "force-dynamic";
import Link from "next/link";
import { listCurrentAffairs } from "@/modules/curation/server/services/current-affairs.service";
import { listSources } from "@/modules/curation/server/services/source.service";
import { createCurrentAffairAction } from "@/server/actions/admin/current-affairs-actions";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { publicationStatusLabel, currentAffairRelevanceLabel, formatDate } from "@/lib/format";

const RELEVANCES = ["LOW", "MODERATE", "HIGH"];

export default async function CurrentAffairsPage() {
  const [affairs, sources] = await Promise.all([
    listCurrentAffairs({ take: 100 }),
    listSources({ take: 200 }),
  ]);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Atualidades</h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        A data do acontecimento (<code>eventDate</code>) é sempre informada explicitamente — nunca
        confundida com a data de cadastro.
      </p>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Nova atualidade</summary>
        <form
          action={createCurrentAffairAction}
          className="stack"
          style={{ marginTop: "var(--space-4)" }}
        >
          <div className="form-grid">
            <div className="field field--full">
              <label htmlFor="title">Título</label>
              <input id="title" name="title" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="eventDate">Data do acontecimento</label>
              <input id="eventDate" name="eventDate" type="date" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="relevance">Relevância</label>
              <select
                id="relevance"
                name="relevance"
                className="text-input"
                defaultValue="MODERATE"
              >
                {RELEVANCES.map((r) => (
                  <option key={r} value={r}>
                    {currentAffairRelevanceLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sourceId">Fonte</label>
              <select id="sourceId" name="sourceId" className="text-input" required>
                <option value="">— selecione —</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="summary">Resumo</label>
            <textarea id="summary" name="summary" className="text-input" rows={3} required />
          </div>
          <div className="field field--full">
            <label htmlFor="educationalContent">
              Conteúdo educacional (conexão com a Psicologia/áreas afins)
            </label>
            <textarea
              id="educationalContent"
              name="educationalContent"
              className="text-input"
              rows={3}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
            Criar
          </button>
        </form>
      </details>

      {affairs.length === 0 ? (
        <EmptyState title="Nenhuma atualidade cadastrada ainda." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Data do acontecimento</th>
                <th>Relevância</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {affairs.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/current-affairs/${a.id}`}>{a.title}</Link>
                  </td>
                  <td>{formatDate(a.eventDate)}</td>
                  <td>{currentAffairRelevanceLabel(a.relevance)}</td>
                  <td>
                    <Badge
                      tone={
                        a.status === "PUBLISHED"
                          ? "success"
                          : a.status === "ARCHIVED"
                            ? "muted"
                            : "warning"
                      }
                    >
                      {publicationStatusLabel(a.status)}
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
