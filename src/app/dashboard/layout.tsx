import { Header } from "@/components/Header";
import { SidebarNav, BottomNav } from "@/components/SidebarNav";
import { requireSessionActor } from "@/server/auth/session";

/**
 * Casca do dashboard (Módulo 11, seção 5) — header + sidebar (desktop) /
 * navegação inferior (mobile), envolvendo todas as rotas `/dashboard/*`.
 *
 * `requireSessionActor()` (etapa de consolidação) roda para TODA requisição
 * a `/dashboard/*` antes de qualquer página renderizar — sem sessão válida,
 * redireciona para `/login` aqui mesmo, defesa em profundidade além do que
 * cada página já faz ao resolver seu próprio Actor. O `Actor` em si não é
 * repassado como prop (cada página resolve o seu, mesmo padrão do Módulo
 * 11) — esta chamada é só o guard de acesso.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await requireSessionActor();

  return (
    <>
      <Header />
      <div className="app-shell">
        <aside className="app-sidebar">
          <SidebarNav />
        </aside>
        <main className="app-main">{children}</main>
      </div>
      <BottomNav />
    </>
  );
}
