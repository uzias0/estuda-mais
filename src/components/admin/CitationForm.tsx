/**
 * Formulário reutilizável de "adicionar citação" (Módulo 12, seção 12) —
 * usado em qualquer página de detalhe de entidade gated por Citation
 * (Concept/Discipline/School/Theory/AcademicPerson). Server Component
 * assíncrono: busca a lista de fontes uma vez, sem estado de cliente.
 */
import { listSources } from "@/modules/curation/server/services/source.service";
import { createCitationAction } from "@/server/actions/admin/sources-actions";

export async function CitationForm({
  entityType,
  entityId,
  redirectPath,
}: {
  entityType: string;
  entityId: string;
  redirectPath: string;
}) {
  const sources = await listSources({ take: 200 });
  const action = createCitationAction.bind(null, entityType, entityId, redirectPath);

  return (
    <form action={action} className="row-wrap" style={{ alignItems: "end" }}>
      <select name="sourceId" className="text-input" required>
        <option value="">— selecione uma fonte —</option>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input name="note" className="text-input" placeholder="Nota (opcional)" />
      <button type="submit" className="btn btn-secondary">
        Adicionar citação
      </button>
    </form>
  );
}
