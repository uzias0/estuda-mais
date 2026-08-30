/**
 * Sessão de autenticação REAL (etapa de consolidação, seção 18 do prompt) —
 * substitui `devActor.ts` como autoridade de `Actor` em toda rota/Server
 * Action de produção. `devActor.ts` permanece no repositório só para
 * scripts/testes que precisam de um `Actor` sem passar pelo fluxo de
 * login (documentado como tal no próprio arquivo) — nenhuma página ou
 * Server Action de produção deve mais importar dele a partir desta etapa.
 *
 * Mecanismo: cookie httpOnly com um token OPACO (o próprio `id` de
 * `AuthSession`, sem conteúdo/assinatura) — nunca um JWT auto-contido.
 * Vantagem real sobre JWT aqui: revogar é `DELETE` de uma linha (logout,
 * expiração, ou uma eventual limpeza administrativa), sem precisar de
 * lista de revogação nem de gerenciar segredo de assinatura. O custo (uma
 * consulta ao banco por requisição autenticada) é aceitável no volume
 * atual do produto — mesma prioridade de simplicidade sobre otimização
 * prematura já registrada em outros módulos.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/authorize";
import { assertAdminAreaAccess } from "@/server/auth/adminAccess";

export const SESSION_COOKIE_NAME = "estuda_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export async function createSession(userId: string): Promise<{ id: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  return prisma.authSession.create({ data: { userId, expiresAt } });
}

/** Grava o cookie de sessão — só pode ser chamado de dentro de uma Server Action/Route Handler. */
export async function setSessionCookie(sessionId: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * Resolve o `Actor` a partir do cookie de sessão real. Devolve `null`
 * quando não há cookie, a sessão não existe, ou já expirou (nunca lança —
 * quem chama decide se isso significa "redirecionar para /login" ou
 * "tratar como visitante").
 */
export async function getSessionActor(): Promise<Actor | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.authSession.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }
  return { userId: session.user.id, role: session.user.role };
}

/** Exige um `Actor` autenticado — redireciona para `/login` quando não há sessão válida. */
export async function requireSessionActor(): Promise<Actor> {
  const actor = await getSessionActor();
  if (!actor) redirect("/login");
  return actor;
}

/**
 * Exige um `Actor` autenticado E com `CURATOR_ROLES` (CONTENT_EDITOR/ADMIN)
 * — usado pelo layout de `/admin`. Sem sessão → `/login`; sessão válida mas
 * sem papel de curadoria (STUDENT) → `/dashboard`, nunca chega a ver a
 * estrutura administrativa (seção 14/19.1 do Módulo 12, agora com
 * autenticação real por trás em vez do mock).
 */
export async function requireAdminSessionActor(): Promise<Actor> {
  const actor = await getSessionActor();
  if (!actor) redirect("/login");
  try {
    assertAdminAreaAccess(actor); // mesma regra de `CURATOR_ROLES`, um único lugar (Módulo 12)
  } catch {
    redirect("/dashboard");
  }
  return actor;
}

export async function destroySession(sessionId: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { id: sessionId } });
}

/** Consultada pelo cookie atual, sem exigir — usada para decidir a rota inicial ("/"). */
export async function getCurrentSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}
