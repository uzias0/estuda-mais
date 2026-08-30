export const dynamic = "force-dynamic";
import Link from "next/link";
import { listSources } from "@/modules/curation/server/services/source.service";
import { createSourceAction } from "@/server/actions/admin/sources-actions";
import { EmptyState } from "@/components/EmptyState";
import { sourceTypeLabel } from "@/lib/format";

const SOURCE_TYPES = [
  "AUTORAL",
  "LICENCIADO",
  "OFICIAL",
  "ACADEMICA",
  "DIDATICA",
  "ADMINISTRATIVA",
  "EXTERNA",
];

export default async function SourcesPage() {
  const sources = await listSources({ take: 200 });

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Fontes e Procedência</h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        `Source` é a procedência de qualquer conteúdo acadêmico. Não há publicação/arquivamento aqui
        — uma fonte é o fundamento sobre o qual outras entidades se publicam via{" "}
        <code>Citation</code>.
      </p>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Nova fonte</summary>
        <form action={createSourceAction} className="stack" style={{ marginTop: "var(--space-4)" }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" name="name" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="sourceType">Tipo</label>
              <select id="sourceType" name="sourceType" className="text-input" required>
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {sourceTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="author">Autor</label>
              <input id="author" name="author" className="text-input" />
            </div>
            <div className="field">
              <label htmlFor="institution">Instituição</label>
              <input id="institution" name="institution" className="text-input" />
            </div>
            <div className="field">
              <label htmlFor="url">URL</label>
              <input id="url" name="url" type="url" className="text-input" />
            </div>
            <div className="field">
              <label htmlFor="license">Licença</label>
              <input id="license" name="license" className="text-input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
            Criar
          </button>
        </form>
      </details>

      {sources.length === 0 ? (
        <EmptyState title="Nenhuma fonte cadastrada ainda." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/admin/sources/${s.id}`}>{s.name}</Link>
                  </td>
                  <td>{sourceTypeLabel(s.sourceType)}</td>
                  <td>{s.url ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
