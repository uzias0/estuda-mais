"use client";

/**
 * Boundary de erro da área administrativa (Módulo 12) — mesmo padrão de
 * `src/app/dashboard/error.tsx` (Módulo 11): cobre toda rota `/admin/*` sem
 * `error.tsx` próprio. NUNCA repassa `error.message`/stack para a tela —
 * inclusive erros de validação de domínio (`AuthorizationError`,
 * `QuestionValidationError`, `PublicationPolicyError`, ...) aparecem só como
 * mensagem genérica aqui; o texto real fica nos logs do servidor.
 */
import { ErrorState } from "@/components/ErrorState";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-container">
      <ErrorState
        message="Não foi possível concluir esta operação administrativa."
        onRetry={reset}
      />
    </div>
  );
}
