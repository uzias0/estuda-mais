/**
 * Perfil (fase mobile/PWA, seção 14) — tela de conta consolidada, um dos 5
 * destinos centrais da navegação inferior num app mobile. Só composição de
 * leituras já existentes (Módulo 9, `getGamificationSummary`) — nenhum
 * cálculo de XP/nível/streak paralelo; `Profile.name` é a única leitura
 * direta nova aqui (campo simples de exibição, não uma regra de negócio —
 * `Profile.xp`/`Profile.level` são deliberadamente ignorados, a autoridade
 * real é sempre `getGamificationSummary`, mesmo padrão de
 * `/dashboard/conquistas`).
 *
 * `force-dynamic`: dados por sessão, mesmo motivo de `/dashboard` e
 * `/dashboard/conquistas`.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Trophy, BarChart3 } from "lucide-react";
import { requireSessionActor } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getGamificationSummary } from "@/modules/gamification/server/services/gamification-summary.service";
import { getTwoFactorStatus } from "@/modules/auth/server/services/two-factor.service";
import { GamificationSnapshot } from "@/components/GamificationSnapshot";
import { CharacterMessage } from "@/components/characters/CharacterMessage";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { NEUTRAL_CHARACTER } from "@/config/characters";
import { ProgressBar } from "@/components/ProgressBar";
import { signOutAction } from "@/server/actions/auth-actions";
import { APP_VERSION } from "@/config/app-version";

export default async function PerfilPage() {
  const actor = await requireSessionActor();
  const [profile, summary, twoFactorStatus] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: actor.userId } }),
    getGamificationSummary(actor, actor.userId),
    getTwoFactorStatus(actor),
  ]);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Perfil</h1>

      <CharacterMessage
        character={NEUTRAL_CHARACTER}
        expression="happy"
        message={`Olá, ${profile?.name ?? "estudante"}! Aqui está o seu resumo.`}
      />

      <GamificationSnapshot summary={summary} />

      <div className="card">
        <p className="card-title">Nível {summary.xp.currentLevel}</p>
        <div style={{ marginTop: 10 }}>
          <ProgressBar
            value={summary.xp.progressPercentage}
            label={
              summary.xp.nextLevel
                ? `${summary.xp.xpIntoCurrentLevel} / ${summary.xp.nextLevelXp! - summary.xp.currentLevelXp} XP para o nível ${summary.xp.nextLevel}`
                : "Nível máximo alcançado"
            }
          />
        </div>
      </div>

      <div className="grid-cards">
        <Link
          href="/dashboard/conquistas"
          className="card card--tight"
          style={{ textDecoration: "none" }}
        >
          <p
            className="card-title"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Trophy size={16} color="var(--color-brand)" aria-hidden="true" /> Conquistas
          </p>
          <p style={{ marginTop: 8, fontWeight: 700 }}>Ver todas</p>
        </Link>
        <Link
          href="/dashboard/progresso"
          className="card card--tight"
          style={{ textDecoration: "none" }}
        >
          <p
            className="card-title"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <BarChart3 size={16} color="var(--color-brand)" aria-hidden="true" /> Progresso
          </p>
          <p style={{ marginTop: 8, fontWeight: 700 }}>Ver evolução</p>
        </Link>
      </div>

      <TwoFactorSettings initialEnabled={twoFactorStatus.enabled} />

      <section className="card stack">
        <p className="card-title">Conta</p>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-secondary btn-block">
            Sair
          </button>
        </form>
      </section>

      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        Estuda+ v{APP_VERSION}
      </p>
    </div>
  );
}
