/**
 * Guarda de privacidade da experiência de aprendizagem (Módulo 8, seções
 * 35/36) — mesmo espírito de `review/server/services/privacy.ts` (Módulo 5):
 * progresso, tentativas e sessões de lição são dados pessoais do estudante,
 * não conteúdo curatorial. CONTENT_EDITOR NÃO recebe acesso irrestrito
 * (diverge de propósito da convenção mais permissiva usada em
 * `questionAttempt.service.ts`, onde curadoria também pode ler qualquer
 * tentativa) — aqui só o próprio dono ou ADMIN.
 */
import { Role } from "@/generated/prisma/enums";
import { Actor, AuthorizationError } from "@/server/auth/authorize";

export function assertOwnLearningDataOrAdmin(actor: Actor, targetUserId: string): void {
  if (actor.userId === targetUserId) return;
  if (actor.role === Role.ADMIN) return;
  throw new AuthorizationError(
    "Você só pode acessar seus próprios dados de aprendizagem (progresso, execução de lições).",
  );
}
