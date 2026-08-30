/**
 * Guarda de privacidade da gamificação (Módulo 9, seção 32) — mesmo padrão
 * mais restritivo já usado em `review/server/services/privacy.ts` (Módulo
 * 5) e `pedagogy/server/services/learning-privacy.ts` (Módulo 8): XP,
 * nível, streak, metas e conquistas são dados pessoais do estudante, não
 * conteúdo curatorial. CONTENT_EDITOR não recebe acesso automático — só o
 * próprio dono ou ADMIN.
 */
import { Role } from "@/generated/prisma/enums";
import { Actor, AuthorizationError } from "@/server/auth/authorize";

export function assertOwnGamificationDataOrAdmin(actor: Actor, targetUserId: string): void {
  if (actor.userId === targetUserId) return;
  if (actor.role === Role.ADMIN) return;
  throw new AuthorizationError(
    "Você só pode acessar seus próprios dados de gamificação (XP, nível, streak, metas, conquistas).",
  );
}
