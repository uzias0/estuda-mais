/**
 * Itens do menu administrativo (Módulo 12, seção 3 do prompt) — cada um com
 * rota real e serviços de domínio reais por trás (mesma disciplina do
 * `nav-items.ts` do Módulo 11: nenhuma rota sem backend correspondente).
 * Arquivo próprio, não uma extensão de `src/components/nav-items.ts` — os
 * dois menus (aluno/admin) são áreas distintas, com guards de acesso
 * distintos (`getCurrentActor` vs. `getCurrentAdminActor`).
 */
export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Painel", icon: "📊" },
  { href: "/admin/knowledge", label: "Base de Conhecimento", icon: "🧠" },
  { href: "/admin/sources", label: "Fontes e Procedência", icon: "📎" },
  { href: "/admin/questions", label: "Questões", icon: "❓" },
  { href: "/admin/exams", label: "Provas", icon: "📝" },
  { href: "/admin/pedagogy", label: "Trilhas e Lições", icon: "🧭" },
  { href: "/admin/library", label: "Biblioteca", icon: "📚" },
  { href: "/admin/current-affairs", label: "Atualidades", icon: "📰" },
  { href: "/admin/audit", label: "Auditoria", icon: "🗒️" },
];
