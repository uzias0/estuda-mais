/**
 * Sessão ANÔNIMA (fase "diagnóstico antes do cadastro" — pedido do
 * usuário: "antes de eu criar a conta, eu quero que eu faça primeiro a
 * trilha, pra começar o diagnóstico... depois fale crie sua conta e
 * continue agora mesmo grátis"). Diferente de `session.ts` (login real):
 * aqui não há senha nem dado sensível — é só um jeito de um VISITANTE
 * ainda sem conta satisfazer a FK obrigatória `userId` em
 * `StudySession`/`QuestionAttempt` (Módulo 3), que exigem um usuário real,
 * para responder o diagnóstico antes de se cadastrar.
 *
 * Implementação: um `User` real, mas MARCADO como anônimo pelo próprio
 * padrão do e-mail (`anon-<token>@anon.estuda.invalid` — domínio
 * `.invalid`, RFC 2606, nunca resolve de verdade, mesmo espírito do
 * `@example.invalid` já usado nas fixtures de teste deste projeto) — sem
 * precisar de NENHUMA migration nova (`User.email` já existe,
 * `passwordHash` já é opcional). O cookie guarda o PRÓPRIO `userId` (não
 * um token opaco de sessão): não há nada sensível a proteger aqui (nenhuma
 * senha, nenhum dado pessoal ainda existe para este usuário) — diferente
 * da sessão de login real, que precisa de um token revogável.
 *
 * Ciclo de vida: quando o visitante cria uma conta de verdade
 * (`signUp`, `auth.service.ts`), o `StudySession`/`QuestionAttempt` deste
 * usuário anônimo são REATRIBUÍDOS pro novo `userId` real, e o usuário
 * anônimo é apagado — nunca fica lixo permanente. Se o visitante nunca
 * criar conta, o cookie expira em 7 dias e o usuário anônimo fica órfão,
 * inofensivo (sem senha, sem e-mail real, sem dado pessoal) — mesma
 * filosofia de "sem cron" já registrada em outros módulos: aceitável no
 * volume atual, uma limpeza administrativa futura poderia apagar
 * usuários `@anon.estuda.invalid` com mais de N dias, se necessário.
 */
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import type { Actor } from "@/server/auth/authorize";

export const ANONYMOUS_COOKIE_NAME = "estuda_anon_id";
export const ANONYMOUS_EMAIL_DOMAIN = "anon.estuda.invalid";
const ANONYMOUS_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 dias — tempo generoso pra terminar o diagnóstico e criar a conta.

export function isAnonymousEmail(email: string): boolean {
  return email.endsWith(`@${ANONYMOUS_EMAIL_DOMAIN}`);
}

/** Cria (ou reaproveita, se o cookie já apontar pra um válido) um usuário anônimo real — sem senha, sem dado pessoal. */
export async function getOrCreateAnonymousActor(): Promise<Actor> {
  const store = await cookies();
  const existingId = store.get(ANONYMOUS_COOKIE_NAME)?.value;
  if (existingId) {
    const user = await prisma.user.findUnique({ where: { id: existingId } });
    if (user && isAnonymousEmail(user.email)) {
      return { userId: user.id, role: user.role };
    }
  }

  const user = await prisma.user.create({
    data: {
      email: `anon-${randomBytes(12).toString("hex")}@${ANONYMOUS_EMAIL_DOMAIN}`,
      role: Role.STUDENT,
      profile: { create: { name: "Visitante" } },
    },
  });
  store.set(ANONYMOUS_COOKIE_NAME, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ANONYMOUS_COOKIE_MAX_AGE_SECONDS,
  });
  return { userId: user.id, role: user.role };
}

/** Lê o id anônimo do cookie SEM criar nada — usado no cadastro pra saber se há um diagnóstico pra herdar. */
export async function getAnonymousUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ANONYMOUS_COOKIE_NAME)?.value ?? null;
}

export async function clearAnonymousSession(): Promise<void> {
  const store = await cookies();
  store.delete(ANONYMOUS_COOKIE_NAME);
}
