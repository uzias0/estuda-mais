/**
 * Pontos de entrada de processamento de evento (Módulo 9, seção 4/34) —
 * transformam um evento acadêmico JÁ concluído (por `pedagogy`/`review`/
 * `simulation`/`assessment`) em XP/streak/meta/conquista. Não altera NADA
 * dos módulos de origem (seção 35: proibido tocar `gradeAnswer`,
 * `recordAttempt`, diagnóstico, SM-2-lite, cálculo de simulado, critérios
 * de mastery) — cada função aqui só LÊ o estado já persistido por eles e
 * decide, deterministicamente, o que conceder.
 *
 * Sem barramento de eventos/hooks: cada função é chamada explicitamente
 * DEPOIS da ação real (`completeLesson`, `finishReviewSession`,
 * `finishSimulation`, `finishDiagnostic`) por quem orquestra o fluxo —
 * mesmo estágio do projeto em que nenhum módulo anterior tem camada HTTP
 * própria ainda (decisão registrada em docs/MODULO-9.md).
 */
import { prisma } from "@/server/db";
import { Actor, AuthorizationError } from "@/server/auth/authorize";
import { AttemptContext, LessonProgressStatus, Role, StudyMode } from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { GAMIFICATION_EVENT_TYPES, XP_REWARDS } from "@/config/gamification";
import { GamificationValidationError } from "./errors";
import { awardXp } from "./xp.service";
import { recordStudyActivity } from "./streak.service";
import { applyXpToDailyGoal } from "./daily-goal.service";
import { evaluateAndUnlockAchievements } from "./achievement.service";

function assertOwnEventOrAdmin(actor: Actor, ownerUserId: string): void {
  if (actor.userId === ownerUserId) return;
  if (actor.role === Role.ADMIN) return;
  throw new AuthorizationError("Você só pode processar gamificação dos seus próprios eventos.");
}

/**
 * Encerra o processamento comum a todo evento (seção 34): atualiza streak
 * (sempre — mesmo quando `xpGrantedNow` é 0 por idempotência, ainda houve
 * atividade acadêmica real hoje), aplica o XP concedido AGORA à meta diária,
 * e reavalia conquistas. `recordStudyActivity` roda antes das outras duas
 * (sequencial, não em paralelo) para que uma conquista de streak
 * (`STREAK_DAYS`) veja o streak já atualizado nesta mesma chamada.
 */
async function finalizeGamificationProcessing(
  userId: string,
  xpGrantedNow: number,
  now: Date = new Date(),
) {
  const streak = await recordStudyActivity(userId, now);
  const [dailyGoal, unlockedAchievements] = await Promise.all([
    applyXpToDailyGoal(userId, xpGrantedNow, now),
    evaluateAndUnlockAchievements(userId),
  ]);
  return { xpGrantedNow, streak, dailyGoal, unlockedAchievements };
}

/**
 * Conclusão de lição (seção 4/5) — `LessonProgress` já precisa estar
 * COMPLETED/MASTERED (Módulo 8, `completeLesson`). Além do bônus de
 * conclusão, retroalimenta o bônus por questão correta (seção 5) a partir
 * dos `LessonBlockCompletion.isCorrect=true` já persistidos — sem hookar
 * `submitLessonActivity`; cada bloco correto usa o próprio id como âncora
 * de idempotência, então chamar esta função de novo (ex.: reenvio de rede)
 * nunca duplica nenhum dos dois bônus.
 */
export async function processLessonCompletionEvent(actor: Actor, lessonProgressId: string) {
  const progress = await prisma.lessonProgress.findUnique({
    where: { id: lessonProgressId },
    include: { lesson: true },
  });
  if (!progress) throw new NotFoundError(`LessonProgress "${lessonProgressId}" não encontrado.`);
  assertOwnEventOrAdmin(actor, progress.userId);
  if (
    progress.status !== LessonProgressStatus.COMPLETED &&
    progress.status !== LessonProgressStatus.MASTERED
  ) {
    throw new GamificationValidationError("Esta lição ainda não foi concluída — nada a processar.");
  }

  let xpGrantedNow = 0;

  const completionAward = await awardXp({
    userId: progress.userId,
    type: GAMIFICATION_EVENT_TYPES.LESSON_COMPLETED,
    idempotencyKey: `${GAMIFICATION_EVENT_TYPES.LESSON_COMPLETED}:${lessonProgressId}`,
    amount: XP_REWARDS.LESSON_COMPLETED,
    referenceType: "LessonProgress",
    referenceId: lessonProgressId,
    metadata: { lessonId: progress.lessonId, lessonTitle: progress.lesson.title },
  });
  if (!completionAward.alreadyAwarded) xpGrantedNow += completionAward.event.xpAwarded;

  const correctBlocks = await prisma.lessonBlockCompletion.findMany({
    where: { lessonProgressId, isCorrect: true },
  });
  for (const block of correctBlocks) {
    const award = await awardXp({
      userId: progress.userId,
      type: GAMIFICATION_EVENT_TYPES.LESSON_QUESTION_CORRECT,
      idempotencyKey: `${GAMIFICATION_EVENT_TYPES.LESSON_QUESTION_CORRECT}:${block.id}`,
      amount: XP_REWARDS.LESSON_QUESTION_CORRECT,
      referenceType: "LessonBlockCompletion",
      referenceId: block.id,
      metadata: { lessonId: progress.lessonId },
    });
    if (!award.alreadyAwarded) xpGrantedNow += award.event.xpAwarded;
  }

  return finalizeGamificationProcessing(progress.userId, xpGrantedNow);
}

