import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 20_000, // testes de integração batem no Postgres real de dev
    // Testes de integração compartilham o mesmo Postgres real de dev (sem
    // schema por worker) — arquivos rodando em paralelo podem competir pelo
    // mesmo pool de `Question`/`Diagnostic` global (flake documentado desde
    // docs/MODULO-6.md e docs/MODULO-10.md). Serializar por ARQUIVO elimina a
    // condição de corrida sem tocar em nenhuma regra de negócio; os testes
    // dentro de um mesmo arquivo continuam podendo rodar em paralelo.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // `next/headers` real exige um contexto de requisição HTTP de verdade
      // (lança fora dele) — os testes chamam Server Actions/serviços
      // diretamente, sem servidor, então precisam de um armazenamento de
      // cookie simulado (ver src/test/mock-next-headers.ts) para exercitar
      // a autenticação real por sessão sem precisar de um servidor Next.js
      // de verdade rodando durante a suíte.
      "next/headers": path.resolve(import.meta.dirname, "./src/test/mock-next-headers.ts"),
    },
  },
});
