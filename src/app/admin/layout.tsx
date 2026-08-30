import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebarNav, AdminMobileNav } from "@/components/admin/AdminSidebarNav";
import { requireAdminSessionActor } from "@/server/auth/session";

/**
 * Casca da área administrativa (Módulo 12, seção 3/14) — mesmo padrão
 * estrutural de `src/app/dashboard/layout.tsx`.
 *
 * Etapa de consolidação: `requireAdminSessionActor()` (autenticação real por
 * sessão) substitui o antigo `getCurrentAdminActor()` (mock de dev, Módulo
 * 12) como autoridade — sem sessão válida, `/login`; sessão válida mas sem
 * `CURATOR_ROLES` (STUDENT), `/dashboard`. `assertAdminAreaAccess`
 * continua sendo a MESMA função reaproveitada por `requireAdminSessionActor`
 * internamente (nenhuma regra duplicada); `getCurrentAdminActor`
 * (`devActor.ts`) permanece só para os testes de integração.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const actor = await requireAdminSessionActor();

  return (
    <>
      <AdminHeader actor={actor} />
      <AdminMobileNav />
      <div className="app-shell">
        <aside className="app-sidebar">
          <AdminSidebarNav />
        </aside>
        <main className="app-main">{children}</main>
      </div>
    </>
  );
}
