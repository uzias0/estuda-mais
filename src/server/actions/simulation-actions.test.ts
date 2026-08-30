/**
 * Teste de integração real das Server Actions de simulado (Módulo 11,
 * seções 20-22/49) — o mesmo caminho que `SimulationLauncher`/
 * `SimulationRunner` usam; nenhum resultado é mostrado antes de finalizar
 * (a Action de resposta nunca devolve `isCorrect`).
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  startSimulationAction,
  submitSimulationAnswerAction,
  finishSimulationAction,
} from "./simulation-actions";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import {
  createSimulationFromQuestionIds,
  publishSimulation,
} from "@/modules/simulation/server/services/simulation.service";
import { getCurrentActor } from "@/server/auth/devActor";
import { loginAsUserId } from "@/test/authTestHelpers";
import {
  createFixtureSource,
  createFixtureMultipleChoiceQuestion,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Simulation Server Actions", () => {
  const sourceIds: string[] = [];
  const questionIds: string[] = [];
  const simulationIds: string[] = [];
  const simulationAttemptIds: string[] = [];
  const reviewItemIds: string[] = [];

  it("percorre início → resposta → finalização com resultado real, sem forjar isCorrect", async () => {
    const actor = await getCurrentActor();
    await loginAsUserId(actor.userId); // Server Action agora exige sessão real (etapa de consolidação)
    const adminActor = { userId: actor.userId, role: "ADMIN" as const };

    const source = await createFixtureSource("action-sim");
    sourceIds.push(source.id);
    const question = await createFixtureMultipleChoiceQuestion("action-sim", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    await publishQuestion(adminActor, question.id);

    const simulation = await createSimulationFromQuestionIds(adminActor, {
      title: "TEST_FIXTURE_action_simulation",
      questionIds: [question.id],
    });
    simulationIds.push(simulation.id);
    await publishSimulation(adminActor, simulation.id);

    const started = await startSimulationAction(simulation.id);
    simulationAttemptIds.push(started.attemptId);

    const submitted = await submitSimulationAnswerAction({
      attemptId: started.attemptId,
      questionId: question.id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: question.options[1].id }, // errado
      timeSpentMs: 100,
    });
    // A Action de resposta devolve o resultado real da correção (não é a UI
    // exibindo ainda — o `SimulationRunner` deliberadamente ignora isto até
    // finalizar, seção 21), mas o valor em si já é a verdade do servidor.
    expect(submitted.isCorrect).toBe(false);

    const finished = await finishSimulationAction(started.attemptId);
    expect(finished.result.correct).toBe(0);
    expect(finished.result.total).toBe(1);
    expect(finished.gamification.xpGrantedNow).toBe(100);

    // Resposta errada → `finishSimulation` (Módulo 6) cria um `ReviewItem`
    // real (seção 21 do prompt do Módulo 6) — precisa ser limpo também,
    // senão a exclusão da `Question` viola a constraint de
    // `ReviewItem.scope`.
    const createdReviewItem = await prisma.reviewItem.findFirst({
      where: { userId: actor.userId, scope: "QUESTION", questionId: question.id },
    });
    if (createdReviewItem) reviewItemIds.push(createdReviewItem.id);
  });

  afterAll(async () => {
    await cleanupFixtures({
      reviewItemIds,
      simulationAttemptIds,
      simulationIds,
      questionIds,
      sourceIds,
    });
    await prisma.$disconnect();
  });
});
