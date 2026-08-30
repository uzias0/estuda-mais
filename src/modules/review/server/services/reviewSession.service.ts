/**
 * Sessões de revisão (Módulo 5, seção 19) — `startReviewSession`,
 * `submitReviewAnswer`, `finishReviewSession`. Mesmo padrão do diagnóstico
 * (Módulo 3, `diagnostic.service.ts`): NENHUMA entidade nova de "sessão" —
 * reaproveita `StudySession` (mode=`REVISAO`, já existia como valor de
 * `StudyMode` desde o Módulo 1) só como agrupador, e `QuestionAttempt`
 * (context=`REVIEW`, já existia desde o Módulo 1) para a correção real.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import {
  AttemptContext,
  KnowledgeEntityType,
  PublicationStatus,
  StudyMode,
} from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { recordAttempt } from "@/modules/assessment/server/services/questionAttempt.service";
import { toPublicQuestionView } from "@/modules/assessment/server/services/questionQuery.service";
import { REVIEW_LOG_ORIGINS } from "@/config/review";
import { assertOwnReviewDataOrAdmin } from "./privacy";
import { getReviewQueue, type ReviewQueueFilters } from "./reviewQueue.service";
import { pickQuestionForConcept, resolveItemDifficulty } from "./reviewContext";
import { computeNextReview } from "./spacedRepetition";
import { ReviewValidationError } from "./errors";
import {
  SubmitReviewAnswerInputSchema,
  type SubmitReviewAnswerInput,
} from "@/modules/review/types/review-session.schema";

// `toPublicQuestionView` foi extraída para `assessment/questionQuery.service.ts`
// no Módulo 6 (era duplicada aqui e em `assessment/diagnostic.service.ts`).

async function assertOwnReviewSession(actor: Actor, sessionId: string) {
  const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError(`StudySession "${sessionId}" não encontrada.`);
  assertOwnReviewDataOrAdmin(actor, session.userId);
  if (session.mode !== StudyMode.REVISAO) {
    throw new ReviewValidationError(`StudySession "${sessionId}" não é uma sessão de revisão.`);
  }
  return session;
}

/**
 * Inicia uma sessão de revisão: seleciona a fila elegível (`getReviewQueue`),
 * resolve uma `Question` por item (direta, se `scope=QUESTION`; escolhida
 * entre as tagueadas ao conceito, se `scope=CONCEPT`), e abre uma
 * `StudySession` para agrupar as respostas. Itens sem questão publicada
 * disponível são omitidos (documentado — ver limitações do Módulo 5).
 */
export async function startReviewSession(
  actor: Actor,
  options: Omit<ReviewQueueFilters, "now"> = {},
) {
  const queue = await getReviewQueue(actor, actor.userId, options);

  const items: Array<{
    reviewItemId: string;
    scope: "QUESTION" | "CONCEPT";
    conceptId: string | null;
    priority: number;
    reason: string;
    question: ReturnType<typeof toPublicQuestionView>;
  }> = [];

  for (const entry of queue) {
    const question =
      entry.reviewItem.scope === "QUESTION"
        ? await prisma.question.findUnique({
            where: { id: entry.reviewItem.questionId! },
            include: { options: true },
          })
        : await pickQuestionForConcept(entry.reviewItem.conceptId!);

    if (!question || question.reviewStatus !== PublicationStatus.PUBLISHED) continue;

    items.push({
      reviewItemId: entry.reviewItem.id,
      scope: entry.reviewItem.scope,
      conceptId: entry.reviewItem.conceptId,
      priority: entry.priority,
      reason: entry.reason,
      question: toPublicQuestionView(question),
    });
  }

  const session = await prisma.studySession.create({
    data: { userId: actor.userId, mode: StudyMode.REVISAO },
  });

  return { sessionId: session.id, items };
}

async function assertQuestionEligibleForItem(
  reviewItem: { scope: string; questionId: string | null; conceptId: string | null },
  questionId: string,
) {
  if (reviewItem.scope === "QUESTION") {
    if (questionId !== reviewItem.questionId) {
      throw new ReviewValidationError(
        "questionId não corresponde à Question deste item de revisão (scope=QUESTION).",
      );
    }
    return;
  }
  const tag = await prisma.questionKnowledgeTag.findFirst({
    where: {
      questionId,
      entityType: KnowledgeEntityType.CONCEPT,
      entityId: reviewItem.conceptId!,
    },
  });
  if (!tag) {
    throw new ReviewValidationError(
      "questionId não está tagueado ao Concept deste item de revisão (scope=CONCEPT).",
    );
  }
}

/**
 * Registra a resposta de um item de revisão. Todo o recálculo (correção,
 * próximo intervalo, próximo vencimento, estado) é feito pelo servidor — o
 * cliente nunca envia `isCorrect`/`nextReviewAt`/`priority`/`state`
 * (Módulo 5, seção 20).
 */
