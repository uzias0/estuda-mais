"use client";

/**
 * Gestão de autenticação de dois fatores no Perfil (pedido do usuário:
 * "ter verificação de dois fatores"). Três fases client-side, nenhum
 * estado de negócio decidido aqui — tudo vem das Server Actions
 * (`auth-actions.ts`):
 *
 *   "status" → mostra se está ativo, com botão pra ativar/desativar.
 *   "confirm" → depois de `beginTwoFactorSetupAction`, mostra o segredo
 *     (texto, para digitar no app autenticador — ver `docs/FASE-2FA.md`
 *     sobre a decisão de não gerar imagem de QR nesta entrega) + um campo
 *     para confirmar com o código real do app.
 *   "recovery-codes" → depois de confirmado, mostra os 10 códigos de
 *     recuperação em texto puro UMA ÚNICA VEZ (nunca recuperáveis depois).
 */
import { useActionState, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  beginTwoFactorSetupAction,
  confirmTwoFactorSetupAction,
  disableTwoFactorAction,
  type ConfirmTwoFactorActionResult,
  type AuthActionResult,
} from "@/server/actions/auth-actions";

type Phase = "status" | "confirm" | "recovery-codes";

const initialConfirmState: ConfirmTwoFactorActionResult = {};
const initialDisableState: AuthActionResult = {};

export function TwoFactorSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [phase, setPhase] = useState<Phase>("status");
  const [setupInfo, setSetupInfo] = useState<{ secret: string; otpAuthUri: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [beginError, setBeginError] = useState<string | null>(null);
  const [beginPending, setBeginPending] = useState(false);

  const [confirmState, confirmFormAction, confirmPending] = useActionState(
    async (_prev: ConfirmTwoFactorActionResult, formData: FormData) => {
      const result = await confirmTwoFactorSetupAction(_prev, formData);
      if (result.recoveryCodes) {
        setRecoveryCodes(result.recoveryCodes);
        setEnabled(true);
        setPhase("recovery-codes");
      }
      return result;
    },
    initialConfirmState,
  );

  const [disableState, disableFormAction, disablePending] = useActionState(
    async (_prev: AuthActionResult, formData: FormData) => {
      const result = await disableTwoFactorAction(_prev, formData);
      if (!result.error) setEnabled(false);
      return result;
    },
    initialDisableState,
  );

  async function handleBeginSetup() {
    setBeginPending(true);
    setBeginError(null);
    try {
      const result = await beginTwoFactorSetupAction();
      if (result.error || !result.secret || !result.otpAuthUri) {
        setBeginError(result.error ?? "Não foi possível iniciar a configuração.");
        return;
      }
      setSetupInfo({ secret: result.secret, otpAuthUri: result.otpAuthUri });
      setPhase("confirm");
    } finally {
      setBeginPending(false);
    }
  }

  if (phase === "recovery-codes") {
    return (
      <section className="card stack">
        <p className="card-title" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={16} color="var(--color-success)" aria-hidden="true" />
          Dois fatores ativado
        </p>
        <p style={{ fontWeight: 700, color: "var(--color-danger)" }}>
          Guarde estes 10 códigos de recuperação agora — eles NÃO aparecem de novo depois desta
          tela. Use um deles se perder acesso ao seu app autenticador.
        </p>
        <div
          className="card card--tight"
          style={{
            fontFamily: "monospace",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {recoveryCodes.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            setPhase("status");
            setSetupInfo(null);
            setRecoveryCodes([]);
          }}
        >
          Copiei os códigos, entendi
        </button>
      </section>
    );
  }

  if (phase === "confirm" && setupInfo) {
    return (
      <section className="card stack">
        <p className="card-title">Ativar dois fatores</p>
        <p style={{ color: "var(--color-text-muted)" }}>
          Abra seu app autenticador (Google Authenticator, Authy, 1Password, etc.), escolha
          &quot;adicionar conta manualmente&quot; e digite este código:
        </p>
        <p
          className="card card--tight"
          style={{ fontFamily: "monospace", fontSize: "1.1rem", textAlign: "center" }}
        >
          {setupInfo.secret}
        </p>
        <form action={confirmFormAction} className="stack">
          <div className="field">
            <label htmlFor="twofa-code">Código do app (6 dígitos)</label>
            <input
              id="twofa-code"
              name="code"
              className="text-input"
              required
              inputMode="numeric"
              placeholder="000000"
              autoComplete="one-time-code"
            />
          </div>
          {confirmState?.error ? (
            <p role="alert" style={{ color: "var(--color-danger)" }}>
              {confirmState.error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={confirmPending}>
            {confirmPending ? "Confirmando…" : "Confirmar e ativar"}
          </button>
        </form>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => {
            setPhase("status");
            setSetupInfo(null);
          }}
        >
          Cancelar
        </button>
      </section>
    );
  }

  return (
    <section className="card stack">
      <p className="card-title">Segurança — dois fatores</p>
      <p style={{ color: "var(--color-text-muted)" }}>
        {enabled
          ? "Ativado — no login, além da senha, é preciso um código do seu app autenticador."
          : "Desativado — proteja sua conta com um segundo código, além da senha."}
      </p>
      {!enabled ? (
        <>
          {beginError ? (
            <p role="alert" style={{ color: "var(--color-danger)" }}>
              {beginError}
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={beginPending}
            onClick={handleBeginSetup}
          >
            {beginPending ? "Preparando…" : "Ativar autenticação de dois fatores"}
          </button>
        </>
      ) : (
        <form action={disableFormAction} className="stack">
          <div className="field">
            <label htmlFor="twofa-disable-password">Confirme sua senha para desativar</label>
            <input
              id="twofa-disable-password"
              name="password"
              type="password"
              className="text-input"
              required
              autoComplete="current-password"
            />
          </div>
          {disableState?.error ? (
            <p role="alert" style={{ color: "var(--color-danger)" }}>
              {disableState.error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-secondary btn-block" disabled={disablePending}>
            {disablePending ? "Desativando…" : "Desativar dois fatores"}
          </button>
        </form>
      )}
    </section>
  );
}
