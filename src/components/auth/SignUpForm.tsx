"use client";

/**
 * Formulário de cadastro (etapa de consolidação) — Client Component só
 * porque `useActionState` (React 19) precisa exibir a mensagem de erro
 * devolvida por `signUpAction` inline, sem recarregar a página nem crashar
 * para um `error.tsx` genérico (mesmo motivo de `QuestionRenderer`/
 * `DiagnosticRunner`, Módulo 11: Client Component só quando há
 * interatividade real).
 */
import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionResult } from "@/server/actions/auth-actions";

const initialState: AuthActionResult = {};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <form
      action={formAction}
      className="card stack fade-in-up"
      style={{ maxWidth: 420, margin: "0 auto" }}
    >
      <div className="field">
        <label htmlFor="name">Nome</label>
        <input id="name" name="name" className="text-input" required autoComplete="name" />
      </div>
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
          minLength={8}
          autoComplete="new-password"
        />
        <small style={{ color: "var(--color-text-muted)" }}>Pelo menos 8 caracteres.</small>
      </div>
      {state?.error ? (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
      <p style={{ textAlign: "center", fontSize: "0.9rem" }}>
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </form>
  );
}
