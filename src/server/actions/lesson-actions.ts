"use server";

/**
 * Server Actions de execução de lição (Módulo 11, seções 15-17/46) — camada
 * FINA sobre o Módulo 8 (progresso) e o Módulo 9 (gamificação). Depois de
 * concluir a lição de verdade (`completeLesson`), processa o evento de
 * gamificação real (`processLessonCompletionEvent`) — mesma sequência que
 * o Módulo 9 já previa ("chamado explicitamente depois da ação real") — e
 * busca o próximo passo (`getNextStudyAction`, Módulo 10) para a tela de
 * conclusão. Nenhum XP/progresso é calculado aqui.
 *
 * Fase "vidas/joias" — o lado "gasto" (perder bateria, comprar recarga com
 * joia) mora AQUI, não em `gamification-events.service.ts`: precisa
 * acontecer em tempo real, a cada resposta errada, podendo BLOQUEAR a
 * próxima submissão — diferente de XP/joia de conclusão, que só é
 * concedido (nunca bloqueia nada) na conclusão da lição. `submitLessonActivity`
 * em si nunca é tocada para isto (mesma proibição do Módulo 9, seção 35) —
 * só lê o `isNewCompletion`/`isCorrect` que ela já devolve.
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
import {
  getHeartsState,
  loseHeart,
  refillHearts,
} from "@/modules/gamification/server/services/hearts.service";
import {
  debitGems,
  getGemBalanceForActor,
} from "@/modules/gamification/server/services/gems.service";
import { GEM_COST_PER_HEART, GEM_EVENT_TYPES } from "@/config/hearts";

export async function startLessonAction(lessonId: string) {
  const actor = await requireSessionActor();
  return startLesson(actor, lessonId);
}

export async function getLessonSessionAction(lessonId: string) {
  const actor = await requireSessionActor();
  return getLessonSession(actor, lessonId);
}

/**
 * Responde uma atividade da lição, com o guarda de bateria por cima
 * (seção "vidas/joias"): sem bateria, a submissão é BLOQUEADA antes mesmo
 * de chamar `submitLessonActivity` — nenhum `QuestionAttempt`/progresso é
 * gravado, o estudante precisa recarregar (esperar ou gastar joia) para
 * continuar. Uma resposta ERRADA nova (`isNewCompletion`, nunca um reenvio
 * de bloco já respondido) consome 1 bateria depois de gravada.
 */
export async function submitLessonActivityAction(input: {
  lessonId: string;
  blockId: string;
  answerData?: AttemptAnswerData;
  timeSpentMs?: number;
}) {
  const actor = await requireSessionActor();

  const heartsBefore = await getHeartsState(actor);
  if (heartsBefore.current <= 0) {
    return { blocked: true as const, hearts: heartsBefore };
  }

  const result = await submitLessonActivity(actor, input);
  const hearts =
    result.isNewCompletion && result.isCorrect === false
      ? await loseHeart(actor.userId)
      : heartsBefore;

  return { ...result, blocked: false as const, hearts };
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

/**
 * Recarrega baterias na hora, gastando joia (seção "vidas/joias").
 * `idempotencyKey` protege contra reenvio de rede da MESMA compra — não
 * contra um duplo-clique real do usuário, que o botão do cliente evita
 * desabilitando-se durante o pedido (mesmo padrão já usado em
 * `LoginForm`/`SignUpForm` via `pending`); limitação aceita e documentada,
 * mesma classe da já existente em `gems.service.ts` (`debitGems`).
 */
export async function refillHeartsWithGemsAction(input: {
  count?: number;
  idempotencyKey: string;
}) {
  const actor = await requireSessionActor();
  const count = input.count ?? 1;

  await debitGems({
    userId: actor.userId,
    type: GEM_EVENT_TYPES.HEART_REFILL,
    idempotencyKey: input.idempotencyKey,
    amount: count * GEM_COST_PER_HEART,
    referenceType: "HeartState",
    metadata: { count },
  });

  const [hearts, gemBalance] = await Promise.all([
    refillHearts(actor.userId, count),
    getGemBalanceForActor(actor),
  ]);
  return { hearts, gemBalance };
}
