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
import {
  signUp,
  signIn,
  completeTwoFactorSignIn,
  AuthError,
} from "@/modules/auth/server/services/auth.service";
import {
  requestPasswordReset,
  resetPassword,
  PasswordResetError,
} from "@/modules/auth/server/services/password-reset.service";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  getTwoFactorStatus,
  TwoFactorError,
} from "@/modules/auth/server/services/two-factor.service";
import { requireSessionActor } from "@/server/auth/session";
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

export interface SignInActionResult {
  error?: string;
  /** Presente quando a conta tem 2FA ativado — nenhuma sessão foi criada ainda. */
  challengeId?: string;
}

export async function signInAction(
  _prevState: SignInActionResult,
  formData: FormData,
): Promise<SignInActionResult> {
  let result: Awaited<ReturnType<typeof signIn>>;
  try {
    result = await signIn({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    if (e && typeof e === "object" && "issues" in e) {
      return { error: "Informe um e-mail e senha válidos." };
    }
    throw e;
  }

  if (result.requiresTwoFactor) {
    return { challengeId: result.challengeId };
  }
  await setSessionCookie(result.sessionId, result.expiresAt);
  redirect("/dashboard");
}

export interface CompleteTwoFactorActionResult {
  error?: string;
}

export async function completeTwoFactorSignInAction(
  _prevState: CompleteTwoFactorActionResult,
  formData: FormData,
): Promise<CompleteTwoFactorActionResult> {
  try {
    const result = await completeTwoFactorSignIn(
      String(formData.get("challengeId") ?? ""),
      String(formData.get("code") ?? ""),
    );
    await setSessionCookie(result.sessionId, result.expiresAt);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
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

// ---- Autenticação de dois fatores (gestão — configurar/desativar) --------
// Sempre exige sessão real (`requireSessionActor`) — nenhuma destas ações
// aceita um `userId` do cliente, mesma regra de todo o resto do app.

export interface TwoFactorSetupActionResult {
  error?: string;
  secret?: string;
  otpAuthUri?: string;
}

/** Gera um novo segredo pendente — não ativa nada ainda (ver `two-factor.service.ts`). */
export async function beginTwoFactorSetupAction(): Promise<TwoFactorSetupActionResult> {
  const actor = await requireSessionActor();
  const info = await beginTwoFactorSetup(actor);
  return { secret: info.secret, otpAuthUri: info.otpAuthUri };
}

export interface ConfirmTwoFactorActionResult {
  error?: string;
  recoveryCodes?: string[];
}

export async function confirmTwoFactorSetupAction(
  _prevState: ConfirmTwoFactorActionResult,
  formData: FormData,
): Promise<ConfirmTwoFactorActionResult> {
  const actor = await requireSessionActor();
  try {
    const recoveryCodes = await confirmTwoFactorSetup(actor, String(formData.get("code") ?? ""));
    return { recoveryCodes };
  } catch (e) {
    if (e instanceof TwoFactorError) return { error: e.message };
    throw e;
  }
}

export async function disableTwoFactorAction(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const actor = await requireSessionActor();
  try {
    await disableTwoFactor(actor, String(formData.get("password") ?? ""));
  } catch (e) {
    if (e instanceof TwoFactorError) return { error: e.message };
    throw e;
  }
  return {};
}

export async function getTwoFactorStatusAction(): Promise<{ enabled: boolean }> {
  const actor = await requireSessionActor();
  return getTwoFactorStatus(actor);
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
