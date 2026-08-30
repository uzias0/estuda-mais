/**
 * Teste de integração real das Server Actions de autenticação (etapa de
 * consolidação) — mesmo caminho que `SignUpForm`/`LoginForm`/`Header` usam.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  signUpAction,
  signInAction,
  signOutAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "./auth-actions";
import { getSessionActor } from "@/server/auth/session";
import { clearMockSession } from "@/test/authTestHelpers";

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

describe("auth-actions", () => {
  const userIds: string[] = [];
  const email = `test-fixture-auth-action-${Date.now()}@example.invalid`;

  it("signUpAction cria a conta, grava o cookie de sessão real, e redireciona para /dashboard", async () => {
    clearMockSession();
    const form = new FormData();
    form.set("name", "TEST_FIXTURE Aluno");
    form.set("email", email);
    form.set("password", "SenhaForte123!");

    await expectRedirectTo(() => signUpAction({}, form), "/dashboard");

    const actor = await getSessionActor();
    expect(actor).not.toBeNull();
    userIds.push(actor!.userId);
  });

  it("signUpAction devolve { error } (não lança) para e-mail já cadastrado", async () => {
    const form = new FormData();
    form.set("name", "TEST_FIXTURE Duplicado");
    form.set("email", email);
    form.set("password", "OutraSenha123!");

    const result = await signUpAction({}, form);
    expect(result.error).toMatch(/já está cadastrado/);
  });

  it("signInAction autentica e grava sessão real", async () => {
    clearMockSession();
    const form = new FormData();
    form.set("email", email);
    form.set("password", "SenhaForte123!");

    await expectRedirectTo(() => signInAction({}, form), "/dashboard");
    expect(await getSessionActor()).not.toBeNull();
  });

  it("signInAction devolve { error } genérico para senha errada, sem criar sessão", async () => {
    clearMockSession();
    const form = new FormData();
    form.set("email", email);
    form.set("password", "SenhaErrada000!");

    const result = await signInAction({}, form);
    expect(result.error).toBe("E-mail ou senha inválidos.");
    expect(await getSessionActor()).toBeNull();
  });

  it("signOutAction destrói a sessão real e redireciona para /login", async () => {
    const form = new FormData();
    form.set("email", email);
    form.set("password", "SenhaForte123!");
    await expectRedirectTo(() => signInAction({}, form), "/dashboard");
    expect(await getSessionActor()).not.toBeNull();

    await expectRedirectTo(() => signOutAction(), "/login");
    expect(await getSessionActor()).toBeNull();
  });

  it("requestPasswordResetAction sempre devolve a mesma mensagem genérica de sucesso, exista ou não o e-mail", async () => {
    const resultExisting = await requestPasswordResetAction(
      {},
      (() => {
        const form = new FormData();
        form.set("email", email);
        return form;
      })(),
    );
    const resultInexistente = await requestPasswordResetAction(
      {},
      (() => {
        const form = new FormData();
        form.set("email", "nao-existe-de-verdade@example.invalid");
        return form;
      })(),
    );
    expect(resultExisting.message).toBeTruthy();
    expect(resultExisting.message).toBe(resultInexistente.message);
    expect(resultExisting.error).toBeUndefined();
    expect(resultInexistente.error).toBeUndefined();
  });

  it("resetPasswordAction redefine a senha real e permite login com a nova senha", async () => {
    const resetEmail = `test-fixture-auth-action-reset-${Date.now()}@example.invalid`;
    const signUpForm = new FormData();
    signUpForm.set("name", "TEST_FIXTURE Reset");
    signUpForm.set("email", resetEmail);
    signUpForm.set("password", "SenhaOriginal123!");
    clearMockSession();
    await expectRedirectTo(() => signUpAction({}, signUpForm), "/dashboard");
    const actor = await getSessionActor();
    userIds.push(actor!.userId);

    const token = await prisma.passwordResetToken.create({
      data: { userId: actor!.userId, expiresAt: new Date(Date.now() + 60_000) },
    });

    const resetForm = new FormData();
    resetForm.set("token", token.id);
    resetForm.set("password", "SenhaNovaAposReset456!");
    await expectRedirectTo(() => resetPasswordAction({}, resetForm), "/login?redefinida=1");

    clearMockSession();
    const loginForm = new FormData();
    loginForm.set("email", resetEmail);
    loginForm.set("password", "SenhaNovaAposReset456!");
    await expectRedirectTo(() => signInAction({}, loginForm), "/dashboard");
  });

  afterAll(async () => {
    clearMockSession();
    if (userIds.length) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });
});
