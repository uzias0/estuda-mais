export const dynamic = "force-dynamic";
import { listRelationsForEntity } from "@/modules/knowledge/server/services/academicRelation.service";
import {
  createAcademicRelationAction,
  publishAcademicRelationAction,
  archiveAcademicRelationAction,
} from "@/server/actions/admin/knowledge-actions";
import { RELATION_TYPES } from "@/config/relation-types";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { publicationStatusLabel, knowledgeEntityTypeLabel } from "@/lib/format";

const NODE_TYPES = [
  "PERSON",
  "WORK",
  "THEORY",
  "CONCEPT",
  "SCHOOL",
  "DISCIPLINE",
  "PERIOD",
  "DEVELOPMENTAL_STAGE",
];

/**
 * Não existe (nem foi criada) uma consulta "listar TODAS as
 * AcademicRelation" — o Módulo 2 só expõe `listRelationsForEntity(type,id)`
 * (buscar as relações DE UMA entidade específica), suficiente para a
 * navegação real do produto (nunca se precisa de "toda aresta do grafo" de
 * uma vez). A curadoria aqui segue o mesmo modelo: informe o nó para ver
 * suas relações, em vez de introduzir uma consulta nova sem uso real
 * (seção 26 do prompt — não duplicar/inventar sem necessidade).
 */
export default async function RelationsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  const { type, id } = await searchParams;
  const relations = type && id ? await listRelationsForEntity(type as never, id) : null;

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Relações acadêmicas</h1>

      <details className="card" open>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Nova relação</summary>
        <form
          action={createAcademicRelationAction}
          className="stack"
          style={{ marginTop: "var(--space-4)" }}
        >
          <div className="form-grid">
            <div className="field">
              <label htmlFor="sourceType">Tipo de origem</label>
              <select id="sourceType" name="sourceType" className="text-input" required>
                {NODE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {knowledgeEntityTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sourceId">ID de origem</label>
              <input id="sourceId" name="sourceId" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="relationType">Tipo de relação</label>
              <select id="relationType" name="relationType" className="text-input" required>
                {Object.entries(RELATION_TYPES).map(([key, desc]) => (
                  <option key={key} value={key} title={desc}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="targetType">Tipo de destino</label>
              <select id="targetType" name="targetType" className="text-input" required>
                {NODE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {knowledgeEntityTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="targetId">ID de destino</label>
              <input id="targetId" name="targetId" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="citationId">Citation ID (evidência, opcional)</label>
              <input id="citationId" name="citationId" className="text-input" />
            </div>
          </div>
          <div className="field field--full">
            <label htmlFor="description">Descrição</label>
            <textarea id="description" name="description" className="text-input" rows={2} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
            Criar relação
          </button>
        </form>
      </details>

      <div className="card stack">
        <p className="card-title">Ver relações de uma entidade</p>
        <form method="GET" className="row-wrap" style={{ alignItems: "end" }}>
          <div className="field">
            <label htmlFor="filter-type">Tipo</label>
            <select id="filter-type" name="type" className="text-input" defaultValue={type ?? ""}>
              <option value="">— selecione —</option>
              {NODE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {knowledgeEntityTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-id">ID</label>
            <input id="filter-id" name="id" className="text-input" defaultValue={id ?? ""} />
          </div>
          <button type="submit" className="btn btn-secondary">
            Buscar
          </button>
        </form>

        {relations === null ? null : relations.length === 0 ? (
          <EmptyState title="Nenhuma relação encontrada para esta entidade." />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Origem</th>
                  <th>Relação</th>
                  <th>Destino</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {relations.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {knowledgeEntityTypeLabel(r.sourceType)}: {r.sourceId}
                    </td>
                    <td>{r.relationType}</td>
                    <td>
                      {knowledgeEntityTypeLabel(r.targetType)}: {r.targetId}
                    </td>
                    <td>
                      <Badge
                        tone={
                          r.status === "PUBLISHED"
                            ? "success"
                            : r.status === "ARCHIVED"
                              ? "muted"
                              : "warning"
                        }
                      >
                        {publicationStatusLabel(r.status)}
                      </Badge>
                    </td>
                    <td>
                      <div className="admin-actions-row">
                        {r.status !== "PUBLISHED" ? (
                          <form action={publishAcademicRelationAction.bind(null, r.id)}>
                            <button type="submit" className="btn btn-secondary">
                              Publicar
                            </button>
                          </form>
                        ) : null}
                        {r.status !== "ARCHIVED" ? (
                          <form action={archiveAcademicRelationAction.bind(null, r.id)}>
                            <button type="submit" className="btn btn-secondary">
                              Arquivar
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
