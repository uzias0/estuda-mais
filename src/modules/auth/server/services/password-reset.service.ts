/**
 * Recuperação de senha real (etapa de fechamento, seção 10: "recuperação de
 * senha"). Mesmo padrão de `auth.service.ts`: nenhuma regra duplicada —
 * reaproveita `hashPassword` (Módulo 1), `consumeRateLimit` (endurecimento
 * já existente), e o mesmo model `PasswordResetToken` cujo `id` É o próprio
 * token opaco (mesma decisão de `AuthSession`, ver schema.prisma).
 *
 * Duas etapas, cada uma sem revelar informação a um atacante:
 *   1. `requestPasswordReset(email)` — SEMPRE resolve com sucesso (nunca
 *      lança/revela se o e-mail existe), mesma filosofia de `signIn`
 *      ("mensagem de erro genérica idêntica"). Só cria um token e "envia"
 *      (`email-sender.ts`) quando o usuário realmente existe.
 *   2. `resetPassword(token, newPassword)` — valida token de uso único,
 *      não expirado; ao trocar a senha, invalida TODAS as sessões ativas
 *      do usuário (revogação real, mesmo mecanismo de `destroySession`) —
 *      prática de segurança padrão: um invasor com uma sessão antiga não
 *      continua logado depois que o dono da conta redefine a senha.
 */
import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { consumeRateLimit, RateLimitError } from "@/server/auth/rate-limit";
import { sendPasswordResetEmail } from "@/server/auth/email-sender";
import {
  RequestPasswordResetInputSchema,
  ResetPasswordInputSchema,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
} from "@/modules/auth/types/auth.schema";

const REQUEST_MAX_ATTEMPTS = 5;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora — curto de propósito (token viaja por e-mail/URL)

export class PasswordResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetError";
  }
}

/**
 * Solicita a redefinição — resolve sempre (mesma resposta pública, exista
 * ou não o e-mail), evitando que a própria existência de uma conta seja
 * descoberta por tentativa. `baseUrl` vem de quem chama (Server Action, que
 * conhece a origem real da requisição) — este serviço nunca deriva URL a
 * partir de cabeçalhos não confiáveis do cliente.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
  baseUrl: string,
): Promise<void> {
  const data = RequestPasswordResetInputSchema.parse(input);

  try {
    consumeRateLimit(
      `passwordReset:${data.email.toLowerCase()}`,
      REQUEST_MAX_ATTEMPTS,
      REQUEST_WINDOW_MS,
    );
  } catch (e) {
    if (e instanceof RateLimitError) throw new PasswordResetError(e.message);
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) return; // não revela se o e-mail existe

  const token = await prisma.passwordResetToken.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const resetUrl = `${baseUrl}/redefinir-senha/${token.id}`;
  await sendPasswordResetEmail({ to: user.email, resetUrl });
}

/** Redefine a senha a partir de um token válido, de uso único e não expirado. */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const data = ResetPasswordInputSchema.parse(input);

  const token = await prisma.passwordResetToken.findUnique({ where: { id: data.token } });
  if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) {
    throw new PasswordResetError("Link de redefinição inválido ou expirado. Solicite um novo.");
  }

  const passwordHash = await hashPassword(data.password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    // Revoga todas as sessões ativas do usuário — quem trocou a senha
    // (o dono real da conta) precisa logar de novo em todo dispositivo;
    // uma sessão comprometida antiga deixa de valer imediatamente.
    prisma.authSession.deleteMany({ where: { userId: token.userId } }),
  ]);
}
