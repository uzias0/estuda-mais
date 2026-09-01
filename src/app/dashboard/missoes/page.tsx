/**
 * Missões semanais (Módulo 11, mesmo padrão de `/dashboard/conquistas`) —
 * `getWeeklyMissionsStatus` já lê E concede a recompensa de qualquer
 * missão recém-cumprida (mesmo padrão de `applyXpToDailyGoal`); esta
 * página só apresenta o resultado, nenhum cálculo aqui.
 */
export const dynamic = "force-dynamic";

import { requireSessionActor } from "@/server/auth/session";
import { getWeeklyMissionsStatus } from "@/modules/gamification/server/services/weekly-missions.service";
import { ProgressBar } from "@/components/ProgressBar";
import { formatInteger } from "@/lib/format";

const MISSION_ICON: Record<string, string> = {
  LESSONS_COMPLETED_WEEK: "📚",
  QUESTIONS_CORRECT_WEEK: "✅",
  XP_EARNED_WEEK: "⭐",
  DAYS_STUDIED_WEEK: "🗓️",
};

function formatDaysRemaining(weekEndsAt: Date): string {
  const ms = weekEndsAt.getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  if (days <= 0) return "renova hoje";
  if (days === 1) return "renova em 1 dia";
  return `renova em ${days} dias`;
}

export default async function MissoesPage() {
  const actor = await requireSessionActor();
  const { missions, weekEndsAt } = await getWeeklyMissionsStatus(actor);

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Missões da semana</h1>
        <span className="badge badge-muted">{formatDaysRemaining(weekEndsAt)}</span>
      </div>

      <div className="stack">
        {missions.map(({ mission, current, target, met, progressPercentage, rewarded }) => (
          <div key={mission.id} className={`card stack ${met ? "achievement-card--unlocked" : ""}`}>
            <div className="row-wrap" style={{ justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700 }}>
                {MISSION_ICON[mission.type] ?? "🎯"} {mission.title}
              </span>
              {met ? <span className="badge badge-success">Concluída ✅</span> : null}
            </div>
            <ProgressBar
              value={progressPercentage}
              label={`${formatInteger(Math.min(current, target))} / ${formatInteger(target)}`}
              tone={met ? "success" : "brand"}
            />
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
              Recompensa: +{mission.xpReward} XP · +{mission.gemReward} 💎
              {rewarded ? " — já creditada" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
