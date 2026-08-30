/**
 * Teste de integração real de autenticação (etapa de consolidação) —
 * `signUp`/`signIn` contra o Postgres real, incluindo os casos de
 * anti-fraude explicitamente pedidos: e-mail duplicado, senha errada,
 * `role` nunca aceito do cliente, e-mail inexistente com a MESMA mensagem
 * genérica de senha errada (não vazar quais e-mails existem).
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { signUp, signIn, AuthError } from "./auth.service";
import { __resetRateLimits } from "@/server/auth/rate-limit";

describe("auth.service", () => {
  const userIds: string[] = [];
  const sessionIds: string[] = [];
  const email = `test-fixture-auth-${Date.now()}@example.invalid`;

  it("signUp cria um usuário real, sempre STUDENT, com senha com hash (nunca em texto puro)", async () => {
    const result = await signUp({ email, password: "SenhaForte123!", name: "TEST_FIXTURE Aluno" });
    userIds.push(result.actor.userId);
    sessionIds.push(result.sessionId);

    expect(result.actor.role).toBe(Role.STUDENT);

    const user = await prisma.user.findUnique({ where: { id: result.actor.userId } });
    expect(user!.passwordHash).not.toBeNull();
    expect(user!.passwordHash).not.toBe("SenhaForte123!");
    expect(user!.passwordHash).toContain(":"); // formato salt:hash

    const session = await prisma.authSession.findUnique({ where: { id: result.sessionId } });
    expect(session).not.toBeNull();
    expect(session!.userId).toBe(result.actor.userId);
    expect(session!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("signUp rejeita e-mail já cadastrado", async () => {
    await expect(
      signUp({ email, password: "OutraSenha123!", name: "TEST_FIXTURE Duplicado" }),
    ).rejects.toThrow(AuthError);
  });

  it("signUp ignora um `role` forjado — sempre nasce STUDENT mesmo se o payload tivesse outro campo", async () => {
    // O schema de entrada (`SignUpInputSchema`) nem sequer tem campo `role` —
    // um objeto com `role` extra é simplesmente ignorado pelo `.parse()`, o
    // que já é a prova de que não há como o cliente decidir o papel.
    const extraEmail = `test-fixture-auth-role-${Date.now()}@example.invalid`;
    const result = await signUp({
      email: extraEmail,
      password: "SenhaForte123!",
      name: "TEST_FIXTURE",
      // @ts-expect-error -- campo forjado deliberadamente, fora do tipo real
      role: "ADMIN",
    });
    userIds.push(result.actor.userId);
    sessionIds.push(result.sessionId);
    expect(result.actor.role).toBe(Role.STUDENT);
  });

  it("signIn autentica com a senha certa e cria uma nova sessão", async () => {
    const result = await signIn({ email, password: "SenhaForte123!" });
    sessionIds.push(result.sessionId);
    expect(result.actor.role).toBe(Role.STUDENT);
  });

  it("signIn rejeita senha errada com mensagem genérica", async () => {
    await expect(signIn({ email, password: "SenhaErrada000!" })).rejects.toThrow(
      "E-mail ou senha inválidos.",
    );
  });

  it("signIn rejeita e-mail inexistente com a MESMA mensagem genérica (não revela quais e-mails existem)", async () => {
    await expect(
      signIn({ email: "nao-existe-de-verdade@example.invalid", password: "QualquerSenha123!" }),
    ).rejects.toThrow("E-mail ou senha inválidos.");
  });

  it("signIn bloqueia após exceder o limite de tentativas para o mesmo e-mail (rate limiting)", async () => {
    __resetRateLimits();
    const target = `test-fixture-auth-ratelimit-${Date.now()}@example.invalid`;
    for (let i = 0; i < 8; i++) {
      await expect(signIn({ email: target, password: "QualquerSenha123!" })).rejects.toThrow(
        "E-mail ou senha inválidos.",
      );
    }
    // A 9ª tentativa (mesmo e-mail, mesma janela) é barrada pelo limitador,
    // não mais pela verificação de credenciais — mensagem diferente confirma
    // qual caminho foi acionado.
    await expect(signIn({ email: target, password: "QualquerSenha123!" })).rejects.toThrow(
      /muitas tentativas/i,
    );
    __resetRateLimits();
  });

  afterAll(async () => {
    if (sessionIds.length)
      await prisma.authSession.deleteMany({ where: { id: { in: sessionIds } } });
    if (userIds.length) {
      await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });
});
