/**
 * Execução do simulado (Módulo 6, seção 11): `startSimulation` →
 * `submitSimulationAnswer` → `finishSimulation`. Reaproveita integralmente
 * `recordAttempt`/`gradeAnswer` (Módulo 3) para a correção — nenhum
 * mecanismo de correção paralelo (seção 11 do prompt). Integra com o Módulo
 * 5 (`ensureReviewItem`) ao finalizar, sem duplicar SM-2-lite/prioridade.
 */
import { prisma } from "@/server/db";
import { Actor, AuthorizationError } from "@/server/auth/authorize";
import { AttemptContext } from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { recordAttempt } from "@/modules/assessment/server/services/questionAttempt.service";
import { toPublicQuestionView } from "@/modules/assessment/server/services/questionQuery.service";
import { ensureReviewItem } from "@/modules/review/server/services/reviewItem.service";
import { assertSimulationVisible } from "./simulation.service";
import { calculateSimulationResult } from "./simulation-grading.service";
import { SimulationValidationError } from "./errors";
import {
  SubmitSimulationAnswerInputSchema,
  type SubmitSimulationAnswerInput,
} from "@/modules/simulation/types/simulation.schema";

async function getOrderedSimulationQuestions(simulationId: string) {
  return prisma.simulationQuestion.findMany({
    where: { simulationId },
    orderBy: { order: "asc" },
    include: { question: { include: { options: true } } },
  });
}

/** Inicia uma tentativa — devolve a composição pública (sem gabarito), respeitando a ordem gravada. */
export async function startSimulation(actor: Actor, simulationId: string) {
  const simulation = await prisma.simulation.findUnique({ where: { id: simulationId } });
  if (!simulation) throw new NotFoundError(`Simulation "${simulationId}" não encontrado.`);
  assertSimulationVisible(actor, simulation);

  const simulationQuestions = await getOrderedSimulationQuestions(simulationId);
  if (simulationQuestions.length === 0) {
    throw new SimulationValidationError("Este simulado não tem questões — não é possível iniciar.");
  }

  const attempt = await prisma.simulationAttempt.create({
    data: {
      userId: actor.userId,
      simulationId,
      totalCount: simulationQuestions.length,
    },
  });

  return {
    attemptId: attempt.id,
    simulationId,
    questions: simulationQuestions.map((sq) => toPublicQuestionView(sq.question)),
  };
}

async function assertOwnAttempt(actor: Actor, attemptId: string) {
  const attempt = await prisma.simulationAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new NotFoundError(`SimulationAttempt "${attemptId}" não encontrado.`);
  if (attempt.userId !== actor.userId) {
    throw new AuthorizationError("Esta tentativa de simulado pertence a outro usuário.");
  }
  return attempt;
}

/**
 * Registra a resposta de um item do simulado. `isCorrect`/`score`/
 * `percentage`/`userId` nunca vêm do cliente — sempre recalculados
 * (seção 30). Rejeita: questão fora do simulado, resposta duplicada,
 * simulado já finalizado, tentativa de outro usuário.
 */
export async function submitSimulationAnswer(actor: Actor, input: SubmitSimulationAnswerInput) {
  const data = SubmitSimulationAnswerInputSchema.parse(input);

  const attempt = await assertOwnAttempt(actor, data.attemptId);
  if (attempt.finishedAt) {
    throw new SimulationValidationError("Este simulado já foi finalizado.");
  }

  const belongs = await prisma.simulationQuestion.findUnique({
    where: {
      simulationId_questionId: { simulationId: attempt.simulationId, questionId: data.questionId },
    },
  });
  if (!belongs) {
    throw new SimulationValidationError("Esta questão não pertence a este simulado.");
  }

  const alreadyAnswered = await prisma.questionAttempt.findFirst({
    where: { simAttemptId: data.attemptId, questionId: data.questionId },
  });
  if (alreadyAnswered) {
    throw new SimulationValidationError("Esta questão já foi respondida nesta tentativa.");
  }

  return recordAttempt(actor, {
    questionId: data.questionId,
    answerData: data.answerData,
    timeSpentMs: data.timeSpentMs,
    context: AttemptContext.SIMULATION,
    simAttemptId: data.attemptId,
  });
}

/**
 * Finaliza a tentativa. Idempotente (mesmo padrão do diagnóstico/revisão):
 * chamar de novo devolve o mesmo resultado, sem reprocessar. Ao finalizar
 * pela primeira vez, alimenta o sistema de revisão (Módulo 5) com as
 * questões erradas — só CRIAÇÃO de `ReviewItem` (`ensureReviewItem`), nunca
 * recálculo de intervalo/prioridade/estado (seção 21).
 */
export async function finishSimulation(actor: Actor, attemptId: string) {
  const attempt = await assertOwnAttempt(actor, attemptId);

  if (!attempt.finishedAt) {
    const result = await calculateSimulationResult(attemptId);
    await prisma.simulationAttempt.update({
      where: { id: attemptId },
      data: {
        finishedAt: new Date(),
        score: result.percentage,
        correctCount: result.correct,
        totalCount: result.total,
      },
    });

    const wrongAttempts = await prisma.questionAttempt.findMany({
      where: { simAttemptId: attemptId, isCorrect: false },
      select: { questionId: true },
    });
    for (const { questionId } of wrongAttempts) {
      await ensureReviewItem(actor, { scope: "QUESTION", questionId });
    }
  }

  return calculateSimulationResult(attemptId);
}
