/**
 * Biblioteca (Módulo 11, seção 25) — só `LibraryItem` PUBLICADO (Módulo 7).
 * Filtro "gratuito" é uma seleção sobre a lista já publicada (não decide
 * nada de negócio novo — `isFree`/`freeAccessReason` já vêm gravados e
 * validados pelo Módulo 7 no momento da publicação).
 */
import Link from "next/link";
import { listLibraryItems } from "@/modules/curation/server/services/library.service";
import { listLibraryByDiscipline } from "@/modules/curation/server/services/library-query.service";
import { listDisciplines } from "@/modules/knowledge/server/services/discipline.service";
import { libraryMaterialTypeLabel } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";

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

export default async function BibliotecaPage({ searchParams }: PageProps<"/dashboard/biblioteca">) {
  const params = await searchParams;
  const str = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;
  const disciplineId = str("disciplineId");
  const materialType = str("materialType");
  const onlyFree = str("gratuito") === "true";

  const [items, disciplines] = await Promise.all([
    disciplineId
      ? listLibraryByDiscipline(disciplineId, { take: 50 })
      : listLibraryItems({ status: "PUBLISHED", materialType: materialType as never, take: 50 }),
    listDisciplines({ take: 50 }),
  ]);

  const visible = onlyFree ? items.filter((item) => item.isFree) : items;

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Biblioteca</h1>

      <form method="GET" className="card row-wrap">
        <select
          name="disciplineId"
          defaultValue={disciplineId ?? ""}
          className="text-input"
          style={{ maxWidth: 220 }}
        >
          <option value="">Disciplina</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          name="materialType"
          defaultValue={materialType ?? ""}
          className="text-input"
          style={{ maxWidth: 220 }}
        >
          <option value="">Tipo</option>
          {MATERIAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {libraryMaterialTypeLabel(t)}
            </option>
          ))}
        </select>
        <label className="option-row" style={{ flexShrink: 0 }}>
          <input type="checkbox" name="gratuito" value="true" defaultChecked={onlyFree} />
          <span>Só gratuitos</span>
        </label>
        <button type="submit" className="btn btn-primary">
          Filtrar
        </button>
      </form>

      {visible.length === 0 ? (
        <EmptyState title="Nenhum material encontrado com estes filtros." />
      ) : (
        <div className="grid-cards">
          {visible.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/biblioteca/${item.id}`}
              className="card card--tight"
            >
              <div className="row-wrap" style={{ justifyContent: "space-between" }}>
                <Badge tone="muted">{libraryMaterialTypeLabel(item.materialType)}</Badge>
                {item.isFree ? <Badge tone="success">GRATUITO</Badge> : null}
              </div>
              <p style={{ marginTop: 10, fontWeight: 700 }}>{item.title}</p>
              {item.authorName ? (
                <p style={{ color: "var(--color-text-muted)", marginTop: 4, fontSize: "0.9rem" }}>
                  {item.authorName}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