/**
 * Conclusão de sessão de revisão (seção 4/5) — exige `StudySession` em modo
 * REVISAO já encerrada (Módulo 5, `finishReviewSession`). Retroalimenta o
 * bônus por questão correta a partir de `ReviewLog.isCorrect=true` já
 * gravado (via `QuestionAttempt.sessionId`), mesma lógica de backfill da
 * lição.
 */
export async function processReviewSessionCompletionEvent(actor: Actor, reviewSessionId: string) {
  const session = await prisma.studySession.findUnique({ where: { id: reviewSessionId } });
  if (!session) throw new NotFoundError(`StudySession "${reviewSessionId}" não encontrada.`);
  assertOwnEventOrAdmin(actor, session.userId);
  if (session.mode !== StudyMode.REVISAO || !session.endedAt) {
    throw new GamificationValidationError(
      "Esta sessão de revisão ainda não foi concluída — nada a processar.",
    );
  }

  let xpGrantedNow = 0;

  const completionAward = await awardXp({
    userId: session.userId,
    type: GAMIFICATION_EVENT_TYPES.REVIEW_SESSION_COMPLETED,
    idempotencyKey: `${GAMIFICATION_EVENT_TYPES.REVIEW_SESSION_COMPLETED}:${reviewSessionId}`,
    amount: XP_REWARDS.REVIEW_SESSION_COMPLETED,
    referenceType: "StudySession",
    referenceId: reviewSessionId,
  });
  if (!completionAward.alreadyAwarded) xpGrantedNow += completionAward.event.xpAwarded;

  const correctLogs = await prisma.reviewLog.findMany({
    where: {
      userId: session.userId,
      isCorrect: true,
      questionAttempt: { sessionId: reviewSessionId },
    },
  });
  for (const log of correctLogs) {
    const award = await awardXp({
      userId: session.userId,
      type: GAMIFICATION_EVENT_TYPES.REVIEW_QUESTION_CORRECT,
      idempotencyKey: `${GAMIFICATION_EVENT_TYPES.REVIEW_QUESTION_CORRECT}:${log.id}`,
      amount: XP_REWARDS.REVIEW_QUESTION_CORRECT,
      referenceType: "ReviewLog",
      referenceId: log.id,
    });
    if (!award.alreadyAwarded) xpGrantedNow += award.event.xpAwarded;
  }

  return finalizeGamificationProcessing(session.userId, xpGrantedNow);
}

/** Conclusão de simulado (seção 4/5) — exige `SimulationAttempt.finishedAt` já gravado (Módulo 6, `finishSimulation`). */
export async function processSimulationCompletionEvent(actor: Actor, simulationAttemptId: string) {
  const attempt = await prisma.simulationAttempt.findUnique({
    where: { id: simulationAttemptId },
    include: { simulation: true },
  });
  if (!attempt)
    throw new NotFoundError(`SimulationAttempt "${simulationAttemptId}" não encontrado.`);
  assertOwnEventOrAdmin(actor, attempt.userId);
  if (!attempt.finishedAt) {
    throw new GamificationValidationError(
      "Este simulado ainda não foi finalizado — nada a processar.",
    );
  }

  const award = await awardXp({
    userId: attempt.userId,
    type: GAMIFICATION_EVENT_TYPES.SIMULATION_COMPLETED,
    idempotencyKey: `${GAMIFICATION_EVENT_TYPES.SIMULATION_COMPLETED}:${simulationAttemptId}`,
    amount: XP_REWARDS.SIMULATION_COMPLETED,
    referenceType: "SimulationAttempt",
    referenceId: simulationAttemptId,
    metadata: { simulationTitle: attempt.simulation.title, score: attempt.score },
  });
  const xpGrantedNow = award.alreadyAwarded ? 0 : award.event.xpAwarded;

  return finalizeGamificationProcessing(attempt.userId, xpGrantedNow);
}

/**
 * Conclusão de diagnóstico (seção 4/5) — exige `StudySession` encerrada
 * (Módulo 3, `finishDiagnostic`) com ao menos uma `QuestionAttempt` em
 * contexto `DIAGNOSTIC` (discriminador autoritativo; `mode: FORMACAO` por
 * si só não basta — é o mesmo modo usado como preferência padrão do
 * `Profile`).
 */
export async function processDiagnosticCompletionEvent(actor: Actor, diagnosticSessionId: string) {
  const session = await prisma.studySession.findUnique({ where: { id: diagnosticSessionId } });
  if (!session) throw new NotFoundError(`StudySession "${diagnosticSessionId}" não encontrada.`);
  assertOwnEventOrAdmin(actor, session.userId);
  if (!session.endedAt) {
    throw new GamificationValidationError(
      "Este diagnóstico ainda não foi concluído — nada a processar.",
    );
  }

  const diagnosticAttempts = await prisma.questionAttempt.count({
    where: { sessionId: diagnosticSessionId, context: AttemptContext.DIAGNOSTIC },
  });
  if (diagnosticAttempts === 0) {
    throw new GamificationValidationError(
      "Esta sessão não corresponde a um diagnóstico (nenhuma tentativa em contexto DIAGNOSTIC).",
    );
  }

  const award = await awardXp({
    userId: session.userId,
    type: GAMIFICATION_EVENT_TYPES.DIAGNOSTIC_COMPLETED,
    idempotencyKey: `${GAMIFICATION_EVENT_TYPES.DIAGNOSTIC_COMPLETED}:${diagnosticSessionId}`,
    amount: XP_REWARDS.DIAGNOSTIC_COMPLETED,
    referenceType: "StudySession",
    referenceId: diagnosticSessionId,
  });
  const xpGrantedNow = award.alreadyAwarded ? 0 : award.event.xpAwarded;

  return finalizeGamificationProcessing(session.userId, xpGrantedNow);
}
