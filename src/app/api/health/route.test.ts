/**
 * Teste do health check (fase de produção, seção 11) — confirma que
 * responde 200 com o Postgres real acessível, incluindo versão/ambiente,
 * sem exigir autenticação (rota pública, para monitoramento externo).
 */
import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("responde status ok com o banco real acessível e a versão do app", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
  });
});
