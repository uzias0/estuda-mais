"use server";

/**
 * Server Actions de autenticação (etapa de consolidação) — camada fina
 * sobre `auth.service.ts`. Diferente das demais Server Actions do projeto
 * (que deixam erros propagarem para o `error.tsx` mais próximo, Módulo 11):
 * aqui, `AuthError` (e-mail duplicado, credenciais inválidas) é capturado e
 * devolvido como `{ error: string }` para o FORMULÁRIO exibir inline — uma
 * página de login/cadastro pública precisa de uma mensagem específica
 * ("e-mail já cadastrado", "senha incorreta"), não de uma tela de erro
 * genérica. Qualquer outro erro (ex.: falha de banco) continua propagando
 * normalmente para `error.tsx`.
 */
import { redirect } from "next/navigation";
import { signUp, signIn, AuthError } from "@/modules/auth/server/services/auth.service";
import {
  requestPasswordReset,
  resetPassword,
  PasswordResetError,
} from "@/modules/auth/server/services/password-reset.service";
import {
  setSessionCookie,
  clearSessionCookie,
  getCurrentSessionId,
  destroySession,
} from "@/server/auth/session";

export interface AuthActionResult {
  error?: string;
}

export async function signUpAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const result = await signUp({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      name: String(formData.get("name") ?? ""),
    });
    await setSessionCookie(result.sessionId, result.expiresAt);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e && typeof e === "object" && "issues" in e) {
      return {
        error: "Verifique os dados informados (e-mail válido, senha com pelo menos 8 caracteres).",
      };
    }
    throw e;
  }
  redirect("/dashboard");
}

export async function signInAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    const result = await signIn({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    await setSessionCookie(result.sessionId, result.expiresAt);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e && typeof e === "object" && "issues" in e) {
      return { error: "Informe um e-mail e senha válidos." };
    }
    throw e;
  }
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const sessionId = await getCurrentSessionId();
  if (sessionId) await destroySession(sessionId);
  await clearSessionCookie();
  redirect("/login");
}

/**
 * Sempre devolve a MESMA mensagem de sucesso, exista ou não o e-mail
 * cadastrado (`requestPasswordReset` já garante isso no serviço) — o
 * formulário nunca deve conseguir diferenciar os dois casos.
 */
export interface RequestPasswordResetActionResult {
  error?: string;
  message?: string;
}

const GENERIC_REQUEST_SUCCESS =
  "Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha para ele.";

export async function requestPasswordResetAction(
  _prevState: RequestPasswordResetActionResult,
  formData: FormData,
): Promise<RequestPasswordResetActionResult> {
  try {
    await requestPasswordReset(
      { email: String(formData.get("email") ?? "") },
      process.env.APP_BASE_URL ?? "http://localhost:3000",
    );
  } catch (e) {
    if (e instanceof PasswordResetError) return { error: e.message };
    if (e && typeof e === "object" && "issues" in e) {
      return { error: "Informe um e-mail válido." };
    }
    throw e;
  }
  return { message: GENERIC_REQUEST_SUCCESS };
}

export async function resetPasswordAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  try {
    await resetPassword({
      token: String(formData.get("token") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch (e) {
    if (e instanceof PasswordResetError) return { error: e.message };
    if (e && typeof e === "object" && "issues" in e) {
      return { error: "A senha precisa ter pelo menos 8 caracteres." };
    }
    throw e;
  }
  redirect("/login?redefinida=1");
}
