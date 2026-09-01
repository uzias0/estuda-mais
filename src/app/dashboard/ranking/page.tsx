/**
 * Ranking semanal com divisões (Módulo 11, mesmo padrão de
 * `/dashboard/conquistas`) — `getWeeklyRanking` já calcula tudo
 * (divisão/ordem); esta página só apresenta.
 */
export const dynamic = "force-dynamic";

import { Medal, Gem, Crown, Trophy } from "lucide-react";
import { requireSessionActor } from "@/server/auth/session";
import { getWeeklyRanking } from "@/modules/gamification/server/services/weekly-ranking.service";
import { formatInteger } from "@/lib/format";

const DIVISION_ICON: Record<string, typeof Medal> = {
  bronze: Medal,
  prata: Medal,
  ouro: Medal,
  platina: Gem,
  diamante: Crown,
};

/** Cor por divisão — mesmo espírito das medalhas reais (bronze/prata/ouro),
 * platina e diamante ganham as cores já usadas em joia/destaque do app. */
const DIVISION_COLOR: Record<string, string> = {
  bronze: "#cd7f32",
  prata: "#a8a8b3",
  ouro: "#e8b923",
  platina: "var(--color-gem)",
  diamante: "var(--color-brand)",
};

function formatDaysRemaining(weekEndsAt: Date): string {
  const ms = weekEndsAt.getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  if (days <= 0) return "renova hoje";
  if (days === 1) return "renova em 1 dia";
  return `renova em ${days} dias`;
}

export default async function RankingPage() {
  const actor = await requireSessionActor();
  const { division, top, ownEntry, weekEndsAt, totalInDivision } = await getWeeklyRanking(actor);
  const ownEntryOutsideTop = ownEntry.rank > top.length;
  const DivisionIcon = DIVISION_ICON[division.id] ?? Trophy;
  const divisionColor = DIVISION_COLOR[division.id] ?? "var(--color-brand)";

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <DivisionIcon size={24} color={divisionColor} fill={divisionColor} aria-hidden="true" />{" "}
          Divisão {division.name}
        </h1>
        <span className="badge badge-muted">{formatDaysRemaining(weekEndsAt)}</span>
      </div>
      <p style={{ color: "var(--color-text-muted)" }}>
        {formatInteger(totalInDivision)} aluno(s) nesta divisão — ranqueados pelo XP ganho nesta
        semana.
      </p>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {top.map((entry) => (
          <div
            key={entry.userId}
            className="row-wrap"
            style={{
              justifyContent: "space-between",
              padding: "var(--space-3) var(--space-4)",
              borderBottom: "1px solid var(--color-border)",
              background: entry.isSelf ? "var(--color-brand-bg)" : "transparent",
            }}
          >
            <span style={{ fontWeight: entry.isSelf ? 800 : 600 }}>
              #{entry.rank} {entry.name}
              {entry.isSelf ? " (você)" : ""}
            </span>
            <span style={{ color: "var(--color-text-muted)" }}>
              {formatInteger(entry.xpThisWeek)} XP
            </span>
          </div>
        ))}
        {ownEntryOutsideTop ? (
          <div
            className="row-wrap"
            style={{
              justifyContent: "space-between",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-brand-bg)",
            }}
          >
            <span style={{ fontWeight: 800 }}>
              #{ownEntry.rank} {ownEntry.name} (você)
            </span>
            <span style={{ color: "var(--color-text-muted)" }}>
              {formatInteger(ownEntry.xpThisWeek)} XP
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
