/**
 * Painel administrativo (Módulo 12, seção 4) — números reais, direto do
 * banco via `getAdminDashboardStats` (consulta mínima nova, ver
 * `docs/MODULO-12.md`). Nenhum número fictício: cada contagem é um
 * `prisma.<model>.count(...)` real.
 *
 * `force-dynamic`: mesma razão de todas as páginas do Módulo 11 — dados
 * mudam a cada mutação de curadoria, não podem ficar congelados no build.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAdminDashboardStats } from "@/modules/curation/server/services/admin-dashboard-stats.service";
import { formatInteger } from "@/lib/format";

const ENTITY_ROWS: Array<{
  label: string;
  href: string;
  key: keyof Awaited<ReturnType<typeof getAdminDashboardStats>>;
}> = [
  { label: "Conceitos", href: "/admin/knowledge/concepts", key: "concepts" },
  { label: "Teorias", href: "/admin/knowledge/theories", key: "theories" },
  { label: "Disciplinas", href: "/admin/knowledge/disciplines", key: "disciplines" },
  { label: "Escolas/correntes", href: "/admin/knowledge/schools", key: "schools" },
  { label: "Autores/pesquisadores", href: "/admin/knowledge/people", key: "people" },
  { label: "Obras", href: "/admin/knowledge/works", key: "works" },
  { label: "Questões", href: "/admin/questions", key: "questions" },
  { label: "Edições de prova", href: "/admin/exams/editions", key: "examEditions" },
  { label: "Lições", href: "/admin/pedagogy/lessons", key: "lessons" },
  { label: "Trilhas", href: "/admin/pedagogy", key: "tracks" },
  { label: "Biblioteca", href: "/admin/library", key: "libraryItems" },
  { label: "Atualidades", href: "/admin/current-affairs", key: "currentAffairs" },
];

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Painel administrativo</h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Visão geral do conteúdo curado — todos os números abaixo vêm de consultas reais ao banco.
      </p>

      <div className="grid-cards">
        <div className="card card--tight stat-tile">
          <p className="card-title">Publicados</p>
          <p className="stat-number">{formatInteger(stats.totals.published)}</p>
        </div>
        <div className="card card--tight stat-tile">
          <p className="card-title">Em rascunho</p>
          <p className="stat-number">{formatInteger(stats.totals.draft)}</p>
        </div>
        <div className="card card--tight stat-tile">
          <p className="card-title">Arquivados</p>
          <p className="stat-number">{formatInteger(stats.totals.archived)}</p>
        </div>
        <div className="card card--tight stat-tile">
          <p className="card-title">Sem procedência suficiente</p>
          <p className="stat-number" style={{ color: "var(--color-danger)" }}>
            {formatInteger(stats.missingProvenance)}
          </p>
        </div>
        <div className="card card--tight stat-tile">
          <p className="card-title">Aguardando publicação</p>
          <p className="stat-number" style={{ color: "var(--color-warning)" }}>
            {formatInteger(stats.awaitingPublication)}
          </p>
        </div>
      </div>

      <section>
        <p className="card-title" style={{ marginBottom: 10 }}>
          Por tipo de conteúdo
        </p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Conteúdo</th>
                <th>Total</th>
                <th>Publicado</th>
                <th>Rascunho</th>
                <th>Arquivado</th>
              </tr>
            </thead>
            <tbody>
              {ENTITY_ROWS.map((row) => {
                const c = stats[row.key] as {
                  draft: number;
                  published: number;
                  archived: number;
                  total: number;
                };
                return (
                  <tr key={row.key}>
                    <td>
                      <Link href={row.href}>{row.label}</Link>
                    </td>
                    <td>{formatInteger(c.total)}</td>
                    <td>{formatInteger(c.published)}</td>
                    <td>{formatInteger(c.draft)}</td>
                    <td>{formatInteger(c.archived)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
