/**
 * Representação determinística de uma próxima ação de estudo (Módulo 10,
 * seção 3). Nenhuma tabela persistida — sempre derivada dos dados
 * existentes no momento da consulta (seção 3: "não criar uma tabela
 * persistida para isso sem necessidade real"). Campos que não se aplicam
 * ao `type` da ação ficam `null` (nunca `undefined`, para o formato ser
 * estável em serialização).
 */

export const NEXT_STUDY_ACTION_TYPES = [
  "START_DIAGNOSTIC",
  "LESSON",
  "REVIEW",
  "QUESTION",
  "SIMULATION",
  "LIBRARY",
  "CURRENT_AFFAIR",
] as const;
export type NextStudyActionType = (typeof NEXT_STUDY_ACTION_TYPES)[number];

export interface NextStudyAction {
  type: NextStudyActionType;
  /** Explicação determinística (seção 20) — nunca gerada por IA/LLM. */
  reason: string;
  /** Maior valor = mais prioritário (`src/config/study-engine.ts`). */
  priority: number;
  conceptId: string | null;
  disciplineId: string | null;
  trackId: string | null;
  areaId: string | null;
  unitId: string | null;
  stageId: string | null;
  lessonId: string | null;
  questionId: string | null;
  simulationId: string | null;
  libraryItemId: string | null;
  currentAffairId: string | null;
  /**
   * Campos extras não exigidos pelo prompt (seção 3 lista o mínimo) — cada
   * candidato pode carregar dados adicionais úteis (ex.: quantidade de
   * questões, reviewItemId) sem violar o formato mínimo garantido acima.
   */
  metadata?: Record<string, unknown>;
}

/** Base com todos os campos de referência já `null` — cada gerador de candidato só sobrescreve o que usa. */
export function emptyActionRefs(): Pick<
  NextStudyAction,
  | "conceptId"
  | "disciplineId"
  | "trackId"
  | "areaId"
  | "unitId"
  | "stageId"
  | "lessonId"
  | "questionId"
  | "simulationId"
  | "libraryItemId"
  | "currentAffairId"
> {
  return {
    conceptId: null,
    disciplineId: null,
    trackId: null,
    areaId: null,
    unitId: null,
    stageId: null,
    lessonId: null,
    questionId: null,
    simulationId: null,
    libraryItemId: null,
    currentAffairId: null,
  };
}
