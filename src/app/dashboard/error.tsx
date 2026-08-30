"use client";

/**
 * Boundary de erro do dashboard (Módulo 11, seção 40) — cobre todas as
 * rotas `/dashboard/*` que não têm um `error.tsx` próprio. Convenção real
 * do Next.js App Router (Error Boundaries), não uma solução inventada.
 * NUNCA repassa `error.message`/stack para a tela — mensagem genérica só.
 */
import { ErrorState } from "@/components/ErrorState";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-container">
      <ErrorState message="Não foi possível carregar seus estudos." onRetry={reset} />
    </div>
  );
}
