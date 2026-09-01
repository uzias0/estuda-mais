/**
 * Cabeçalho do dashboard (Módulo 11, seção 5) — sem busca/notificações
 * funcionais ainda (fora do escopo daquele módulo — só o espaço reservado
 * no layout, seção 51: "foco na área autenticada do estudante", não em
 * funcionalidades novas de produto).
 *
 * Botão de saída (etapa de consolidação, seção 18): `signOutAction` real,
 * destrói a sessão no servidor e limpa o cookie — não é só navegação.
 *
 * Fase "vidas/joias": virou Server Component ASSÍNCRONO (antes era
 * estático) só para buscar baterias/joias atuais — mesmo padrão do resto
 * do app ("cada página resolve o seu Actor", Módulo 11), nenhum estado
 * novo passado por prop. Indicador só de LEITURA: perder/recarregar
 * bateria acontece em `LessonRunner`/`lesson-actions.ts`, nunca aqui.
 */
import Link from "next/link";
import { Brain, Bell, LogOut } from "lucide-react";
import { signOutAction } from "@/server/actions/auth-actions";
import { requireSessionActor } from "@/server/auth/session";
import { getHeartsState } from "@/modules/gamification/server/services/hearts.service";
import { getGemBalanceForActor } from "@/modules/gamification/server/services/gems.service";
import { formatInteger } from "@/lib/format";

export async function Header() {
  const actor = await requireSessionActor();
  const [hearts, gemBalance] = await Promise.all([
    getHeartsState(actor),
    getGemBalanceForActor(actor),
  ]);

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
        <span
          className="badge badge-muted"
          title={`${hearts.current} de ${hearts.max} baterias`}
          aria-label={`${hearts.current} de ${hearts.max} baterias`}
        >
          ❤️ {formatInteger(hearts.current)}
        </span>
        <span
          className="badge badge-muted"
          title={`${gemBalance} joia(s)`}
          aria-label={`${gemBalance} joia(s)`}
        >
          💎 {formatInteger(gemBalance)}
        </span>
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
