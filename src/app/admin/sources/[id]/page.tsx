export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getSource } from "@/modules/curation/server/services/source.service";
import { getLegalReference } from "@/modules/curation/server/services/legalReference.service";
import { listCitationsBySource } from "@/modules/curation/server/services/citation.service";
import {
  updateSourceAction,
  createLegalReferenceAction,
  updateLegalReferenceAction,
} from "@/server/actions/admin/sources-actions";
import { sourceTypeLabel } from "@/lib/format";

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await getSource(id);
  if (!source) notFound();

  const [legalReference, citations] = await Promise.all([
    getLegalReference(id),
    listCitationsBySource(id),
  ]);

  const updateAction = updateSourceAction.bind(null, id);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{source.name}</h1>
      <p style={{ color: "var(--color-text-muted)" }}>{sourceTypeLabel(source.sourceType)}</p>

      <form action={updateAction} className="card stack">
        <p className="card-title">Editar</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" className="text-input" defaultValue={source.name} />
          </div>
          <div className="field">
            <label htmlFor="author">Autor</label>
            <input
              id="author"
              name="author"
              className="text-input"
              defaultValue={source.author ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="institution">Instituição</label>
            <input
              id="institution"
              name="institution"
              className="text-input"
              defaultValue={source.institution ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="url">URL</label>
            <input
              id="url"
              name="url"
              type="url"
              className="text-input"
              defaultValue={source.url ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="license">Licença</label>
            <input
              id="license"
              name="license"
              className="text-input"
              defaultValue={source.license ?? ""}
            />
          </div>
        </div>
        <div className="field field--full">
          <label htmlFor="rightsNote">Nota de direitos</label>
          <textarea
            id="rightsNote"
            name="rightsNote"
            className="text-input"
            rows={3}
            defaultValue={source.rightsNote ?? ""}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
          Salvar
        </button>
      </form>

      <div className="card stack">
        <p className="card-title">Conteúdos que usam esta fonte ({citations.length})</p>
        {citations.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>Nenhuma citação usa esta fonte ainda.</p>
        ) : (
          <ul className="stack">
            {citations.map((c) => (
              <li key={c.id}>
                {c.entityType} — {c.entityId} {c.note ? `(${c.note})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card stack">
        <p className="card-title">Referência legal (legislação/normas)</p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
          Extensão 1:1 opcional — só faz sentido para fontes de tipo OFICIAL/ADMINISTRATIVA.
        </p>
        {legalReference ? (
          <form action={updateLegalReferenceAction.bind(null, id)} className="form-grid">
            <div className="field">
              <label htmlFor="jurisdiction">Jurisdição</label>
              <input
                id="jurisdiction"
                name="jurisdiction"
                className="text-input"
                defaultValue={legalReference.jurisdiction ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="legalStatus">Status legal</label>
              <select
                id="legalStatus"
                name="legalStatus"
                className="text-input"
                defaultValue={legalReference.legalStatus}
              >
                {["VIGENTE", "REVOGADA", "SUSPENSA", "SUBSTITUIDA"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field field--full">
              <button type="submit" className="btn btn-secondary">
                Salvar referência legal
              </button>
            </div>
          </form>
        ) : (
          <form action={createLegalReferenceAction.bind(null, id)} className="form-grid">
            <div className="field">
              <label htmlFor="jurisdiction">Jurisdição</label>
              <input
                id="jurisdiction"
                name="jurisdiction"
                className="text-input"
                placeholder="ex.: Brasil"
              />
            </div>
            <div className="field">
              <label htmlFor="legalStatus">Status legal</label>
              <select
                id="legalStatus"
                name="legalStatus"
                className="text-input"
                defaultValue="VIGENTE"
              >
                {["VIGENTE", "REVOGADA", "SUSPENSA", "SUBSTITUIDA"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field field--full">
              <button type="submit" className="btn btn-secondary">
                Criar referência legal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
