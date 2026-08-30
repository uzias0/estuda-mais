/**
 * Política PURA de ordenação/limite do plano de estudo (Módulo 10, seções
 * 4/19/21) — sem Prisma, sem I/O. Recebe candidatos já gerados pelos
 * geradores (`server/queries/*` + `server/services/*`) e decide a ordem
 * final e o corte de tamanho — nunca decide QUAIS candidatos existem.
 */
import { DEFAULT_STUDY_PLAN_SIZE } from "@/config/study-engine";
import type { NextStudyAction } from "@/modules/study-engine/types/next-study-action";

/**
 * Ordena por prioridade decrescente (seção 21: "aplicar uma política
 * determinística" em caso de conflito) e corta no tamanho configurado
 * (seção 19: "não retornar uma lista infinita"). Estável para prioridades
 * iguais (mantém a ordem de geração), então o resultado é 100%
 * reproduzível para a mesma entrada.
 */
export function buildStudyPlan(
  candidates: NextStudyAction[],
  maxSize: number = DEFAULT_STUDY_PLAN_SIZE,
): NextStudyAction[] {
  return [...candidates].sort((a, b) => b.priority - a.priority).slice(0, Math.max(0, maxSize));
}

/** O candidato de maior prioridade, ou `null` se não houver nenhum (seção 5: "próxima ação única"). */
export function pickTopAction(candidates: NextStudyAction[]): NextStudyAction | null {
  if (candidates.length === 0) return null;
  return buildStudyPlan(candidates, 1)[0];
}
