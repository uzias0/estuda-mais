/**
 * Cabeçalho do dashboard (Módulo 11, seção 5) — Server Component estático,
 * sem busca/notificações funcionais ainda (fora do escopo deste módulo —
 * só o espaço reservado no layout, seção 51: "foco na área autenticada do
 * estudante", não em funcionalidades novas de produto).
 *
 * Botão de saída (etapa de consolidação, seção 18): `signOutAction` real,
 * destrói a sessão no servidor e limpa o cookie — não é só navegação.
 */
import Link from "next/link";
import { Brain, Bell, LogOut } from "lucide-react";
import { signOutAction } from "@/server/actions/auth-actions";

export function Header() {
  return (
    <header className="app-header">
      <Link href="/dashboard" className="app-header-brand">
        <Brain aria-hidden="true" size={22} strokeWidth={2.25} />
        <span>Estuda+</span>
      </Link>
      <div className="app-header-search">
        <input
          type="search"
          placeholder="Buscar questões, conceitos, livros..."
          aria-label="Buscar"
          disabled
        />
      </div>
      <div className="app-header-actions">
        <span className="app-header-icon-btn" aria-hidden="true">
          <Bell size={19} strokeWidth={2.25} />
        </span>
        <form action={signOutAction}>
          <button type="submit" className="app-header-icon-btn" title="Sair" aria-label="Sair">
            <LogOut size={19} strokeWidth={2.25} />
          </button>
        </form>
      </div>
    </header>
  );
}
