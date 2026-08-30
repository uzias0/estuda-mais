"use client";

/** Formulário de login — mesmo padrão de `SignUpForm.tsx`. */
import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionResult } from "@/server/actions/auth-actions";

const initialState: AuthActionResult = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form
      action={formAction}
      className="card stack fade-in-up"
      style={{ maxWidth: 420, margin: "0 auto" }}
    >
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
      {state?.error ? (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p style={{ textAlign: "center", fontSize: "0.9rem" }}>
        <Link href="/esqueci-senha">Esqueci minha senha</Link>
      </p>
      <p style={{ textAlign: "center", fontSize: "0.9rem" }}>
        Ainda não tem conta? <Link href="/signup">Criar conta</Link>
      </p>
    </form>
  );
}
