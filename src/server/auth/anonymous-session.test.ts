/**
 * Teste de integração real da sessão anônima (fase "diagnóstico antes do
 * cadastro") — contra o Postgres real e o cookie simulado de teste
 * (`src/test/mock-next-headers.ts`, mesmo mecanismo de `session.test.ts`).
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  getOrCreateAnonymousActor,
  getAnonymousUserId,
  clearAnonymousSession,
  isAnonymousEmail,
  ANONYMOUS_COOKIE_NAME,
} from "./anonymous-session";
import { clearMockSession } from "@/test/authTestHelpers";
import { cleanupFixtures } from "@/test/fixtures";

describe("anonymous-session", () => {
  const userIds: string[] = [];

  it("isAnonymousEmail reconhece o domínio anônimo e rejeita e-mail real", () => {
    expect(isAnonymousEmail("anon-abc123@anon.estuda.invalid")).toBe(true);
    expect(isAnonymousEmail("aluno.de.verdade@gmail.com")).toBe(false);
  });

  it("getAnonymousUserId devolve null sem cookie nenhum", async () => {
    clearMockSession();
    expect(await getAnonymousUserId()).toBeNull();
  });

  it("getOrCreateAnonymousActor cria um usuário real (sem senha, e-mail anônimo) e grava o cookie", async () => {
    clearMockSession();
    const actor = await getOrCreateAnonymousActor();
    userIds.push(actor.userId);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    expect(user.passwordHash).toBeNull();
    expect(isAnonymousEmail(user.email)).toBe(true);

    expect(await getAnonymousUserId()).toBe(actor.userId);
  });

  it("chamar de novo reaproveita o MESMO usuário anônimo (não cria outro a cada chamada)", async () => {
    clearMockSession();
    const first = await getOrCreateAnonymousActor();
    userIds.push(first.userId);
    const second = await getOrCreateAnonymousActor();
    expect(second.userId).toBe(first.userId);
  });

  it("clearAnonymousSession remove o cookie — a próxima chamada cria um usuário NOVO", async () => {
    clearMockSession();
    const first = await getOrCreateAnonymousActor();
    userIds.push(first.userId);

    await clearAnonymousSession();
    expect(await getAnonymousUserId()).toBeNull();

    const second = await getOrCreateAnonymousActor();
    userIds.push(second.userId);
    expect(second.userId).not.toBe(first.userId);
  });

  it("cookie apontando pra um id que não existe mais é ignorado — cria um novo usuário", async () => {
    clearMockSession();
    const { __setMockCookie } = await import("@/test/mock-next-headers");
    __setMockCookie(ANONYMOUS_COOKIE_NAME, "id-que-nao-existe-de-verdade");

    const actor = await getOrCreateAnonymousActor();
    userIds.push(actor.userId);
    expect(actor.userId).not.toBe("id-que-nao-existe-de-verdade");
  });

  afterAll(async () => {
    clearMockSession();
    await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
    await cleanupFixtures({ userIds });
    await prisma.$disconnect();
  });
});
