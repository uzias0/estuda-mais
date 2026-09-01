"use client";

/**
 * Formulário de login — mesmo padrão de `SignUpForm.tsx`, com uma segunda
 * etapa opcional: quando a conta tem 2FA ativado, `signInAction` devolve
 * um `challengeId` (SEM criar sessão nenhuma) e este componente troca para
 * um segundo formulário pedindo o código do app autenticador (ou um código
 * de recuperação) — só `completeTwoFactorSignInAction`, com o código
 * certo, cria a sessão de verdade.
 */
import { useActionState, useState } from "react";
import Link from "next/link";
import {
  signInAction,
  completeTwoFactorSignInAction,
  type SignInActionResult,
  type CompleteTwoFactorActionResult,
} from "@/server/actions/auth-actions";

const initialSignInState: SignInActionResult = {};
const initialTwoFactorState: CompleteTwoFactorActionResult = {};

export function LoginForm() {
  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    initialSignInState,
  );
  const [twoFactorState, twoFactorFormAction, twoFactorPending] = useActionState(
    completeTwoFactorSignInAction,
    initialTwoFactorState,
  );
  // Guardado à parte (não só `signInState.challengeId`) para a troca de
  // fase acontecer uma única vez e não regredir se o usuário reenviar o
  // primeiro formulário sem querer (ex.: voltar o navegador).
  const [challengeId, setChallengeId] = useState<string | null>(null);

  if (signInState.challengeId && !challengeId) {
    setChallengeId(signInState.challengeId);
  }

  if (challengeId) {
    return (
      <form action={twoFactorFormAction} className="card auth-card stack fade-in-up">
        <input type="hidden" name="challengeId" value={challengeId} />
        <p style={{ color: "var(--color-text-muted)" }}>
          Digite o código de 6 dígitos do seu app autenticador (ou um código de recuperação).
        </p>
        <div className="field">
          <label htmlFor="code">Código</label>
          <input
            id="code"
            name="code"
            className="text-input"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            placeholder="000000"
          />
        </div>
        {twoFactorState?.error ? (
          <p role="alert" style={{ color: "var(--color-danger)" }}>
            {twoFactorState.error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={twoFactorPending}>
          {twoFactorPending ? "Verificando…" : "Verificar"}
        </button>
        <p className="auth-links">
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => setChallengeId(null)}
          >
            Voltar
          </button>
        </p>
      </form>
    );
  }

  return (
    <form action={signInFormAction} className="card auth-card stack fade-in-up">
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          className="text-input"
          required
          autoComplete="email"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          className="text-input"
          required
          autoComplete="current-password"
        />
      </div>
      {signInState?.error ? (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {signInState.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={signInPending}>
        {signInPending ? "Entrando…" : "Entrar"}
      </button>
      <p className="auth-links">
        <Link href="/esqueci-senha">Esqueci minha senha</Link>
      </p>
      <p className="auth-links">
        Ainda não tem conta? <Link href="/signup">Criar conta</Link>
      </p>
    </form>
  );
}
