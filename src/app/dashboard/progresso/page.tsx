/**
 * Progresso (Módulo 11, seção 32) — consolida `getStudentProgress`
 * (lições/revisão/simulados, Módulo 9) e `getTrackProgress` por trilha
 * (Módulo 8); nenhum percentual é recalculado aqui.
 *
 * `force-dynamic`: evita pré-renderização estática (dados ficariam
 * congelados no momento do build).
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireSessionActor } from "@/server/auth/session";
import { getStudentProgress } from "@/modules/gamification/server/services/student-progress.service";
import { getTrackProgress } from "@/modules/pedagogy/server/services/learning-progress.service";
import { listTracks } from "@/modules/pedagogy/server/services/track.service";
import { formatPercentage, formatInteger } from "@/lib/format";
import { ProgressBar } from "@/components/ProgressBar";

export default async function ProgressoPage() {
  const actor = await requireSessionActor();
  const [progress, tracks] = await Promise.all([
    getStudentProgress(actor, actor.userId),
    listTracks({ status: "PUBLISHED", take: 50 }),
  ]);
  const trackProgress = await Promise.all(
    tracks.map((track) => getTrackProgress(actor, actor.userId, track.id)),
  );

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Progresso</h1>

      <div className="grid-cards">
        <div className="card card--tight">
          <p className="card-title">Lições</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 8 }}>
            {formatInteger(progress.lessons.lessonsCompleted)}
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            concluída(s) · {formatInteger(progress.lessons.lessonsMastered)} dominada(s)
          </p>
        </div>
        <div className="card card--tight">
          <p className="card-title">Questões</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 8 }}>
            {formatInteger(progress.lessons.questionsAnswered)}
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            {formatPercentage(progress.lessons.accuracyPercentage)} de acerto
          </p>
        </div>
        <div className="card card--tight">
          <p className="card-title">Revisões</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 8 }}>
            {formatInteger(progress.review.totalReviews)}
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            {formatPercentage(progress.review.accuracyPercentage)} de acerto ·{" "}
            {formatInteger(progress.review.masteredCount)} dominado(s)
          </p>
        </div>
        <div className="card card--tight">
          <p className="card-title">Simulados</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 8 }}>
            {progress.simulation.average !== null
              ? formatPercentage(progress.simulation.average)
              : "—"}
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            tendência: {progress.simulation.trend}
          </p>
        </div>
      </div>

      <section>
        <p className="card-title" style={{ marginBottom: 10 }}>
          Progresso por trilha
        </p>
        <div className="stack">
          {tracks.map((track, index) => (
            <Link
              key={track.id}
              href={`/dashboard/trilhas/${track.id}`}
              className="card card--tight"
            >
              <p style={{ fontWeight: 700 }}>{track.name}</p>
              <div style={{ marginTop: 8 }}>
                <ProgressBar
                  value={trackProgress[index].percentage}
                  label={`${trackProgress[index].lessonsCompleted} de ${trackProgress[index].lessonsTotal} lições`}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
