"use client";

/**
 * Navegação principal (Módulo 11, seção 5/43/45) — Client Component só
 * porque precisa saber a rota atual (`usePathname`) para destacar o item
 * ativo; nenhum dado de domínio é buscado aqui (seção 45: "Client
 * Components apenas quando houver interatividade").
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="sidebar-nav" aria-label="Navegação principal">
      <ul className="sidebar-nav-list">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="sidebar-nav-link"
                data-active={active ? "true" : undefined}
                aria-current={active ? "page" : undefined}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={2.25} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Navegação principal (mobile)">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="bottom-nav-link"
            data-active={active ? "true" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={2.25} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
