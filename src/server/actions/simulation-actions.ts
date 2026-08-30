"use server";

/**
 * Server Actions de simulados (Módulo 11, seções 20-22/46) — camada fina
 * sobre o Módulo 6; ao finalizar, processa o evento de gamificação real
 * (Módulo 9), mesmo padrão dos demais fluxos.
 */
import { redirect } from "next/navigation";
import { requireSessionActor } from "@/server/auth/session";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import { buildSimulation } from "@/modules/simulation/server/services/simulation-builder.service";
import {
  startSimulation,
  submitSimulationAnswer,
  finishSimulation,
} from "@/modules/simulation/server/services/simulation-attempt.service";
import { processSimulationCompletionEvent } from "@/modules/gamification/server/services/gamification-events.service";
import { getSimulationPerformanceBreakdown } from "@/modules/simulation/server/services/simulation-performance.service";
import { getNextSimulationRecommendation } from "@/modules/simulation/server/services/simulation-recommendation.service";

export async function buildSimulationAction(formData: FormData) {
  const actor = await requireSessionActor();
  const kind = String(formData.get("kind") ?? "PERSONALIZED");
  const count = Number(formData.get("count") ?? 10);
  const disciplineId = formData.get("disciplineId");
  const examEditionId = formData.get("examEditionId");

  const built = await (async () => {
    if (kind === "EXAM_EDITION" && typeof examEditionId === "string" && examEditionId) {
      return buildSimulation(actor, {
        kind: "EXAM_EDITION",
        title: "Simulado de prova real",
        examEditionId,
        count,
      });
    }
    if (kind === "REVIEW") {
      return buildSimulation(actor, { kind: "REVIEW", title: "Simulado de revisão", count });
    }
    return buildSimulation(actor, {
      kind: "PERSONALIZED",
      title: "Simulado personalizado",
      filters: {
        count,
        disciplineId: typeof disciplineId === "string" && disciplineId ? disciplineId : undefined,
      },
    });
  })();

  redirect(`/dashboard/simulados/${built.simulation.id}`);
}

export async function startSimulationAction(simulationId: string) {
  const actor = await requireSessionActor();
  return startSimulation(actor, simulationId);
}

export async function submitSimulationAnswerAction(input: {
  attemptId: string;
  questionId: string;
  answerData: AttemptAnswerData;
  timeSpentMs: number;
}) {
  const actor = await requireSessionActor();
  return submitSimulationAnswer(actor, input);
}

export async function finishSimulationAction(attemptId: string) {
  const actor = await requireSessionActor();
  const result = await finishSimulation(actor, attemptId);
  const gamification = await processSimulationCompletionEvent(actor, attemptId);
  const breakdown = await getSimulationPerformanceBreakdown(actor, attemptId);
  const nextSimulation = await getNextSimulationRecommendation(actor, actor.userId);
  return { result, gamification, breakdown, nextSimulation };
}
