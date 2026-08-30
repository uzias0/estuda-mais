"use server";

/**
 * Server Actions de execução de lição (Módulo 11, seções 15-17/46) — camada
 * FINA sobre o Módulo 8 (progresso) e o Módulo 9 (gamificação). Depois de
 * concluir a lição de verdade (`completeLesson`), processa o evento de
 * gamificação real (`processLessonCompletionEvent`) — mesma sequência que
 * o Módulo 9 já previa ("chamado explicitamente depois da ação real") — e
 * busca o próximo passo (`getNextStudyAction`, Módulo 10) para a tela de
 * conclusão. Nenhum XP/progresso é calculado aqui.
 */
import { requireSessionActor } from "@/server/auth/session";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import {
  startLesson,
  submitLessonActivity,
  completeLesson,
  getLessonSession,
} from "@/modules/pedagogy/server/services/lesson-execution.service";
import { processLessonCompletionEvent } from "@/modules/gamification/server/services/gamification-events.service";
import { getNextStudyAction } from "@/modules/study-engine/server/services/study-plan.service";

export async function startLessonAction(lessonId: string) {
  const actor = await requireSessionActor();
  return startLesson(actor, lessonId);
}

export async function getLessonSessionAction(lessonId: string) {
  const actor = await requireSessionActor();
  return getLessonSession(actor, lessonId);
}

export async function submitLessonActivityAction(input: {
  lessonId: string;
  blockId: string;
  answerData?: AttemptAnswerData;
  timeSpentMs?: number;
}) {
  const actor = await requireSessionActor();
  return submitLessonActivity(actor, input);
}

export async function completeLessonAction(lessonId: string) {
  const actor = await requireSessionActor();
  const completed = await completeLesson(actor, lessonId);
  const gamification = completed.lessonProgressId
    ? await processLessonCompletionEvent(actor, completed.lessonProgressId)
    : null;
  const nextAction = await getNextStudyAction(actor, actor.userId);
  return { completed, gamification, nextAction };
}
