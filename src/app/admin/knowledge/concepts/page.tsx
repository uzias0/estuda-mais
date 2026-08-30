export const dynamic = "force-dynamic";
import Link from "next/link";
import { listConcepts } from "@/modules/knowledge/server/services/concept.service";
import { listDevelopmentalStages } from "@/modules/knowledge/server/services/developmentalStage.service";
import { createConceptAction } from "@/server/actions/admin/knowledge-actions";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { publicationStatusLabel, difficultyLabel } from "@/lib/format";

const DIFFICULTIES = ["INICIANTE", "BASICO", "INTERMEDIARIO", "AVANCADO", "DOMINIO"];

export default async function ConceptsPage() {
  const [concepts, stages] = await Promise.all([
    listConcepts({ take: 100 }),
    listDevelopmentalStages(),
  ]);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Conceitos</h1>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Novo conceito</summary>
        <form
          action={createConceptAction}
          className="stack"
          style={{ marginTop: "var(--space-4)" }}
        >
          <div className="field">
            <label htmlFor="slug">Slug</label>
            <input
              id="slug"
              name="slug"
              className="text-input"
              required
              placeholder="ex.: inconsciente"
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" name="name" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="difficulty">Dificuldade</label>
              <select id="difficulty" name="difficulty" className="text-input" defaultValue="">
                <option value="">— nenhuma —</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {difficultyLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="developmentalStageId">Estágio de desenvolvimento</label>
              <select
                id="developmentalStageId"
                name="developmentalStageId"
                className="text-input"
                defaultValue=""
              >
                <option value="">— nenhum —</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="definition">Definição</label>
            <textarea id="definition" name="definition" className="text-input" rows={3} required />
          </div>
          <div className="field field--full">
            <label htmlFor="didacticExplanation">Explicação didática</label>
            <textarea
              id="didacticExplanation"
              name="didacticExplanation"
              className="text-input"
              rows={3}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
            Criar
          </button>
        </form>
      </details>

      {concepts.length === 0 ? (
        <EmptyState title="Nenhum conceito cadastrado ainda." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Dificuldade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {concepts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/knowledge/concepts/${c.id}`}>{c.name}</Link>
                  </td>
                  <td>{difficultyLabel(c.difficulty)}</td>
                  <td>
                    <Badge
                      tone={
                        c.status === "PUBLISHED"
                          ? "success"
                          : c.status === "ARCHIVED"
                            ? "muted"
                            : "warning"
                      }
                    >
                      {publicationStatusLabel(c.status)}
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
