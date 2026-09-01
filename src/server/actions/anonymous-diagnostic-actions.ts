"use server";

/**
 * Server Actions do diagnóstico ANÔNIMO (fase "diagnóstico antes do
 * cadastro") — mesmo padrão fino de `diagnostic-actions.ts`, só trocando
 * `requireSessionActor()` por `getOrCreateAnonymousActor()` (cria/reaproveita
 * o usuário anônimo via cookie, `anonymous-session.ts`). Delega
 * integralmente aos MESMOS serviços do Módulo 3 — nenhuma regra de
 * negócio duplicada.
 */
import { getOrCreateAnonymousActor, getAnonymousUserId } from "@/server/auth/anonymous-session";
import { Role } from "@/generated/prisma/enums";
import {
  startDiagnostic,
  submitDiagnosticAnswer,
  finishDiagnostic,
  getDiagnosticResult,
} from "@/modules/assessment/server/services/diagnostic.service";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";

export async function startAnonymousDiagnosticAction() {
  const actor = await getOrCreateAnonymousActor();
  return startDiagnostic(actor);
}

export async function submitAnonymousDiagnosticAnswerAction(input: {
  sessionId: string;
  questionId: string;
  answerData: AttemptAnswerData;
  timeSpentMs: number;
}) {
  const actor = await getOrCreateAnonymousActor();
  return submitDiagnosticAnswer(actor, input);
}

export async function finishAnonymousDiagnosticAction(sessionId: string) {
  const actor = await getOrCreateAnonymousActor();
  return finishDiagnostic(actor, sessionId);
}

/**
 * Usada só pela página de RESULTADO (`/comecar/resultado`) — nunca cria
 * um usuário anônimo novo (`getAnonymousUserId`, sem criar): se o cookie
 * não existir mais (expirado, ou o visitante limpou os cookies), não há
 * diagnóstico nenhum a mostrar, a página trata isso como "sem resultado".
 */
export async function getAnonymousDiagnosticResultAction(sessionId: string) {
  const userId = await getAnonymousUserId();
  if (!userId) return null;
  try {
    return await getDiagnosticResult({ userId, role: Role.STUDENT }, sessionId);
  } catch {
    return null;
  }
}
