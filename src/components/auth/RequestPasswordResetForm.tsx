"use client";

/** Formulário de solicitação de redefinição de senha — mesmo padrão de `LoginForm.tsx`. */
import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordResetAction,
  type RequestPasswordResetActionResult,
} from "@/server/actions/auth-actions";

const initialState: RequestPasswordResetActionResult = {};

export function RequestPasswordResetForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={formAction} className="card auth-card stack fade-in-up">
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
      {state?.error ? (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p role="status" style={{ color: "var(--color-text-muted)" }}>
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link de redefinição"}
      </button>
      <p className="auth-links">
        Lembrou a senha? <Link href="/login">Entrar</Link>
      </p>
    </form>
  );
}
