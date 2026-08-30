/**
 * Desbloqueio de conteúdo (Módulo 8, seções 19/20) — deriva
 * LOCKED/AVAILABLE/COMPLETED/MASTERED exclusivamente dos relacionamentos
 * pedagógicos já existentes (`TrackArea`/`AreaUnit`/`UnitStage`/
 * `StageLesson`, todos com `order`) e do `LessonProgress` do usuário. NÃO
 * existe campo de "pré-requisito" no schema (confirmado na análise inicial —
 * ver docs/MODULO-8.md) e nenhuma migration foi necessária para isto: a
 * ordem já persistida em cada tabela de junção É o pré-requisito — uma
 * lição libera a próxima na mesma sequência publicada da trilha.
 *
 * Vocabulário de saída (`LessonAvailabilityStatus`) usa deliberadamente as
 * MESMAS palavras de `ProgressStatus` (schema, dono de `Progress` por Stage)
 * — é o vocabulário pedido pelo prompt do módulo — mas NÃO reaproveita esse
 * enum do Prisma: `Progress`/`ProgressStatus` continuam sem nenhum serviço
 * escrevendo neles (reservados para gamificação futura); aqui o resultado é
 * sempre CALCULADO em memória, nunca persistido.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { LessonProgressStatus, PublicationStatus } from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { getFullTrack } from "./pedagogy-query.service";
import { assertOwnLearningDataOrAdmin } from "./learning-privacy";

export type LessonAvailabilityStatus = "LOCKED" | "AVAILABLE" | "COMPLETED" | "MASTERED";

export interface LessonSequenceRef {
  lessonId: string;
  stageId: string;
  unitId: string;
  areaId: string;
  trackId: string;
}

export interface LessonAvailability extends LessonSequenceRef {
  status: LessonAvailabilityStatus;
  reason: string;
}

/**
 * Sequência linear das lições PUBLICADAS de uma trilha, na ordem estrutural
 * (`TrackArea.order` → `AreaUnit.order` → `UnitStage.order` →
 * `StageLesson.order`) — só containers e lições já publicados entram na
 * sequência (um aluno nunca vê rascunho, seção 13, então rascunho também não
 * participa do encadeamento de desbloqueio).
 */
export async function getPublishedLessonSequence(trackId: string): Promise<LessonSequenceRef[]> {
  const track = await getFullTrack(trackId);
  if (!track) throw new NotFoundError(`Track "${trackId}" não encontrada.`);

  const sequence: LessonSequenceRef[] = [];
  for (const trackArea of track.areas) {
    if (trackArea.area.status !== PublicationStatus.PUBLISHED) continue;
    for (const areaUnit of trackArea.area.units) {
      if (areaUnit.unit.status !== PublicationStatus.PUBLISHED) continue;
      for (const unitStage of areaUnit.unit.stages) {
        if (unitStage.stage.status !== PublicationStatus.PUBLISHED) continue;
        for (const stageLesson of unitStage.stage.lessons) {
          if (stageLesson.lesson.status !== PublicationStatus.PUBLISHED) continue;
          sequence.push({
            lessonId: stageLesson.lesson.id,
            stageId: unitStage.stage.id,
            unitId: areaUnit.unit.id,
            areaId: trackArea.area.id,
            trackId: track.id,
          });
        }
      }
    }
  }
  return sequence;
}

/**
 * Disponibilidade de TODAS as lições publicadas de uma trilha para um
 * usuário, numa única passada (seção 34: "evitar N+1") — duas consultas ao
 * todo (`getFullTrack` + um `findMany` de `LessonProgress` em lote), nunca
 * uma consulta por lição.
 */
export async function getTrackLessonAvailability(
  actor: Actor,
  targetUserId: string,
  trackId: string,
): Promise<LessonAvailability[]> {
  assertOwnLearningDataOrAdmin(actor, targetUserId);

  const sequence = await getPublishedLessonSequence(trackId);
  const progresses = await prisma.lessonProgress.findMany({
    where: { userId: targetUserId, lessonId: { in: sequence.map((s) => s.lessonId) } },
  });
  const progressByLessonId = new Map(progresses.map((p) => [p.lessonId, p]));

  const result: LessonAvailability[] = [];
  let previousDone = true; // nada antes da primeira lição — sempre disponível.
  for (const [index, ref] of sequence.entries()) {
    const own = progressByLessonId.get(ref.lessonId);
    const ownDone =
      own?.status === LessonProgressStatus.COMPLETED ||
      own?.status === LessonProgressStatus.MASTERED;

    let status: LessonAvailabilityStatus;
    let reason: string;
    if (own?.status === LessonProgressStatus.MASTERED) {
      status = "MASTERED";
      reason = "Lição já dominada.";
    } else if (own?.status === LessonProgressStatus.COMPLETED) {
      status = "COMPLETED";
      reason = "Lição já concluída.";
    } else if (previousDone) {
      status = "AVAILABLE";
      reason =
        index === 0
          ? "É a primeira lição publicada da trilha."
          : "Liberada após concluir a lição anterior na sequência publicada da trilha.";
    } else {
      status = "LOCKED";
      reason = "A lição anterior na sequência publicada da trilha ainda não foi concluída.";
    }

    result.push({ ...ref, status, reason });
    previousDone = ownDone;
  }
  return result;
}

/** Disponibilidade de UMA lição específica dentro de uma trilha — reaproveita `getTrackLessonAvailability` (seção 24: não duplicar). */
export async function getLessonAvailability(
  actor: Actor,
  targetUserId: string,
  trackId: string,
  lessonId: string,
): Promise<LessonAvailability> {
  const all = await getTrackLessonAvailability(actor, targetUserId, trackId);
  const entry = all.find((e) => e.lessonId === lessonId);
  if (!entry) {
    throw new NotFoundError(
      `Lesson "${lessonId}" não faz parte da sequência publicada da trilha "${trackId}".`,
    );
  }
  return entry;
}
