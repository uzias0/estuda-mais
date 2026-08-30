/**
 * "Para onde este `NextStudyAction` deve levar?" (Módulo 11) — função PURA
 * (sem I/O): só decide a rota, nunca recalcula prioridade/motivo/conteúdo
 * (esses já vêm prontos do Módulo 10). Cada rota abaixo existe de verdade
 * neste módulo (seção 43).
 */
import type { NextStudyAction } from "@/modules/study-engine/types/next-study-action";

export function resolveStudyActionHref(action: NextStudyAction): string {
  switch (action.type) {
    case "START_DIAGNOSTIC":
      return "/dashboard/diagnostico";
    case "LESSON":
      return action.lessonId ? `/dashboard/licoes/${action.lessonId}` : "/dashboard/estudar";
    case "REVIEW":
      return "/dashboard/revisao";
    case "QUESTION":
      return action.conceptId
        ? `/dashboard/questoes?conceptId=${action.conceptId}`
        : "/dashboard/questoes";
    case "SIMULATION":
      return "/dashboard/simulados";
    case "LIBRARY":
      return action.libraryItemId
        ? `/dashboard/biblioteca/${action.libraryItemId}`
        : "/dashboard/biblioteca";
    case "CURRENT_AFFAIR":
      return action.currentAffairId
        ? `/dashboard/atualidades/${action.currentAffairId}`
        : "/dashboard/atualidades";
  }
}

export function studyActionButtonLabel(action: NextStudyAction): string {
  switch (action.type) {
    case "START_DIAGNOSTIC":
      return "Começar diagnóstico";
    case "LESSON":
      return "Continuar estudando";
    case "REVIEW":
      return "Revisar agora";
    case "QUESTION":
      return "Resolver questões";
    case "SIMULATION":
      return "Ver simulado";
    case "LIBRARY":
      return "Ler material";
    case "CURRENT_AFFAIR":
      return "Ler atualidade";
  }
}
