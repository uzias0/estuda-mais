/**
 * Primitivo de autorização — primeira introdução deste mecanismo no projeto.
 *
 * O Módulo 1 deliberadamente NÃO implementou login/sessão (ver docs/MODULO-1.md,
 * "Decisões técnicas" — Auth.js/NextAuth adiado para o módulo de Layout
 * Principal). Como este módulo (Base de Conhecimento funcional) já precisa
 * de checagem de papel no servidor, o "usuário autenticado" é modelado aqui
 * como um `Actor` explícito — passado pela camada que chama o serviço (rota,
 * teste, script) — em vez de lido de uma sessão que ainda não existe.
 *
 * Quando o módulo de autenticação/sessão for implementado, ele passa a ser
 * responsável por MONTAR esse `Actor` a partir da sessão real; os serviços
 * de domínio não mudam — continuam recebendo `Actor` explicitamente.
 *
 * Não é um "novo sistema de permissões": usa o `Role` que já existe em
 * `User` (STUDENT | CONTENT_EDITOR | ADMIN, ver prisma/schema.prisma).
 */
import { Role } from "@/generated/prisma/enums";

export type RoleValue = (typeof Role)[keyof typeof Role];

export interface Actor {
  userId: string;
  role: RoleValue;
}

export class AuthorizationError extends Error {
  constructor(message = "Usuário não autorizado para esta operação.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Lança `AuthorizationError` se `actor.role` não estiver entre `allowedRoles`. */
export function assertRole(actor: Actor, allowedRoles: RoleValue[]): void {
  if (!allowedRoles.includes(actor.role)) {
    throw new AuthorizationError(
      `Papel "${actor.role}" não tem permissão para esta operação. ` +
        `Permitido: ${allowedRoles.join(", ")}.`,
    );
  }
}

/** Curadoria (criar/editar/arquivar/relacionar/citar) — CONTENT_EDITOR ou ADMIN. */
export const CURATOR_ROLES: RoleValue[] = [Role.CONTENT_EDITOR, Role.ADMIN];

/** Publicação — ato final e administrativo de tornar conteúdo visível. Só ADMIN. */
export const PUBLISHER_ROLES: RoleValue[] = [Role.ADMIN];
