/**
 * Teste de integração real da sessão de autenticação (etapa de
 * consolidação) — `createSession`/`getSessionActor`/`requireSessionActor`/
 * `requireAdminSessionActor`/`destroySession`, contra o Postgres real e o
 * cookie simulado de teste (`src/test/mock-next-headers.ts`).
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import {
  createSession,
  getSessionActor,
  requireSessionActor,
  requireAdminSessionActor,
  destroySession,
  setSessionCookie,
} from "./session";
import { loginAsUserId, clearMockSession } from "@/test/authTestHelpers";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";

async function expectRedirectTo(fn: () => Promise<unknown>, path: string): Promise<void> {
  try {
    await fn();
    throw new Error(`esperava redirect para ${path}`);
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT")) throw e;
    expect(digest).toContain(`;${path};`);
  }
}

describe("session (autenticação real)", () => {
  const userIds: string[] = [];

  it("getSessionActor devolve null sem cookie", async () => {
    clearMockSession();
    expect(await getSessionActor()).toBeNull();
  });

  it("createSession + cookie simulado → getSessionActor resolve o Actor real", async () => {
    const student = await createFixtureUser("session-student", Role.STUDENT);
    userIds.push(student.id);

    await loginAsUserId(student.id);

    const actor = await getSessionActor();
    expect(actor).toEqual({ userId: student.id, role: Role.STUDENT });
  });

  it("getSessionActor devolve null e limpa a linha quando a sessão está expirada", async () => {
    const student = await createFixtureUser("session-expired", Role.STUDENT);
    userIds.push(student.id);

    const expired = await prisma.authSession.create({
      data: { userId: student.id, expiresAt: new Date(Date.now() - 1000) },
    });
    await setSessionCookie(expired.id, expired.expiresAt);

    expect(await getSessionActor()).toBeNull();
    const stillThere = await prisma.authSession.findUnique({ where: { id: expired.id } });
    expect(stillThere).toBeNull(); // limpa a sessão vencida ao detectar
  });

  it("requireSessionActor redireciona para /login sem sessão válida", async () => {
    clearMockSession();
    await expectRedirectTo(() => requireSessionActor(), "/login");
  });

  it("requireAdminSessionActor redireciona STUDENT para /dashboard (nunca vê a estrutura administrativa)", async () => {
    const student = await createFixtureUser("session-admin-guard-student", Role.STUDENT);
    userIds.push(student.id);
    await loginAsUserId(student.id);

    await expectRedirectTo(() => requireAdminSessionActor(), "/dashboard");
  });

  it("requireAdminSessionActor permite CONTENT_EDITOR/ADMIN", async () => {
    const editor = await createFixtureUser("session-admin-guard-editor", Role.CONTENT_EDITOR);
    userIds.push(editor.id);
    await loginAsUserId(editor.id);

    const actor = await requireAdminSessionActor();
    expect(actor.role).toBe(Role.CONTENT_EDITOR);
  });

  it("destroySession revoga de verdade — a mesma sessão não resolve mais Actor depois", async () => {
    const student = await createFixtureUser("session-destroy", Role.STUDENT);
    userIds.push(student.id);
    const session = await createSession(student.id);
    await setSessionCookie(session.id, session.expiresAt);

    expect(await getSessionActor()).not.toBeNull();

    await destroySession(session.id);
    expect(await getSessionActor()).toBeNull();
  });

  afterAll(async () => {
    clearMockSession();
    await cleanupFixtures({ userIds });
    await prisma.$disconnect();
  });
});
