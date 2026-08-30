/**
 * Guarda de privacidade do motor de estudo (Módulo 10, seção 26) — mesmo
 * padrão mais restritivo já usado em `review`/`pedagogy`/`gamification`
 * (Módulos 5/8/9): plano de estudo, diagnóstico, revisão, progresso e
 * gamificação são dados pessoais do estudante. CONTENT_EDITOR não recebe
 * acesso automático só por ter papel de curadoria; ADMIN mantém o acesso
 * administrativo já previsto pela arquitetura.
 */
import { Role } from "@/generated/prisma/enums";
import { Actor, AuthorizationError } from "@/server/auth/authorize";

export function assertOwnStudyPlanDataOrAdmin(actor: Actor, targetUserId: string): void {
  if (actor.userId === targetUserId) return;
  if (actor.role === Role.ADMIN) return;
  throw new AuthorizationError("Você só pode acessar seu próprio plano de estudo.");
}
