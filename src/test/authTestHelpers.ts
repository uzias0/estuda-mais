/**
 * Helper de teste para autenticação real (etapa de consolidação) — cria
 * uma `AuthSession` de verdade e grava o cookie simulado
 * (`src/test/mock-next-headers.ts`, aliasado em `vitest.config.mts`), para
 * que uma Server Action chamada diretamente num teste resolva o MESMO
 * `getSessionActor()` que resolveria numa requisição HTTP real — não é um
 * segundo mecanismo de autenticação para teste, é o mesmo, com o
 * armazenamento de cookie simulado.
 */
import { createSession, SESSION_COOKIE_NAME } from "@/server/auth/session";
// Import RELATIVO direto ao mock (não via "next/headers"): o alias em
// vitest.config.mts só existe em tempo de execução do Vitest, não para o
// `tsc` real — importar pelo caminho relativo evita que o typecheck do
// projeto inteiro precise conhecer `__setMockCookie`/`__clearMockCookies`
// como se fossem parte da API real de `next/headers`.
import { __setMockCookie, __clearMockCookies } from "./mock-next-headers";

/** "Loga" o usuário informado — cria uma AuthSession real e grava o cookie simulado. */
export async function loginAsUserId(userId: string): Promise<string> {
  const session = await createSession(userId);
  __setMockCookie(SESSION_COOKIE_NAME, session.id);
  return session.id;
}

export function clearMockSession(): void {
  __clearMockCookies();
}
