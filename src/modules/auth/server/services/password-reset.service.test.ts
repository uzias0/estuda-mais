/**
 * Teste de integração real de recuperação de senha (etapa de fechamento,
 * seção 10) — `requestPasswordReset`/`resetPassword` contra o Postgres
 * real: token de uso único, expiração, revogação de sessões ativas ao
 * trocar a senha, e não revelação de quais e-mails existem.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { signUp } from "./auth.service";
import { requestPasswordReset, resetPassword, PasswordResetError } from "./password-reset.service";
import { __resetRateLimits } from "@/server/auth/rate-limit";

const BASE_URL = "http://localhost:3000";

describe("password-reset.service", () => {
  const userIds: string[] = [];
  const sessionIds: string[] = [];

  async function createUser(suffix: string) {
    const email = `test-fixture-pwreset-${suffix}-${Date.now()}@example.invalid`;
    const result = await signUp({ email, password: "SenhaForte123!", name: "TEST_FIXTURE" });
    userIds.push(result.actor.userId);
    sessionIds.push(result.sessionId);
    return { email, userId: result.actor.userId };
  }

  it("requestPasswordReset cria um token real para um e-mail existente", async () => {
    const { email, userId } = await createUser("existe");
    await requestPasswordReset({ email }, BASE_URL);

    const token = await prisma.passwordResetToken.findFirst({ where: { userId } });
    expect(token).not.toBeNull();
    expect(token!.usedAt).toBeNull();
    expect(token!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("requestPasswordReset encontra a conta mesmo com o e-mail digitado em capitalização diferente (fase 'recuperar admin sem Shell')", async () => {
    const { email, userId } = await createUser("case-insensitive");
    await requestPasswordReset({ email: email.toUpperCase() }, BASE_URL);

    const token = await prisma.passwordResetToken.findFirst({ where: { userId } });
    expect(token).not.toBeNull();
  });

  it("requestPasswordReset resolve sem erro para um e-mail inexistente, sem criar nenhum token (não revela quais e-mails existem)", async () => {
    const before = await prisma.passwordResetToken.count();
    await expect(
      requestPasswordReset({ email: "nao-existe-de-verdade@example.invalid" }, BASE_URL),
    ).resolves.toBeUndefined();
    const after = await prisma.passwordResetToken.count();
    expect(after).toBe(before);
  });

  it("resetPassword troca a senha, marca o token como usado, e revoga todas as sessões ativas do usuário", async () => {
    const { email, userId } = await createUser("reset-ok");
    await requestPasswordReset({ email }, BASE_URL);
    const token = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId } });

    const sessionsBefore = await prisma.authSession.count({ where: { userId } });
    expect(sessionsBefore).toBeGreaterThan(0);

    await resetPassword({ token: token.id, password: "NovaSenhaForte456!" });

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(updatedUser.passwordHash).not.toContain("SenhaForte123!");

    const updatedToken = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { id: token.id },
    });
    expect(updatedToken.usedAt).not.toBeNull();

    const sessionsAfter = await prisma.authSession.count({ where: { userId } });
    expect(sessionsAfter).toBe(0);
  });

  it("resetPassword rejeita um token já usado (uso único)", async () => {
    const { email, userId } = await createUser("reset-reuso");
    await requestPasswordReset({ email }, BASE_URL);
    const token = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId } });

    await resetPassword({ token: token.id, password: "PrimeiraTroca123!" });
    await expect(resetPassword({ token: token.id, password: "SegundaTroca123!" })).rejects.toThrow(
      PasswordResetError,
    );
  });

  it("resetPassword rejeita um token expirado", async () => {
    const { userId } = await createUser("reset-expirado");
    const expiredToken = await prisma.passwordResetToken.create({
      data: { userId, expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(
      resetPassword({ token: expiredToken.id, password: "NovaSenhaForte789!" }),
    ).rejects.toThrow(PasswordResetError);
  });

  it("resetPassword rejeita um token inexistente/inválido", async () => {
    await expect(
      resetPassword({ token: "token-que-nao-existe", password: "QualquerSenha123!" }),
    ).rejects.toThrow(PasswordResetError);
  });

  it("requestPasswordReset é limitado por taxa por e-mail", async () => {
    __resetRateLimits();
    const target = `test-fixture-pwreset-ratelimit-${Date.now()}@example.invalid`;
    for (let i = 0; i < 5; i++) {
      await expect(requestPasswordReset({ email: target }, BASE_URL)).resolves.toBeUndefined();
    }
    await expect(requestPasswordReset({ email: target }, BASE_URL)).rejects.toThrow(
      /muitas tentativas/i,
    );
    __resetRateLimits();
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
    if (sessionIds.length)
      await prisma.authSession.deleteMany({ where: { id: { in: sessionIds } } });
    if (userIds.length) {
      await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });
});