export async function submitReviewAnswer(actor: Actor, input: SubmitReviewAnswerInput) {
  const data = SubmitReviewAnswerInputSchema.parse(input);

  const session = await assertOwnReviewSession(actor, data.sessionId);
  if (session.endedAt) {
    throw new ReviewValidationError("Esta sessão de revisão já foi finalizada.");
  }

  const reviewItem = await prisma.reviewItem.findUnique({ where: { id: data.reviewItemId } });
  if (!reviewItem) throw new NotFoundError(`ReviewItem "${data.reviewItemId}" não encontrado.`);
  assertOwnReviewDataOrAdmin(actor, reviewItem.userId);
  if (reviewItem.state === "SUSPENDED") {
    throw new ReviewValidationError("Este item está suspenso e não pode ser revisado agora.");
  }

  await assertQuestionEligibleForItem(reviewItem, data.questionId);

  const alreadyAnswered = await prisma.reviewLog.findFirst({
    where: { reviewItemId: data.reviewItemId, questionAttempt: { sessionId: data.sessionId } },
  });
  if (alreadyAnswered) {
    throw new ReviewValidationError("Este item já foi respondido nesta sessão de revisão.");
  }

  const { attempt, isCorrect, explanation } = await recordAttempt(actor, {
    questionId: data.questionId,
    answerData: data.answerData,
    timeSpentMs: data.timeSpentMs,
    context: AttemptContext.REVIEW,
    sessionId: data.sessionId,
  });

  const difficulty = await resolveItemDifficulty(reviewItem);
  const now = new Date();
  const current = {
    repetitions: reviewItem.repetitions,
    intervalDays: reviewItem.intervalDays,
    easeFactor: reviewItem.easeFactor,
    state: reviewItem.state,
  };
  const result = computeNextReview(current, isCorrect, difficulty, now);

  await prisma.$transaction([
    prisma.reviewItem.update({
      where: { id: data.reviewItemId },
      data: {
        repetitions: result.repetitions,
        intervalDays: result.intervalDays,
        easeFactor: result.easeFactor,
        state: result.state,
        dueAt: result.dueAt,
        lastReviewedAt: now,
      },
    }),
    prisma.reviewLog.create({
      data: {
        reviewItemId: data.reviewItemId,
        userId: actor.userId,
        questionAttemptId: attempt.id,
        isCorrect,
        previousState: current.state,
        newState: result.state,
        previousIntervalDays: current.intervalDays,
        newIntervalDays: result.intervalDays,
        dueAtBefore: reviewItem.dueAt,
        dueAtAfter: result.dueAt,
        origin: REVIEW_LOG_ORIGINS.REVIEW_SESSION,
      },
    }),
  ]);

  return {
    isCorrect,
    explanation,
    previousState: current.state,
    newState: result.state,
    previousIntervalDays: current.intervalDays,
    newIntervalDays: result.intervalDays,
    nextDueAt: result.dueAt,
  };
}

/**
 * Resumo de uma sessão — determinístico, recalculado sempre a partir dos
 * `ReviewLog` gravados (mesmo princípio do diagnóstico: nunca um valor
 * armazenado à parte).
 */
export async function getReviewSessionSummary(actor: Actor, sessionId: string) {
  await assertOwnReviewSession(actor, sessionId);

  const logs = await prisma.reviewLog.findMany({
    where: { questionAttempt: { sessionId } },
    orderBy: { createdAt: "asc" },
  });

  const itemsReviewed = logs.length;
  const correctCount = logs.filter((l) => l.isCorrect).length;
  const incorrectCount = itemsReviewed - correctCount;
  const accuracyPercentage =
    itemsReviewed === 0 ? 0 : Math.round((correctCount / itemsReviewed) * 10000) / 100;

  return {
    sessionId,
    itemsReviewed,
    correctCount,
    incorrectCount,
    accuracyPercentage,
    entries: logs.map((l) => ({
      reviewItemId: l.reviewItemId,
      isCorrect: l.isCorrect,
      previousState: l.previousState,
      newState: l.newState,
      previousIntervalDays: l.previousIntervalDays,
      newIntervalDays: l.newIntervalDays,
      nextDueAt: l.dueAtAfter,
    })),
  };
}

/** Marca a `StudySession` da revisão como encerrada e devolve o resumo final. */
export async function finishReviewSession(actor: Actor, sessionId: string) {
  const session = await assertOwnReviewSession(actor, sessionId);
  if (!session.endedAt) {
    await prisma.studySession.update({ where: { id: sessionId }, data: { endedAt: new Date() } });
  }
  return getReviewSessionSummary(actor, sessionId);
}
