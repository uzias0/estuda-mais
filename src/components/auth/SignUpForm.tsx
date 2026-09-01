"use client";

/**
 * Formulário de cadastro (etapa de consolidação) — Client Component só
 * porque `useActionState` (React 19) precisa exibir a mensagem de erro
 * devolvida por `signUpAction` inline, sem recarregar a página nem crashar
 * para um `error.tsx` genérico (mesmo motivo de `QuestionRenderer`/
 * `DiagnosticRunner`, Módulo 11: Client Component só quando há
 * interatividade real).
 */
import { useActionState, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionResult } from "@/server/actions/auth-actions";

const initialState: AuthActionResult = {};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  /**
   * Confirmar a senha (pedido do usuário: "preciso confirmar a senha duas
   * vezes") é só uma checagem client-side contra digitação errada — o
   * campo de confirmação NUNCA é enviado ao servidor (sem `name`), então
   * `signUpAction` continua recebendo exatamente o mesmo payload de
   * sempre (`email`/`password`/`name`), nenhuma regra nova no servidor.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const confirmValue = (
      event.currentTarget.elements.namedItem("passwordConfirm") as HTMLInputElement | null
    )?.value;
    if (confirmValue !== passwordRef.current?.value) {
      event.preventDefault();
      setConfirmMismatch(true);
      return;
    }
    setConfirmMismatch(false);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="card auth-card stack fade-in-up">
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
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          className="text-input"
          required
          minLength={8}
          autoComplete="new-password"
          onChange={() => setConfirmMismatch(false)}
        />
        <small style={{ color: "var(--color-text-muted)" }}>Pelo menos 8 caracteres.</small>
      </div>
      <div className="field">
        <label htmlFor="passwordConfirm">Confirme a senha</label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          className="text-input"
          required
          minLength={8}
          autoComplete="new-password"
          onChange={() => setConfirmMismatch(false)}
        />
      </div>
      {confirmMismatch ? (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          As senhas não são iguais — confira e tente de novo.
        </p>
      ) : null}
      {state?.error ? (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
      <p className="auth-links">
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </form>
  );
}
