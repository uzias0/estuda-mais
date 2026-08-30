"use client";

/**
 * Navegação administrativa (Módulo 12) — mesmo padrão de
 * `src/components/SidebarNav.tsx` (Módulo 11): Client Component só porque
 * precisa de `usePathname` para destacar o item ativo; nenhum dado de
 * domínio é buscado aqui. Renderiza a sidebar (desktop, `.app-sidebar`) e a
 * navegação compacta de telas menores (`.admin-mobile-nav`) a partir da
 * mesma lista (`ADMIN_NAV_ITEMS`), sem duplicar a definição dos itens.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "./admin-nav-items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="sidebar-nav" aria-label="Navegação administrativa">
      <ul className="sidebar-nav-list">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="sidebar-nav-link"
                data-active={active ? "true" : undefined}
                aria-current={active ? "page" : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  return (
    <nav className="admin-mobile-nav" aria-label="Navegação administrativa (telas menores)">
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active ? "true" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
