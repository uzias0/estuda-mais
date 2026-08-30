/**
 * Configuração central do motor de estudo (Módulo 10, seção 4/19: "nenhum
 * número mágico espalhado pelo código"). Toda política de prioridade/
 * tamanho de plano muda só aqui.
 *
 * HIERARQUIA DE DECISÃO (seção 4 e 21 do prompt do módulo — os dois
 * conjuntos de regras foram reconciliados aqui, ver docs/MODULO-10.md,
 * "Decisões técnicas"): a seção 21 dá a ordem final e compacta
 * (`DIAGNOSTIC > REVIEW_OVERDUE > WEAK_CONCEPT > LESSON > QUESTION >
 * SIMULATION > COMPLEMENTARY`); a seção 4 detalha o mesmo, separando
 * "conceito fraco" (não é um TIPO de ação — dos 6 tipos representáveis do
 * prompt, seção 3 — é um CRITÉRIO usado para escolher/justificar qual
 * lição/questão/conteúdo complementar recomendar) e desdobrando
 * "complementar" em atualidade (mais prioritária) e livro gratuito. O
 * resultado abaixo é uma única escada de pesos, sem ambiguidade.
 */

/** Tamanho padrão do plano de estudo (seção 19) — configurável, nunca uma lista infinita. */
export const DEFAULT_STUDY_PLAN_SIZE = 5;

/**
 * Pesos de prioridade por tipo de ação — quanto maior, mais prioritário.
 * `WEAK_CONCEPT` não é um tipo de `NextStudyAction` (seção 3 só lista
 * LESSON/REVIEW/QUESTION/SIMULATION/LIBRARY/CURRENT_AFFAIR, mais
 * `START_DIAGNOSTIC` pedido explicitamente na seção 5) — existe aqui só
 * para deixar registrado, no mesmo lugar, o degrau exato em que a detecção
 * de conceito fraco se encaixa entre revisão vencida e lição.
 */
export const STUDY_ACTION_PRIORITY = {
  START_DIAGNOSTIC: 1000,
  REVIEW_OVERDUE: 900,
  WEAK_CONCEPT: 800, // não é um tipo de ação — ver nota acima.
  LESSON: 700,
  QUESTION_RECENT: 600,
  SIMULATION: 500,
  CURRENT_AFFAIR: 420,
  LIBRARY: 400,
} as const;

/** Amostra mínima de questões respondidas sobre um conceito para considerá-lo (seção 8: "não criar outro limiar" — reaproveita o mesmo corte já usado por `getStudyRecommendation`, Módulo 6, para o mesmo problema). */
export { MIN_SAMPLE_SIZE_FOR_RECOMMENDATION } from "@/config/simulation";

/** Quantas questões recentes agregar por candidato de tipo QUESTION (seção 10/11). */
export const RECENT_QUESTIONS_SAMPLE_SIZE = 5;

/** Quantos itens de revisão vencida entram no plano, no máximo, antes de dar espaço a outros tipos. */
export const MAX_REVIEW_OVERDUE_ITEMS_IN_PLAN = 2;
