/**
 * Teste do guard de acesso administrativo (Módulo 12, seção 19.1: "STUDENT
 * tentando acessar /admin"). Puro — sem banco — mesma convenção de
 * `authorize.test.ts` (Módulo 1/2): constrói o `Actor` na mão e confirma o
 * comportamento de `assertRole`/`CURATOR_ROLES` reaproveitado aqui.
 */
import { describe, it, expect } from "vitest";
import { AuthorizationError } from "./authorize";
import { assertAdminAreaAccess } from "./adminAccess";
import { Role } from "@/generated/prisma/enums";

describe("assertAdminAreaAccess", () => {
  it("bloqueia STUDENT — o layout de /admin redireciona quando isto lança", () => {
    expect(() => assertAdminAreaAccess({ userId: "u1", role: Role.STUDENT })).toThrow(
      AuthorizationError,
    );
  });

  it("permite CONTENT_EDITOR", () => {
    expect(() => assertAdminAreaAccess({ userId: "u1", role: Role.CONTENT_EDITOR })).not.toThrow();
  });

  it("permite ADMIN", () => {
    expect(() => assertAdminAreaAccess({ userId: "u1", role: Role.ADMIN })).not.toThrow();
  });
});
