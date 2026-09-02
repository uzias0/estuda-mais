"use server";

/**
 * Server Actions de manutenção pontual de conteúdo (área `/admin`) — cada
 * uma expõe, via um botão numa página protegida por
 * `requireAdminSessionActor()` (mesmo gate de toda `/admin`, Módulo 12),
 * uma correção de conteúdo que já existe como script de linha de comando
 * (`scripts/*.ts`). Pensada para quando o usuário tem acesso ao painel
 * administrativo mas não tem/não sabe usar o Shell do serviço de deploy
 * (pedido do usuário: "não tenho/não sei usar o Shell do Render") — a
 * MESMA lógica do script roda aqui, nunca uma segunda cópia (ver
 * `answer-length-bias-fix.service.ts`).
 */
import { requireAdminSessionActor } from "@/server/auth/session";
import {
  applyAnswerLengthBiasFixes,
  type AnswerLengthBiasFixResult,
} from "@/modules/assessment/server/services/answer-length-bias-fix.service";
import {
  applyPersonPortraits,
  type PersonPortraitFixResult,
} from "@/modules/knowledge/server/services/academic-person-portraits-fix.service";
import {
  normalizeAllUserEmails,
  type EmailNormalizationResult,
} from "@/server/auth/normalize-user-emails.service";

export interface RunAnswerLengthBiasFixResult {
  fixed: number;
  results: AnswerLengthBiasFixResult[];
}

export async function runAnswerLengthBiasFixAction(): Promise<RunAnswerLengthBiasFixResult> {
  const actor = await requireAdminSessionActor();
  return applyAnswerLengthBiasFixes(actor);
}

export interface RunPersonPortraitsFixResult {
  updated: number;
  results: PersonPortraitFixResult[];
}

export async function runPersonPortraitsFixAction(): Promise<RunPersonPortraitsFixResult> {
  const actor = await requireAdminSessionActor();
  return applyPersonPortraits(actor);
}

export interface RunNormalizeEmailsResult {
  normalized: number;
  results: EmailNormalizationResult[];
}

export async function runNormalizeEmailsAction(): Promise<RunNormalizeEmailsResult> {
  await requireAdminSessionActor();
  return normalizeAllUserEmails();
}
