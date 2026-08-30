"use server";

/**
 * Server Actions do diagnóstico (Módulo 11, seções 9/46) — camada FINA:
 * resolve o `Actor` e delega integralmente aos serviços reais do Módulo 3.
 * Nenhuma regra de negócio nova; nenhum cálculo de resultado aqui.
 */
import { requireSessionActor } from "@/server/auth/session";
import {
  startDiagnostic,
  submitDiagnosticAnswer,
  finishDiagnostic,
  getDiagnosticResult,
} from "@/modules/assessment/server/services/diagnostic.service";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";

export async function startDiagnosticAction() {
  const actor = await requireSessionActor();
  return startDiagnostic(actor);
}

export async function submitDiagnosticAnswerAction(input: {
  sessionId: string;
  questionId: string;
  answerData: AttemptAnswerData;
  timeSpentMs: number;
}) {
  const actor = await requireSessionActor();
  return submitDiagnosticAnswer(actor, input);
}

export async function finishDiagnosticAction(sessionId: string) {
  const actor = await requireSessionActor();
  return finishDiagnostic(actor, sessionId);
}

export async function getDiagnosticResultAction(sessionId: string) {
  const actor = await requireSessionActor();
  return getDiagnosticResult(actor, sessionId);
}
