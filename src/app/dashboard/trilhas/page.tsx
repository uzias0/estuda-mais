/**
 * Trilhas (Módulo 11, seção 30) — trilhas PUBLICADAS (Módulo 4) com o
 * progresso real do aluno (`getTrackProgress`, Módulo 8) — nunca um
 * percentual calculado aqui.
 *
 * `force-dynamic`: evita pré-renderização estática (dados ficariam
 * congelados no momento do build).
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireSessionActor } from "@/server/auth/session";
import { listTracks } from "@/modules/pedagogy/server/services/track.service";
import { getTrackProgress } from "@/modules/pedagogy/server/services/learning-progress.service";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";

export default async function TrilhasPage() {
  const actor = await requireSessionActor();
  const tracks = await listTracks({ status: "PUBLISHED", take: 50 });

  if (tracks.length === 0) {
    return (
      <div className="page-container">
        <EmptyState title="Nenhuma trilha publicada ainda." />
      </div>
    );
  }

  const progressList = await Promise.all(
    tracks.map((track) => getTrackProgress(actor, actor.userId, track.id)),
  );

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Trilhas</h1>
      <div className="grid-cards">
        {tracks.map((track, index) => {
          const progress = progressList[index];
          return (
            <Link
              key={track.id}
              href={`/dashboard/trilhas/${track.id}`}
              className="card card--tight"
            >
              <p style={{ fontWeight: 700 }}>{track.name}</p>
              <div style={{ marginTop: 10 }}>
                <ProgressBar
                  value={progress.percentage}
                  label={`${progress.lessonsCompleted} de ${progress.lessonsTotal} lições`}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
