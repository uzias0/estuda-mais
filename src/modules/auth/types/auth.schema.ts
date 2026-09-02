import { z } from "zod";

/**
 * Fase "recuperar admin sem Shell" (achado real: usuário criou um ADMIN
 * com um e-mail de uma capitalização e tentou logar com outra —
 * "E-mail ou senha inválidos" mesmo com a senha certa) — e-mail é
 * convencionalmente tratado como case-insensitive por praticamente todo
 * provedor real; normalizar para minúsculas AQUI, na borda de entrada
 * (Zod `.transform`), garante que TODO consumidor (`signUp`/`signIn`/
 * `requestPasswordReset`) sempre recebe e compara o mesmo valor
 * canônico, sem precisar lembrar de normalizar em cada `findUnique`
 * espalhado pelo código.
 */
const emailSchema = z
  .string()
  .email()
  .max(320)
  .transform((v) => v.toLowerCase());

/**
 * Entrada de cadastro (etapa de consolidação, seção 18 do prompt).
 * Deliberadamente SEM campo `role` — todo cadastro nasce `STUDENT`,
 * decidido pelo servidor (`auth.service.ts`), nunca pelo cliente. Promover
 * alguém a CONTENT_EDITOR/ADMIN é uma operação administrativa fora deste
 * fluxo (hoje via `scripts/bootstrap-admin.mjs`, ver `docs/FINALIZACAO-
 * PROJETO.md`).
 */
export const SignUpInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(160),
});
export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export const SignInInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});
export type SignInInput = z.infer<typeof SignInInputSchema>;

/** Recuperação de senha (etapa de fechamento, seção 10). */
export const RequestPasswordResetInputSchema = z.object({
  email: emailSchema,
});
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetInputSchema>;

export const ResetPasswordInputSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
