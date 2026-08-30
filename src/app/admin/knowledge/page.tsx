/**
 * Hub da Base de Conhecimento (Módulo 12) — só links reais para as 10
 * sub-áreas (6 genéricas + 4 bespoke: conceitos, pessoas, obras, relações).
 * Nenhum dado é buscado aqui; cada sub-página busca o que precisa.
 */
import Link from "next/link";

const AREAS = [
  { href: "/admin/knowledge/disciplines", label: "Disciplinas" },
  { href: "/admin/knowledge/schools", label: "Escolas/correntes" },
  { href: "/admin/knowledge/theories", label: "Teorias" },
  { href: "/admin/knowledge/concepts", label: "Conceitos" },
  { href: "/admin/knowledge/people", label: "Autores/pesquisadores" },
  { href: "/admin/knowledge/works", label: "Obras" },
  { href: "/admin/knowledge/periods", label: "Períodos históricos" },
  { href: "/admin/knowledge/developmental-stages", label: "Estágios de desenvolvimento" },
  { href: "/admin/knowledge/tags", label: "Tags" },
  { href: "/admin/knowledge/relations", label: "Relações acadêmicas" },
];

export default function KnowledgeHubPage() {
  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Base de Conhecimento</h1>
      <div className="grid-cards">
        {AREAS.map((area) => (
          <Link key={area.href} href={area.href} className="card card--tight">
            <p style={{ fontWeight: 700 }}>{area.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
