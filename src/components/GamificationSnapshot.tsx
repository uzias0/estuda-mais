/**
 * Cards de gamificação (Módulo 11, seção 34) — puramente apresentacionais;
 * todo número recebido já foi calculado pelo Módulo 9
 * (`getGamificationSummary`). Nunca soma/deriva XP, nível ou streak aqui.
 */
import { Flame, Star, Target, BookOpen, Heart, Gem } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { formatInteger, formatPercentage } from "@/lib/format";
import type { getGamificationSummary } from "@/modules/gamification/server/services/gamification-summary.service";

type GamificationSummary = Awaited<ReturnType<typeof getGamificationSummary>>;

const cardTitleIconStyle = { display: "inline-flex", alignItems: "center", gap: 6 } as const;

export function GamificationSnapshot({ summary }: { summary: GamificationSummary }) {
  return (
    <div className="grid-cards fade-in-up">
      <div className="card card--tight">
        <p className="card-title" style={cardTitleIconStyle}>
          <Flame
            size={16}
            color="var(--color-streak)"
            fill="var(--color-streak)"
            aria-hidden="true"
          />
          Streak
        </p>
        <p style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 8 }}>
          {formatInteger(summary.streak.currentStreak)}{" "}
          <span style={{ fontSize: "1rem", color: "var(--color-text-muted)" }}>dia(s)</span>
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
          Melhor: {formatInteger(summary.streak.longestStreak)} dia(s)
        </p>
      </div>

      <div className="card card--tight">
        <p className="card-title" style={cardTitleIconStyle}>
          <Star size={16} color="var(--color-xp)" fill="var(--color-xp)" aria-hidden="true" />
          XP
        </p>
        <p style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 8 }}>
          {formatInteger(summary.xp.totalXp)}
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
          Nível {summary.xp.currentLevel}
          {summary.xp.nextLevel ? ` — próximo nível ${summary.xp.nextLevel}` : " (máximo)"}
        </p>
        <div style={{ marginTop: 10 }}>
          <ProgressBar value={summary.xp.progressPercentage} />
        </div>
      </div>

      <div className="card card--tight">
        <p className="card-title" style={cardTitleIconStyle}>
          <Target size={16} color="var(--color-brand)" aria-hidden="true" />
          Meta diária
        </p>
        <p style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 8 }}>
          {formatInteger(summary.dailyGoal.current)} / {formatInteger(summary.dailyGoal.target)} XP
        </p>
        <div style={{ marginTop: 10 }}>
          <ProgressBar
            value={summary.dailyGoal.percentage}
            tone={summary.dailyGoal.completed ? "success" : "brand"}
          />
        </div>
      </div>

      <div className="card card--tight">
        <p className="card-title" style={cardTitleIconStyle}>
          <BookOpen size={16} color="var(--color-brand)" aria-hidden="true" />
          Progresso
        </p>
        <p style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 8 }}>
          {formatInteger(summary.academicProgress.lessons.lessonsCompleted)}
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
          lição(ões) concluída(s) ·{" "}
          {formatPercentage(summary.academicProgress.lessons.accuracyPercentage)} de acerto
        </p>
      </div>

      <div className="card card--tight">
        <p className="card-title" style={cardTitleIconStyle}>
          <Heart
            size={16}
            color="var(--color-heart)"
            fill="var(--color-heart)"
            aria-hidden="true"
          />
          Baterias ·{" "}
          <Gem size={16} color="var(--color-gem)" fill="var(--color-gem)" aria-hidden="true" />
          Joias
        </p>
        <p style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 8 }}>
          {formatInteger(summary.hearts.current)}
          <span style={{ fontSize: "1rem", color: "var(--color-text-muted)" }}>
            {" "}
            / {formatInteger(summary.hearts.max)}
          </span>
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
          {formatInteger(summary.gemBalance)} joia(s)
          {summary.hearts.current < summary.hearts.max && summary.hearts.nextRegenAt
            ? " · recarregando aos poucos"
            : ""}
        </p>
      </div>
    </div>
  );
}
