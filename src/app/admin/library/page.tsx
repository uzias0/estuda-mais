export const dynamic = "force-dynamic";
import Link from "next/link";
import { listLibraryItems } from "@/modules/curation/server/services/library.service";
import { listSources } from "@/modules/curation/server/services/source.service";
import { createLibraryItemAction } from "@/server/actions/admin/library-actions";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import {
  publicationStatusLabel,
  libraryMaterialTypeLabel,
  freeAccessReasonLabel,
} from "@/lib/format";

const MATERIAL_TYPES = [
  "LIVRO",
  "EBOOK",
  "ARTIGO",
  "MONOGRAFIA",
  "TESE",
  "DISSERTACAO",
  "MATERIAL_DIDATICO",
  "DOCUMENTO",
  "OUTRO",
];
const FREE_REASONS = [
  "PUBLIC_DOMAIN",
  "OPEN_LICENSE",
  "AUTHOR_PROVIDED",
  "INSTITUTIONAL_ACCESS",
  "OFFICIAL_FREE_ACCESS",
];

export default async function LibraryPage() {
  const [items, sources] = await Promise.all([
    listLibraryItems({ take: 100 }),
    listSources({ take: 200 }),
  ]);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Biblioteca</h1>

      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Novo item</summary>
        <form
          action={createLibraryItemAction}
          className="stack"
          style={{ marginTop: "var(--space-4)" }}
        >
          <div className="form-grid">
            <div className="field field--full">
              <label htmlFor="title">Título</label>
              <input id="title" name="title" className="text-input" required />
            </div>
            <div className="field">
              <label htmlFor="materialType">Tipo de material</label>
              <select id="materialType" name="materialType" className="text-input" required>
                {MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {libraryMaterialTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="authorName">Autor</label>
              <input id="authorName" name="authorName" className="text-input" />
            </div>
            <div className="field">
              <label htmlFor="year">Ano</label>
              <input id="year" name="year" type="number" className="text-input" />
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
            <div className="field">
              <label htmlFor="freeAccessReason">Motivo do acesso gratuito</label>
              <select
                id="freeAccessReason"
                name="freeAccessReason"
                className="text-input"
                defaultValue=""
              >
                <option value="">— não gratuito —</option>
                {FREE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {freeAccessReasonLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="option-row" style={{ maxWidth: 260 }}>
            <input type="checkbox" name="isFree" />
            <span>Acesso gratuito</span>
          </label>
          <div className="field field--full">
            <label htmlFor="description">Descrição</label>
            <textarea id="description" name="description" className="text-input" rows={3} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
            Criar
          </button>
        </form>
      </details>

      {items.length === 0 ? (
        <EmptyState title="Nenhum item de biblioteca cadastrado ainda." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Gratuito</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/admin/library/${i.id}`}>{i.title}</Link>
                  </td>
                  <td>{libraryMaterialTypeLabel(i.materialType)}</td>
                  <td>{i.isFree ? "Sim" : "Não"}</td>
                  <td>
                    <Badge
                      tone={
                        i.status === "PUBLISHED"
                          ? "success"
                          : i.status === "ARCHIVED"
                            ? "muted"
                            : "warning"
                      }
                    >
                      {publicationStatusLabel(i.status)}
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
