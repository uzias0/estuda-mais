/**
 * Autenticação real (etapa de consolidação, seção 18 do prompt) — cadastro
 * e login. `passwordHash`/`verifyPassword` já existiam desde o Módulo 1
 * (`src/server/auth/password.ts`, scrypt da stdlib do Node, sem dependência
 * nova) — este serviço só os USA, não os recria. Sessão é criada aqui e a
 * gravação do COOKIE fica por conta de quem chama (Server Action), porque
 * `next/headers`/`cookies().set()` só funciona dentro de uma Server
 * Action/Route Handler — não é responsabilidade deste serviço de domínio.
 *
 * Regra de anti-fraude central: `role` NUNCA é aceito como entrada de
 * `signUp` — todo cadastro nasce `Role.STUDENT`, decidido pelo servidor.
 */
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import type { Actor } from "@/server/auth/authorize";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { consumeRateLimit, RateLimitError } from "@/server/auth/rate-limit";
import { verifyTotpCode } from "@/server/auth/totp";
import { consumeRecoveryCode } from "@/modules/auth/server/services/two-factor.service";
import {
  SignUpInputSchema,
  SignInInputSchema,
  type SignUpInput,
  type SignInInput,
} from "@/modules/auth/types/auth.schema";

// Endurecimento mínimo de produção (seção 10 da etapa de fechamento) — ver
// `src/server/auth/rate-limit.ts` para o porquê de ser por e-mail, em
// memória, e os limites escolhidos (generosos o bastante para um usuário
// real que erra a senha algumas vezes, apertados o bastante para travar um
// script de força bruta/flood no mesmo processo).
const SIGN_IN_MAX_ATTEMPTS = 8;
const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
const SIGN_UP_MAX_ATTEMPTS = 5;
const SIGN_UP_WINDOW_MS = 60 * 60 * 1000;
// Autenticação de dois fatores (seção "segurança de conta", pedido do
// usuário) — janela mais apertada que a de login: o código TOTP tem só
// 6 dígitos (espaço de busca bem menor que uma senha), então o limite
// precisa ser mais rígido para continuar protegendo contra força bruta.
const TWO_FACTOR_MAX_ATTEMPTS = 6;
const TWO_FACTOR_WINDOW_MS = 15 * 60 * 1000;
// Curto de propósito — o desafio existe só entre "senha certa" e "código
// confirmado", uma janela de poucos minutos no mesmo fluxo de login.
const TWO_FACTOR_CHALLENGE_TTL_MS = 10 * 60 * 1000;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthResult {
  actor: Actor;
  sessionId: string;
  expiresAt: Date;
}

/** Devolvido por `signIn` quando a conta tem 2FA ativado — nenhuma sessão real existe ainda. */
export interface SignInTwoFactorRequired {
  requiresTwoFactor: true;
  challengeId: string;
}

export type SignInOutcome = ({ requiresTwoFactor: false } & AuthResult) | SignInTwoFactorRequired;

/** Cadastra um novo usuário — sempre `Role.STUDENT`, sempre com senha com hash real. */
export async function signUp(input: SignUpInput): Promise<AuthResult> {
  const data = SignUpInputSchema.parse(input);

  try {
    consumeRateLimit(`signUp:${data.email.toLowerCase()}`, SIGN_UP_MAX_ATTEMPTS, SIGN_UP_WINDOW_MS);
  } catch (e) {
    if (e instanceof RateLimitError) throw new AuthError(e.message);
    throw e;
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AuthError("Este e-mail já está cadastrado.");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: Role.STUDENT,
      profile: { create: { name: data.name } },
    },
  });

  const session = await createSession(user.id);
  return {
    actor: { userId: user.id, role: user.role },
    sessionId: session.id,
    expiresAt: session.expiresAt,
  };
}

/**
 * Autentica por e-mail+senha. Mensagem de erro deliberadamente genérica em
 * ambos os casos (e-mail inexistente vs. senha errada) — não confirmar para
 * um atacante se um e-mail está cadastrado.
 *
 * Quando a conta tem 2FA ativado (`twoFactorEnabledAt`), a senha certa
 * SOZINHA não basta: em vez de criar a sessão real, devolve um desafio
 * pendente (`TwoFactorChallenge`, uso único, expira em poucos minutos) —
 * só `completeTwoFactorSignIn` (abaixo), com o código certo, cria a sessão.
 */
export async function signIn(input: SignInInput): Promise<SignInOutcome> {
  const data = SignInInputSchema.parse(input);

  try {
    consumeRateLimit(`signIn:${data.email.toLowerCase()}`, SIGN_IN_MAX_ATTEMPTS, SIGN_IN_WINDOW_MS);
  } catch (e) {
    if (e instanceof RateLimitError) throw new AuthError(e.message);
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.passwordHash) {
    throw new AuthError("E-mail ou senha inválidos.");
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw new AuthError("E-mail ou senha inválidos.");
  }

  if (user.twoFactorEnabledAt) {
    const challenge = await prisma.twoFactorChallenge.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + TWO_FACTOR_CHALLENGE_TTL_MS) },
    });
    return { requiresTwoFactor: true, challengeId: challenge.id };
  }

  const session = await createSession(user.id);
  return {
    requiresTwoFactor: false,
    actor: { userId: user.id, role: user.role },
    sessionId: session.id,
    expiresAt: session.expiresAt,
  };
}

/**
 * Segunda etapa do login com 2FA — recebe o `challengeId` devolvido por
 * `signIn` e um código (TOTP de 6 dígitos OU um código de recuperação de
 * uso único). Só cria a sessão real se o desafio ainda for válido (não
 * expirado, não usado) E o código bater.
 */
export async function completeTwoFactorSignIn(
  challengeId: string,
  code: string,
): Promise<AuthResult> {
  const challenge = await prisma.twoFactorChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.usedAt || challenge.expiresAt.getTime() < Date.now()) {
    throw new AuthError("Verificação expirada — faça login novamente.");
  }

  try {
    consumeRateLimit(
      `twoFactor:${challenge.userId}`,
      TWO_FACTOR_MAX_ATTEMPTS,
      TWO_FACTOR_WINDOW_MS,
    );
  } catch (e) {
    if (e instanceof RateLimitError) throw new AuthError(e.message);
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user || !user.twoFactorSecret || !user.twoFactorEnabledAt) {
    throw new AuthError("Código inválido.");
  }

  const validTotp = verifyTotpCode(user.twoFactorSecret, code);
  const validRecovery = !validTotp && (await consumeRecoveryCode(user.id, code));
  if (!validTotp && !validRecovery) {
    throw new AuthError("Código inválido.");
  }

  const session = await createSession(user.id);
  await prisma.twoFactorChallenge.update({
    where: { id: challengeId },
    data: { usedAt: new Date() },
  });

  return {
    actor: { userId: user.id, role: user.role },
    sessionId: session.id,
    expiresAt: session.expiresAt,
  };
}
