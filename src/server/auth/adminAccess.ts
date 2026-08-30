/**
 * Guarda de acesso à área administrativa (Módulo 12, seção 14/19 do
 * prompt: "a autorização precisa ser validada no servidor... não confiar
 * apenas em esconder menus"). Não é um mecanismo de autorização novo — é
 * uma função pequena e pura que aplica `assertRole`/`CURATOR_ROLES`
 * (Módulo 2, `src/server/auth/authorize.ts`) no ÚNICO lugar que decide "este
 * `Actor` pode entrar em `/admin`?": o layout de `src/app/admin/layout.tsx`.
 *
 * Isolada num arquivo próprio (em vez de inline no layout) para ser
 * diretamente testável sem precisar renderizar um Server Component: um
 * teste chama `assertAdminAreaAccess({ userId, role: Role.STUDENT })` e
 * confirma que lança `AuthorizationError` — a mesma prova que protegeria
 * qualquer requisição real de um STUDENT a `/admin`, independente de qual
 * mecanismo de autenticação resolve o `Actor` (hoje o mock de
 * desenvolvimento `getCurrentAdminActor()`, amanhã uma sessão real).
 *
 * CONTENT_EDITOR e ADMIN podem entrar na área administrativa (CURATOR_ROLES)
 * — a distinção "só ADMIN publica" continua inteiramente responsabilidade
 * dos serviços de domínio (`PUBLISHER_ROLES`), não deste guard de entrada.
 */
import { assertRole, CURATOR_ROLES, type Actor } from "@/server/auth/authorize";

/** Lança `AuthorizationError` se `actor.role` não for CONTENT_EDITOR nem ADMIN. */
export function assertAdminAreaAccess(actor: Actor): void {
  assertRole(actor, CURATOR_ROLES);
}
