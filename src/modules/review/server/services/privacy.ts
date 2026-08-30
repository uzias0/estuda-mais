/**
 * Guarda de privacidade específica do Módulo 5 (seção 20/21) — deliberadamente
 * MAIS RESTRITIVA que a convenção usada em `questionAttempt.service.ts`
 * (Módulo 3), onde CONTENT_EDITOR também pode ler qualquer tentativa (para
 * curadoria). Aqui, o prompt do módulo é explícito: "CONTENT_EDITOR não deve
 * obter poderes de aluno sobre dados privados" — fila, histórico e sessões de
 * revisão são dados pessoais do aluno, não conteúdo curatorial. Só o próprio
 * dono ou ADMIN (poder administrativo já existente) pode acessá-los.
 */
import { Role } from "@/generated/prisma/enums";
import { Actor, AuthorizationError } from "@/server/auth/authorize";

export function assertOwnReviewDataOrAdmin(actor: Actor, targetUserId: string): void {
  if (actor.userId === targetUserId) return;
  if (actor.role === Role.ADMIN) return;
  throw new AuthorizationError(
    "Você só pode acessar seus próprios dados de revisão (fila, histórico, sessões).",
  );
}
