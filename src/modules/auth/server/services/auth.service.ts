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
 */
export async function signIn(input: SignInInput): Promise<AuthResult> {
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

  const session = await createSession(user.id);
  return {
    actor: { userId: user.id, role: user.role },
    sessionId: session.id,
    expiresAt: session.expiresAt,
  };
}
