/**
 * Itens do menu principal (Módulo 11, seção 43) — cada um com rota real
 * (seção 43: "não criar páginas que não tenham backend correspondente" —
 * todas as rotas abaixo têm página e serviço de domínio reais, ver
 * docs/MODULO-11.md).
 *
 * `icon` é um componente do `lucide-react` (fase de redesign profundo,
 * seção 22: "não utilizar emojis como ícones principais da interface") —
 * substituiu os emoji usados até a fase anterior. Emoji continuam
 * aparecendo em textos/celebrações (reactions.ts, CharacterCelebration),
 * só a CHROME de navegação deixou de usá-los como ícone.
 */
import {
  Home,
  BookOpen,
  Compass,
  RotateCcw,
  HelpCircle,
  ClipboardList,
  Library,
  Newspaper,
  BarChart3,
  Trophy,
  User,
  Target,
  Crown,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/dashboard/estudar", label: "Estudar", icon: BookOpen },
  { href: "/dashboard/trilhas", label: "Trilhas", icon: Compass },
  { href: "/dashboard/revisao", label: "Revisão", icon: RotateCcw },
  { href: "/dashboard/questoes", label: "Questões", icon: HelpCircle },
  { href: "/dashboard/simulados", label: "Simulados", icon: ClipboardList },
  { href: "/dashboard/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/dashboard/atualidades", label: "Atualidades", icon: Newspaper },
  { href: "/dashboard/progresso", label: "Progresso", icon: BarChart3 },
  { href: "/dashboard/conquistas", label: "Conquistas", icon: Trophy },
  { href: "/dashboard/perfil", label: "Perfil", icon: User },
  // Adicionados na fase "missões/ranking" (pedido do usuário) — no FIM da
  // lista, de propósito: `BOTTOM_NAV_ITEMS` abaixo referencia os itens
  // anteriores por índice fixo, então inserir no meio quebraria essas
  // referências.
  { href: "/dashboard/missoes", label: "Missões", icon: Target },
  { href: "/dashboard/ranking", label: "Ranking", icon: Crown },
];

/**
 * Subconjunto para a navegação inferior no mobile (fase mobile/PWA, seção
 * 3) — os 5 destinos centrais de um app: Início, Estudar, Revisão,
 * Simulados, Perfil (troca `Conquistas` pelo `Perfil`, que passa a ser o
 * hub de conta/estatísticas — conquistas continuam a um toque de distância
 * a partir do próprio Perfil, e na lista completa do menu/sidebar).
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[3],
  NAV_ITEMS[5],
  NAV_ITEMS[10],
];
