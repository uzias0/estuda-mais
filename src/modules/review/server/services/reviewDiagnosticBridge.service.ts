/**
 * Ponte explícita com o diagnóstico do Módulo 3 (seção 16 do prompt do
 * Módulo 5: "diagnóstico + tentativas + histórico de revisão = priorização
 * adaptativa"). Não recalcula "conceito fraco" de outro jeito — reaproveita
 * `getDiagnosticResult` (Módulo 3) integralmente, e usa o resultado só para
 * decidir QUAIS conceitos merecem um `ReviewItem` (via `ensureReviewItem`).
 * A prioridade em si continua vindo de `isConceptWeak`/`computeReviewPriority`
 * (Módulo 5), que generalizam o mesmo cálculo para todo o histórico do
 * usuário, não só a sessão de diagnóstico.
 */
import { Actor } from "@/server/auth/authorize";
import { getDiagnosticResult } from "@/modules/assessment/server/services/diagnostic.service";
import { ensureReviewItem } from "./reviewItem.service";

/**
 * Garante um `ReviewItem` (scope=CONCEPT) para cada conceito identificado
 * como lacuna (`weakConceptIds`) na sessão de diagnóstico informada.
 * Idempotente — chamar de novo com a mesma sessão não duplica itens.
 */
export async function enqueueWeakConceptsFromDiagnostic(actor: Actor, diagnosticSessionId: string) {
  const result = await getDiagnosticResult(actor, diagnosticSessionId);
  return Promise.all(
    result.weakConceptIds.map((conceptId) =>
      ensureReviewItem(actor, { scope: "CONCEPT", conceptId }),
    ),
  );
}
