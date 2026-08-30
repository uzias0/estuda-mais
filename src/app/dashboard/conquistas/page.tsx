/**
 * Gamificação (Módulo 11, seção 33) — XP/nível/streak/meta (Módulo 9,
 * `getGamificationSummary`) + lista completa de conquistas desbloqueadas e
 * bloqueadas (`listAchievementsForUser`). Nenhum valor é manipulado aqui —
 * só leitura (seção 33: "nunca manipular diretamente esses valores").
 *
 * `force-dynamic`: evita pré-renderização estática (dados ficariam
 * congelados no momento do build).
 */
export const dynamic = "force-dynamic";

import { requireSessionActor } from "@/server/auth/session";
import { getGamificationSummary } from "@/modules/gamification/server/services/gamification-summary.service";
import { listAchievementsForUser } from "@/modules/gamification/server/services/achievement.service";
import { GamificationSnapshot } from "@/components/GamificationSnapshot";
import { ProgressBar } from "@/components/ProgressBar";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { CharacterMessage } from "@/components/characters/CharacterMessage";
import { ACHIEVEMENT_REACTION } from "@/components/characters/reactions";
import { NEUTRAL_CHARACTER } from "@/config/characters";
import { formatDate } from "@/lib/format";

export default async function ConquistasPage() {
  const actor = await requireSessionActor();
  const [summary, achievements] = await Promise.all([
    getGamificationSummary(actor, actor.userId),
    listAchievementsForUser(actor, actor.userId),
  ]);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Conquistas</h1>

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

      <section>
        <p className="card-title" style={{ marginBottom: 10 }}>
          Conquistas desbloqueadas
        </p>
        {achievements.unlocked.length > 0 ? (
          <CharacterMessage
            character={NEUTRAL_CHARACTER}
            expression={ACHIEVEMENT_REACTION.expression}
            message={ACHIEVEMENT_REACTION.message}
          />
        ) : null}
        {achievements.unlocked.length === 0 ? (
          <EmptyState title="Nenhuma conquista desbloqueada ainda." />
        ) : (
          <div className="grid-cards">
            {achievements.unlocked.map(({ achievement, unlockedAt }) => (
              <div
                key={achievement.id}
                className="card card--tight achievement-card--unlocked fade-in-up"
              >
                <Badge tone="success">🏆 Desbloqueada</Badge>
                <p style={{ marginTop: 10, fontWeight: 700 }}>{achievement.name}</p>
                <p style={{ color: "var(--color-text-muted)", marginTop: 4, fontSize: "0.85rem" }}>
                  {achievement.description}
                </p>
                <p style={{ color: "var(--color-text-subtle)", marginTop: 8, fontSize: "0.8rem" }}>
                  em {formatDate(unlockedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="card-title" style={{ marginBottom: 10 }}>
          Próximas conquistas
        </p>
        {achievements.upcoming.length === 0 ? (
          <EmptyState title="Nenhuma outra conquista disponível agora." />
        ) : (
          <div className="grid-cards">
            {achievements.upcoming.map(({ achievement, evaluation }) => (
              <div key={achievement.id} className="card card--tight achievement-card--locked">
                <Badge tone="muted">🔒 Bloqueada</Badge>
                <p style={{ marginTop: 10, fontWeight: 700 }}>{achievement.name}</p>
                <p style={{ color: "var(--color-text-muted)", marginTop: 4, fontSize: "0.85rem" }}>
                  {achievement.description}
                </p>
                <div style={{ marginTop: 10 }}>
                  <ProgressBar
                    value={evaluation.progressPercentage}
                    label={`${evaluation.current} / ${evaluation.target}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
