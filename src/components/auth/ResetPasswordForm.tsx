"use client";

/** Formulário de definição de nova senha — mesmo padrão de `SignUpForm.tsx`. */
import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthActionResult } from "@/server/actions/auth-actions";

const initialState: AuthActionResult = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form
      action={formAction}
      className="card stack fade-in-up"
      style={{ maxWidth: 420, margin: "0 auto" }}
    >
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="password">Nova senha</label>
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
        {pending ? "Salvando…" : "Redefinir senha"}
      </button>
      <p style={{ textAlign: "center", fontSize: "0.9rem" }}>
        <Link href="/login">Voltar para o login</Link>
      </p>
    </form>
  );
}
