/**
 * Caminho da trilha (fase de redesign visual, seção 9) — estrutura real
 * (`getFullTrack`, Módulo 4) + disponibilidade real por lição
 * (`getTrackLessonAvailability`, Módulo 8) — nenhuma regra de desbloqueio
 * nova (seção 31/35: "o bloqueio deve vir do Módulo 8", "a interface só
 * consome dados"). Antes: lista aninhada estilo painel administrativo.
 * Agora: `LearningPath`, mesmo dado, apresentação em caminho visual.
 */
import { Check, Star, Play, Lock } from "lucide-react";
import { requireSessionActor } from "@/server/auth/session";
import { getFullTrack } from "@/modules/pedagogy/server/services/pedagogy-query.service";
import { getTrackLessonAvailability } from "@/modules/pedagogy/server/services/learning-unlock.service";
import { getLesson } from "@/modules/pedagogy/server/services/lesson.service";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { LearningPath } from "@/components/LearningPath";
import { resolveCharacterForLesson } from "@/lib/characters";

export default async function TrackDetailPage({
  params,
}: PageProps<"/dashboard/trilhas/[trackId]">) {
  const { trackId } = await params;
  const actor = await requireSessionActor();
  const track = await getFullTrack(trackId);

  if (!track || track.status !== "PUBLISHED") {
    return (
      <div className="page-container">
        <EmptyState title="Esta trilha não está disponível." />
      </div>
    );
  }

  const availability = await getTrackLessonAvailability(actor, actor.userId, trackId);
  const statusByLessonId = new Map(availability.map((entry) => [entry.lessonId, entry]));

  // Personagem "apontando" para a primeira lição AVAILABLE da sequência
  // (mesma ordem estrutural que `getTrackLessonAvailability` já devolve) —
  // resolvido por `resolveCharacterForLesson` (Lesson→Concept→Theory→
  // School), o mesmo mecanismo já usado em `/dashboard/licoes/[lessonId]`,
  // nenhuma autoridade nova.
  const currentLessonId = availability.find((entry) => entry.status === "AVAILABLE")?.lessonId;
  const currentLesson = currentLessonId ? await getLesson(currentLessonId) : null;
  const currentCharacter = currentLesson
    ? await resolveCharacterForLesson(currentLesson)
    : undefined;

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{track.name}</h1>

      <LearningPath
        data={track}
        statusByLessonId={statusByLessonId}
        currentCharacter={currentCharacter}
      />

      <Badge tone="muted">
        <span className="row-wrap" style={{ gap: 10, fontWeight: 600 }}>
          <span className="row-wrap" style={{ gap: 4 }}>
            <Check size={14} strokeWidth={2.5} aria-hidden="true" /> concluída
          </span>
          <span className="row-wrap" style={{ gap: 4 }}>
            <Star size={14} strokeWidth={2.5} aria-hidden="true" /> dominada
          </span>
          <span className="row-wrap" style={{ gap: 4 }}>
            <Play size={14} strokeWidth={2.5} aria-hidden="true" /> disponível
          </span>
          <span className="row-wrap" style={{ gap: 4 }}>
            <Lock size={14} strokeWidth={2.5} aria-hidden="true" /> bloqueada
          </span>
        </span>
      </Badge>
    </div>
  );
}
