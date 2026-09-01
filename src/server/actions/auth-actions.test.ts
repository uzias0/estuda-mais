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
import {
  startAnonymousDiagnosticAction,
  submitAnonymousDiagnosticAnswerAction,
} from "./anonymous-diagnostic-actions";
import { getSessionActor } from "@/server/auth/session";
import { getAnonymousUserId } from "@/server/auth/anonymous-session";
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

/**
 * Monta um `answerData` válido para QUALQUER um dos 8 `QuestionType`
 * suportados — o diagnóstico anônimo sorteia do pool GLOBAL de questões
 * publicadas, não só uma fixture específica.
 */
async function anyValidAnswerDataFor(questionId: string): Promise<Record<string, unknown>> {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: { options: true },
  });
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
    case "CASE_STUDY":
      return { type: question.type, selectedOptionId: question.options[0].id };
    case "MULTI_SELECT":
      return { type: "MULTI_SELECT", selectedOptionIds: [question.options[0].id] };
    case "ORDERING":
      return {
        type: "ORDERING",
        orderedOptionIds: [...question.options].sort((a, b) => a.order - b.order).map((o) => o.id),
      };
    case "MATCHING": {
      const answerKey = question.answerKey as { pairs: Array<{ left: string; right: string }> };
      return { type: "MATCHING", pairs: answerKey.pairs };
    }
    case "FILL_BLANK": {
      const answerKey = question.answerKey as { blanks: Array<{ accepted: string[] }> };
      return { type: "FILL_BLANK", answers: answerKey.blanks.map((b) => b.accepted[0]) };
    }
    case "SHORT_ANSWER": {
      const answerKey = question.answerKey as { accepted: string[] };
      return { type: "SHORT_ANSWER", text: answerKey.accepted[0] };
    }
    default:
      throw new Error(`Tipo de questão não suportado no teste: "${question.type}".`);
  }
}

describe("auth-actions", () => {
  const userIds: string[] = [];
  const studySessionIds: string[] = [];
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

  it("fase 'diagnóstico antes do cadastro': fazer o diagnóstico anônimo e depois signUpAction herda o resultado e limpa o cookie anônimo", async () => {
    clearMockSession();

    // Visitante SEM conta responde o diagnóstico — mesmo caminho real de
    // `/comecar` (Server Actions anônimas, cookie próprio).
    const { sessionId, questions } = await startAnonymousDiagnosticAction();
    studySessionIds.push(sessionId);
    expect(questions.length).toBeGreaterThan(0);
    const anonymousUserId = await getAnonymousUserId();
    expect(anonymousUserId).toBeTruthy();

    const answerData = await anyValidAnswerDataFor(questions[0].id);
    await submitAnonymousDiagnosticAnswerAction({
      sessionId,
      questionId: questions[0].id,
      answerData: answerData as never,
      timeSpentMs: 100,
    });

    // Agora cria a conta de verdade — o cookie anônimo já existe (setado
    // pelas chamadas acima), então `signUpAction` deve ler e reatribuir.
    const signUpEmail = `test-fixture-auth-action-anon-${Date.now()}@example.invalid`;
    const form = new FormData();
    form.set("name", "TEST_FIXTURE Diagnóstico Anônimo");
    form.set("email", signUpEmail);
    form.set("password", "SenhaForte123!");
    await expectRedirectTo(() => signUpAction({}, form), "/dashboard");

    const actor = await getSessionActor();
    expect(actor).not.toBeNull();
    userIds.push(actor!.userId);

    // A StudySession do diagnóstico agora pertence à conta real recém-criada.
    const session = await prisma.studySession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.userId).toBe(actor!.userId);

    // O cookie anônimo foi limpo — não sobra apontando pra um usuário já apagado.
    expect(await getAnonymousUserId()).toBeNull();
    // O usuário anônimo temporário foi apagado.
    expect(await prisma.user.findUnique({ where: { id: anonymousUserId! } })).toBeNull();
  });

  afterAll(async () => {
    clearMockSession();
    if (studySessionIds.length) {
      await prisma.questionAttempt.deleteMany({ where: { sessionId: { in: studySessionIds } } });
      await prisma.studySession.deleteMany({ where: { id: { in: studySessionIds } } });
    }
    if (userIds.length) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });
});
