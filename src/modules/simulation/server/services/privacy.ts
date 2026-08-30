/**
 * Guarda de privacidade do Módulo 6 (seção 29/30) — STUDENT só acessa a
 * própria tentativa/histórico; CONTENT_EDITOR/ADMIN podem consultar
 * qualquer uma (mesma convenção do Módulo 3 para `QuestionAttempt`
 * — `questionAttempt.service.getAttempt` — já que aqui o prompt lista
 * poderes de CURADORIA para CONTENT_EDITOR, não uma restrição a dado
 * privado de aluno como o Módulo 5 fez explicitamente para revisão).
 */
import { Actor, AuthorizationError, CURATOR_ROLES } from "@/server/auth/authorize";

export function assertOwnSimulationDataOrCurator(actor: Actor, targetUserId: string): void {
  if (actor.userId === targetUserId) return;
  if (CURATOR_ROLES.includes(actor.role)) return;
  throw new AuthorizationError(
    "Você só pode acessar seus próprios dados de simulado (tentativas, resultados, evolução).",
  );
}
