/**
 * Missões semanais (Módulo 11, mesmo padrão de `/dashboard/conquistas`) —
 * `getWeeklyMissionsStatus` já lê E concede a recompensa de qualquer
 * missão recém-cumprida (mesmo padrão de `applyXpToDailyGoal`); esta
 * página só apresenta o resultado, nenhum cálculo aqui.
 */
export const dynamic = "force-dynamic";

import { BookOpen, CheckCircle2, Star, CalendarDays, Target, Gem } from "lucide-react";
import { requireSessionActor } from "@/server/auth/session";
import { getWeeklyMissionsStatus } from "@/modules/gamification/server/services/weekly-missions.service";
import { ProgressBar } from "@/components/ProgressBar";
import { formatInteger } from "@/lib/format";

const MISSION_ICON: Record<string, typeof BookOpen> = {
  LESSONS_COMPLETED_WEEK: BookOpen,
  QUESTIONS_CORRECT_WEEK: CheckCircle2,
  XP_EARNED_WEEK: Star,
  DAYS_STUDIED_WEEK: CalendarDays,
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
        {missions.map(({ mission, current, target, met, progressPercentage, rewarded }) => {
          const MissionIcon = MISSION_ICON[mission.type] ?? Target;
          return (
            <div
              key={mission.id}
              className={`card stack ${met ? "achievement-card--unlocked" : ""}`}
            >
              <div className="row-wrap" style={{ justifyContent: "space-between" }}>
                <span
                  style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <MissionIcon size={18} color="var(--color-brand)" aria-hidden="true" />{" "}
                  {mission.title}
                </span>
                {met ? (
                  <span
                    className="badge badge-success"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    Concluída <CheckCircle2 size={14} aria-hidden="true" />
                  </span>
                ) : null}
              </div>
              <ProgressBar
                value={progressPercentage}
                label={`${formatInteger(Math.min(current, target))} / ${formatInteger(target)}`}
                tone={met ? "success" : "brand"}
              />
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Recompensa: +{mission.xpReward} XP · +{mission.gemReward}{" "}
                <Gem
                  size={14}
                  color="var(--color-gem)"
                  fill="var(--color-gem)"
                  aria-hidden="true"
                />
                {rewarded ? " — já creditada" : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
