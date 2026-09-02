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
import { signUp, signIn, completeTwoFactorSignIn, AuthError } from "./auth.service";
import { beginTwoFactorSetup, confirmTwoFactorSetup } from "./two-factor.service";
import { generateTotpCode } from "@/server/auth/totp";
import { __resetRateLimits } from "@/server/auth/rate-limit";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  createFixtureConcept,
  cleanupFixtures,
} from "@/test/fixtures";
import { hashPassword } from "@/server/auth/password";
import { ANONYMOUS_EMAIL_DOMAIN } from "@/server/auth/anonymous-session";
import {
  startDiagnostic,
  submitDiagnosticAnswer,
  finishDiagnostic,
} from "@/modules/assessment/server/services/diagnostic.service";

/**
 * Monta um `answerData` válido para QUALQUER um dos 8 `QuestionType`
 * suportados — `startDiagnostic` sorteia do pool GLOBAL de questões
 * publicadas/tagueadas (que inclui todo o conteúdo acadêmico real
 * povoado neste projeto, não só a fixture MULTIPLE_CHOICE deste teste) —
 * mesmo helper já usado em `gamification-events.service.test.ts`.
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

describe("auth.service", () => {
  const userIds: string[] = [];
  const sessionIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const studySessionIdsForCleanup: string[] = [];
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

  it("signUp rejeita e-mail já cadastrado mesmo com capitalização diferente (fase 'recuperar admin sem Shell')", async () => {
    await expect(
      signUp({
        email: email.toUpperCase(),
        password: "OutraSenha123!",
        name: "TEST_FIXTURE Duplicado Maiúsculo",
      }),
    ).rejects.toThrow(AuthError);
  });

  it("signUp normaliza o e-mail para minúsculas ao gravar, mesmo se digitado em maiúsculas", async () => {
    const mixedCaseEmail = `Test-Fixture-Auth-Mixed-Case-${Date.now()}@Example.Invalid`;
    const result = await signUp({
      email: mixedCaseEmail,
      password: "SenhaForte123!",
      name: "TEST_FIXTURE Maiúsculo",
    });
    userIds.push(result.actor.userId);
    sessionIds.push(result.sessionId);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: result.actor.userId } });
    expect(user.email).toBe(mixedCaseEmail.toLowerCase());
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

  it("signIn autentica com a senha certa e cria uma nova sessão (sem 2FA ativado)", async () => {
    const result = await signIn({ email, password: "SenhaForte123!" });
    if (result.requiresTwoFactor) throw new Error("Não deveria exigir 2FA — não está ativado.");
    sessionIds.push(result.sessionId);
    expect(result.actor.role).toBe(Role.STUDENT);
  });

  it("signIn funciona mesmo digitando o e-mail com capitalização diferente da usada no cadastro (fase 'recuperar admin sem Shell' — achado real: 'E-mail ou senha inválidos' mesmo com a senha certa)", async () => {
    const result = await signIn({ email: email.toUpperCase(), password: "SenhaForte123!" });
    if (result.requiresTwoFactor) throw new Error("Não deveria exigir 2FA — não está ativado.");
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

  it("signIn com 2FA ativado devolve um desafio pendente, SEM criar sessão — só completeTwoFactorSignIn com o código certo cria a sessão de verdade", async () => {
    const twoFactorEmail = `test-fixture-auth-2fa-${Date.now()}@example.invalid`;
    const signUpResult = await signUp({
      email: twoFactorEmail,
      password: "SenhaForte123!",
      name: "TEST_FIXTURE 2FA",
    });
    userIds.push(signUpResult.actor.userId);
    sessionIds.push(signUpResult.sessionId);

    const actor = signUpResult.actor;
    const setupInfo = await beginTwoFactorSetup(actor);
    await confirmTwoFactorSetup(actor, generateTotpCode(setupInfo.secret));

    const outcome = await signIn({ email: twoFactorEmail, password: "SenhaForte123!" });
    if (!outcome.requiresTwoFactor) throw new Error("Deveria exigir 2FA — acabou de ser ativado.");
    expect(outcome.challengeId).toBeTruthy();

    // Nenhuma sessão nova foi criada só por acertar a senha.
    const sessionsBeforeCode = await prisma.authSession.count({
      where: { userId: actor.userId },
    });

    await expect(completeTwoFactorSignIn(outcome.challengeId, "000000")).rejects.toThrow(AuthError);

    const validCode = generateTotpCode(setupInfo.secret);
    const completed = await completeTwoFactorSignIn(outcome.challengeId, validCode);
    sessionIds.push(completed.sessionId);
    expect(completed.actor.userId).toBe(actor.userId);

    const sessionsAfterCode = await prisma.authSession.count({ where: { userId: actor.userId } });
    expect(sessionsAfterCode).toBe(sessionsBeforeCode + 1);

    // O mesmo desafio não pode ser reutilizado (uso único).
    await expect(completeTwoFactorSignIn(outcome.challengeId, validCode)).rejects.toThrow(
      AuthError,
    );
  });

  it("signIn com 2FA ativado também aceita um código de recuperação no lugar do TOTP", async () => {
    const user = await createFixtureUser("auth-2fa-recovery", Role.STUDENT);
    userIds.push(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword("SenhaForte123!") },
    });
    const actor = { userId: user.id, role: Role.STUDENT };

    const setupInfo = await beginTwoFactorSetup(actor);
    const [recoveryCode] = await confirmTwoFactorSetup(actor, generateTotpCode(setupInfo.secret));

    const outcome = await signIn({ email: user.email, password: "SenhaForte123!" });
    if (!outcome.requiresTwoFactor) throw new Error("Deveria exigir 2FA.");

    const completed = await completeTwoFactorSignIn(outcome.challengeId, recoveryCode);
    sessionIds.push(completed.sessionId);
    expect(completed.actor.userId).toBe(user.id);
  });

  it("signUp com anonymousUserId herda o diagnóstico feito antes do cadastro (StudySession/QuestionAttempt reatribuídos) e apaga o usuário anônimo", async () => {
    const source = await createFixtureSource("anon-diag");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("anon-diag");
    conceptIds.push(concept.id);
    const question = await createFixtureMultipleChoiceQuestion("anon-diag", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    await createFixtureQuestionKnowledgeTag(question.id, "CONCEPT", concept.id);
    const correctOptionId = question.options.find((o) => o.isCorrect)!.id;

    // Simula o usuário anônimo real (mesmo padrão de e-mail de
    // `anonymous-session.ts`) fazendo o diagnóstico ANTES de existir conta.
    const anon = await prisma.user.create({
      data: {
        email: `anon-test-${Date.now()}@${ANONYMOUS_EMAIL_DOMAIN}`,
        role: Role.STUDENT,
        profile: { create: { name: "Visitante" } },
      },
    });
    const anonActor = { userId: anon.id, role: Role.STUDENT };

    const { sessionId, questions } = await startDiagnostic(anonActor, 1);
    studySessionIdsForCleanup.push(sessionId);
    expect(questions.length).toBeGreaterThan(0);
    const answerData =
      questions[0].id === question.id
        ? { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId }
        : await anyValidAnswerDataFor(questions[0].id);
    await submitDiagnosticAnswer(anonActor, {
      sessionId,
      questionId: questions[0].id,
      answerData: answerData as never,
      timeSpentMs: 100,
    });
    await finishDiagnostic(anonActor, sessionId);

    const newEmail = `test-fixture-auth-anon-signup-${Date.now()}@example.invalid`;
    const signUpResult = await signUp(
      { email: newEmail, password: "SenhaForte123!", name: "TEST_FIXTURE Herdou Diagnóstico" },
      anon.id,
    );
    userIds.push(signUpResult.actor.userId);
    sessionIds.push(signUpResult.sessionId);

    // A StudySession/QuestionAttempt do diagnóstico agora pertencem à conta REAL.
    const session = await prisma.studySession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.userId).toBe(signUpResult.actor.userId);
    const attempts = await prisma.questionAttempt.findMany({ where: { sessionId } });
    expect(attempts.length).toBeGreaterThan(0);
    attempts.forEach((a) => expect(a.userId).toBe(signUpResult.actor.userId));

    // O usuário anônimo temporário foi apagado — não sobra lixo.
    expect(await prisma.user.findUnique({ where: { id: anon.id } })).toBeNull();
  });

  it("signUp SEM anonymousUserId (cadastro direto) continua funcionando exatamente como antes", async () => {
    const email = `test-fixture-auth-no-anon-${Date.now()}@example.invalid`;
    const result = await signUp({ email, password: "SenhaForte123!", name: "TEST_FIXTURE Direto" });
    userIds.push(result.actor.userId);
    sessionIds.push(result.sessionId);
    expect(result.actor.role).toBe(Role.STUDENT);
  });

  it("signUp com um anonymousUserId que NÃO é anônimo de verdade (e-mail real) ignora — nunca reatribui dados de outro usuário real", async () => {
    const realOther = await createFixtureUser("auth-not-anon", Role.STUDENT);
    userIds.push(realOther.id);
    const otherSession = await prisma.studySession.create({
      data: { userId: realOther.id, mode: "FORMACAO" },
    });
    studySessionIdsForCleanup.push(otherSession.id);

    const email = `test-fixture-auth-fake-anon-${Date.now()}@example.invalid`;
    const result = await signUp(
      { email, password: "SenhaForte123!", name: "TEST_FIXTURE Fake Anon" },
      realOther.id, // forjado — NÃO é um usuário anônimo de verdade.
    );
    userIds.push(result.actor.userId);
    sessionIds.push(result.sessionId);

    // A sessão do OUTRO usuário real continua com ele — nada foi roubado.
    const stillOwned = await prisma.studySession.findUniqueOrThrow({
      where: { id: otherSession.id },
    });
    expect(stillOwned.userId).toBe(realOther.id);
    // E o "outro usuário real" (forjado como anônimo) NÃO foi apagado.
    expect(await prisma.user.findUnique({ where: { id: realOther.id } })).not.toBeNull();
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
    await cleanupFixtures({
      studySessionIds: studySessionIdsForCleanup,
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
