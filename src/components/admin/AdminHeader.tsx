/**
 * Cabeçalho da área administrativa (Módulo 12) — mesmo padrão visual de
 * `src/components/Header.tsx` (Módulo 11), com marca/branding própria da
 * curadoria e um link explícito de volta à experiência do aluno. Recebe o
 * `Actor` já resolvido pelo layout (nenhuma consulta própria) só para
 * exibir, de forma transparente, QUEM está "logado" nesta área — o mock de
 * desenvolvimento (`getCurrentAdminActor`, ver `docs/MODULO-12.md`), nunca
 * escondido do usuário.
 */
import Link from "next/link";
import { Wrench, GraduationCap, LogOut } from "lucide-react";
import type { Actor } from "@/server/auth/authorize";
import { Badge } from "@/components/Badge";
import { signOutAction } from "@/server/actions/auth-actions";

export function AdminHeader({ actor }: { actor: Actor }) {
  return (
    <header className="app-header">
      <Link href="/admin" className="app-header-brand">
        <Wrench aria-hidden="true" size={22} strokeWidth={2.25} />
        <span>Estuda+ Curadoria</span>
      </Link>
      <div className="app-header-search">
        <input
          type="search"
          placeholder="Buscar conteúdo administrativo..."
          aria-label="Buscar"
          disabled
        />
      </div>
      <div className="app-header-actions" style={{ gap: "var(--space-3)" }}>
        <Badge tone={actor.role === "ADMIN" ? "brand" : "muted"}>{actor.role}</Badge>
        <Link href="/dashboard" className="app-header-icon-btn" title="Voltar para o app do aluno">
          <GraduationCap size={19} strokeWidth={2.25} aria-hidden="true" />
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="app-header-icon-btn" title="Sair" aria-label="Sair">
            <LogOut size={19} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </form>
      </div>
    </header>
  );
}
