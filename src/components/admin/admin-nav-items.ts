/**
 * Itens do menu administrativo (Módulo 12, seção 3 do prompt) — cada um com
 * rota real e serviços de domínio reais por trás (mesma disciplina do
 * `nav-items.ts` do Módulo 11: nenhuma rota sem backend correspondente).
 * Arquivo próprio, não uma extensão de `src/components/nav-items.ts` — os
 * dois menus (aluno/admin) são áreas distintas, com guards de acesso
 * distintos (`getCurrentActor` vs. `getCurrentAdminActor`).
 *
 * `icon` é um componente do `lucide-react` (fase "tirar emoji" — mesmo
 * padrão já usado em `nav-items.ts`: emoji não são usados como ícone da
 * navegação).
 */
import {
  LayoutDashboard,
  Brain,
  Paperclip,
  HelpCircle,
  FileText,
  Compass,
  Library,
  Newspaper,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/knowledge", label: "Base de Conhecimento", icon: Brain },
  { href: "/admin/sources", label: "Fontes e Procedência", icon: Paperclip },
  { href: "/admin/questions", label: "Questões", icon: HelpCircle },
  { href: "/admin/exams", label: "Provas", icon: FileText },
  { href: "/admin/pedagogy", label: "Trilhas e Lições", icon: Compass },
  { href: "/admin/library", label: "Biblioteca", icon: Library },
  { href: "/admin/current-affairs", label: "Atualidades", icon: Newspaper },
  { href: "/admin/audit", label: "Auditoria", icon: ClipboardList },
];
