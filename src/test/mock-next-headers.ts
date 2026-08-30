/**
 * Mock de `next/headers` SÓ para o ambiente de teste (aliasado em
 * `vitest.config.mts`, nunca usado em `next dev`/`next build`).
 *
 * `cookies()` real do Next.js exige um contexto de requisição de verdade —
 * chamá-la fora disso lança `cookies was called outside a request scope`.
 * Os testes de integração deste projeto chamam Server Actions/serviços
 * DIRETAMENTE (sem servidor HTTP real, mesmo padrão de todo o resto da
 * suíte desde o Módulo 11) — por isso a autenticação real
 * (`src/server/auth/session.ts`) precisa de um armazenamento de cookie
 * simulado para os testes conseguirem "logar" um `Actor` antes de chamar
 * uma Server Action, exercitando o MESMO código de produção
 * (`getSessionActor`/`setSessionCookie`), não uma versão paralela.
 *
 * `__setMockCookie`/`__clearMockCookies` NÃO fazem parte da API real de
 * `next/headers` — são usados só por `src/test/authTestHelpers.ts`.
 */
const store = new Map<string, string>();

function makeCookieStore() {
  return {
    get(name: string) {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string) {
      store.set(name, value);
    },
    delete(name: string) {
      store.delete(name);
    },
  };
}

export async function cookies() {
  return makeCookieStore();
}

export function __setMockCookie(name: string, value: string): void {
  store.set(name, value);
}

export function __clearMockCookies(): void {
  store.clear();
}
