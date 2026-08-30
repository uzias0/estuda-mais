/**
 * Serviço de domínio para `QuestionAttempt` (Módulo 3, seção 18). Qualquer
 * `Actor` autenticado pode registrar tentativa própria — STUDENT incluso,
 * de propósito (seção 32: "ALUNO pode... responder questões"). `userId`
 * nunca vem do payload: vem sempre de `actor.userId`. `isCorrect` nunca vem
 * do cliente: é sempre calculado por `answerGrading.gradeAnswer` a partir da
 * `Question` armazenada.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { Role, AttemptContext } from "@/generated/prisma/enums";

type AttemptContextValue = (typeof AttemptContext)[keyof typeof AttemptContext];
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { AttemptValidationError } from "./errors";
import { gradeAnswer } from "./answerGrading";
import {
  QuestionAttemptCreateInputSchema,
  type QuestionAttemptCreateInput,
} from "@/modules/assessment/types/question-attempt.schema";
import type { AnswerKey } from "@/modules/assessment/types/question.schema";

async function assertSessionBelongsToActor(sessionId: string, actor: Actor) {
  const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError(`StudySession "${sessionId}" não encontrada.`);
  if (session.userId !== actor.userId) {
    throw new AttemptValidationError("Esta sessão de estudo pertence a outro usuário.");
  }
  return session;
}

async function assertSimAttemptBelongsToActor(simAttemptId: string, actor: Actor) {
  const simAttempt = await prisma.simulationAttempt.findUnique({ where: { id: simAttemptId } });
  if (!simAttempt) throw new NotFoundError(`SimulationAttempt "${simAttemptId}" não encontrada.`);
  if (simAttempt.userId !== actor.userId) {
    throw new AttemptValidationError("Esta tentativa de simulado pertence a outro usuário.");
  }
  return simAttempt;
}

/**
 * Registra uma tentativa e retorna o resultado calculado pelo servidor.
 * Atualiza `Question.answerCount`/`correctRate` (estatística agregada) na
 * mesma transação.
 */
export async function recordAttempt(actor: Actor, input: QuestionAttemptCreateInput) {
  const data = QuestionAttemptCreateInputSchema.parse(input);

  const question = await prisma.question.findUnique({
    where: { id: data.questionId },
    include: { options: true },
  });
  if (!question) throw new NotFoundError(`Question "${data.questionId}" não encontrada.`);

  if (data.sessionId) await assertSessionBelongsToActor(data.sessionId, actor);
  if (data.simAttemptId) await assertSimAttemptBelongsToActor(data.simAttemptId, actor);

  const isCorrect = gradeAnswer({
    questionType: question.type,
    options: question.options,
    answerKey: (question.answerKey as AnswerKey | null) ?? null,
    answerData: data.answerData,
  });

  const oldCount = question.answerCount;
  const oldCorrect = oldCount * (question.correctRate ?? 0);
  const newCount = oldCount + 1;
  const newCorrectRate = (oldCorrect + (isCorrect ? 1 : 0)) / newCount;

  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.questionAttempt.create({
      data: {
        userId: actor.userId,
        questionId: data.questionId,
        answerData: data.answerData,
        isCorrect,
        timeSpentMs: data.timeSpentMs,
        context: data.context,
        sessionId: data.sessionId,
        simAttemptId: data.simAttemptId,
      },
    });
    await tx.question.update({
      where: { id: data.questionId },
      data: { answerCount: newCount, correctRate: newCorrectRate },
    });
    return created;
  });

  return { attempt, isCorrect, explanation: question.explanation };
}

/** STUDENT só vê a própria tentativa; CONTENT_EDITOR/ADMIN podem consultar qualquer uma (curadoria/auditoria). */
export async function getAttempt(actor: Actor, id: string) {
  const attempt = await prisma.questionAttempt.findUnique({ where: { id } });
  if (!attempt) throw new NotFoundError(`QuestionAttempt "${id}" não encontrada.`);
  if (attempt.userId !== actor.userId && actor.role === Role.STUDENT) {
    throw new AttemptValidationError("Você só pode consultar suas próprias tentativas.");
  }
  return attempt;
}

/** Lista as tentativas do próprio `actor` (nunca de outro usuário, a não ser que ele mesmo seja o alvo). */
export async function listAttemptsForUser(
  actor: Actor,
  targetUserId: string,
  params?: { context?: AttemptContextValue; take?: number; skip?: number },
) {
  if (targetUserId !== actor.userId && actor.role === Role.STUDENT) {
    throw new AttemptValidationError("Você só pode consultar suas próprias tentativas.");
  }
  return prisma.questionAttempt.findMany({
    where: { userId: targetUserId, context: params?.context },
    take: params?.take ?? 100,
    skip: params?.skip ?? 0,
    orderBy: { createdAt: "desc" },
  });
}
