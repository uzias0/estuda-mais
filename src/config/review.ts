/**
 * Configuração central da revisão espaçada (Módulo 5) — mesma convenção de
 * `config/diagnostic.ts` (Módulo 3): nenhum serviço lê um número mágico
 * diretamente, todo ajuste de política muda só aqui.
 *
 * ALGORITMO ESCOLHIDO (documentado por exigência do prompt do módulo, seção
 * 9: "se não houver política estabelecida, documente a escolhida"): não
 * existia nenhuma política de agendamento implementada antes deste módulo —
 * `ReviewItem.easeFactor`/`intervalDays`/`repetitions` existiam só como
 * schema desde o Módulo 1, sem nenhum serviço os calculando. A política
 * adotada é uma variante simples e determinística de SM-2 ("SM-2-lite"),
 * deliberadamente SEM os 6 graus de qualidade (0–5) do SM-2 original — só
 * acerto/erro (binário), que é tudo que `gradeAnswer` (Módulo 3) produz:
 *
 * 1. Acertos consecutivos avançam por uma escada fixa de intervalos
 *    (`REVIEW_INTERVAL_STAIRCASE_DAYS`) — exatamente o exemplo do prompt
 *    (1, 3, 7, 14, 30 dias). Ao esgotar a escada, o intervalo continua
 *    crescendo multiplicando pelo `easeFactor` (mecanismo do SM-2, não o
 *    algoritmo inteiro).
 * 2. Um erro reseta `repetitions` a 0, volta o intervalo a
 *    `MIN_INTERVAL_DAYS`, e penaliza `easeFactor` (dentro de um piso/teto).
 * 3. O intervalo final é ajustado pela dificuldade do conteúdo
 *    (`DIFFICULTY_INTERVAL_MULTIPLIER`) — item difícil volta mais rápido,
 *    item fácil pode ficar mais tempo fora da fila (seção 10 do prompt).
 */
import type { Difficulty, ReviewState } from "@/generated/prisma/enums";

type DifficultyValue = (typeof Difficulty)[keyof typeof Difficulty];
type ReviewStateValue = (typeof ReviewState)[keyof typeof ReviewState];

/** Escada de intervalos (dias) para acertos consecutivos 1–5 — exemplo literal do prompt do Módulo 5, seção 9. */
export const REVIEW_INTERVAL_STAIRCASE_DAYS = [1, 3, 7, 14, 30] as const;

/**
 * A partir de quantas repetições consecutivas corretas um item é considerado
 * `MASTERED` — coincide com o tamanho da escada (a 5ª posição, 30 dias, é o
 * topo da progressão fixa; daí em diante o crescimento é por `easeFactor`).
 */
export const MASTERY_REPETITIONS_THRESHOLD = REVIEW_INTERVAL_STAIRCASE_DAYS.length;

export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 180;

/** Piso/teto/incrementos do `easeFactor` — mesmos valores canônicos do SM-2 (2.5 inicial já era o default do schema desde o Módulo 1). */
export const EASE_FACTOR_MIN = 1.3;
export const EASE_FACTOR_MAX = 3.0;
export const EASE_FACTOR_BONUS_ON_CORRECT = 0.05;
export const EASE_FACTOR_PENALTY_ON_INCORRECT = 0.2;

/**
 * Multiplicador aplicado ao intervalo calculado, conforme a dificuldade do
 * conteúdo (Módulo 5, seção 10). `Difficulty` é reaproveitado integralmente
 * do Módulo 2/3 — nenhum sistema de dificuldade paralelo.
 */
export const DIFFICULTY_INTERVAL_MULTIPLIER: Record<DifficultyValue, number> = {
  INICIANTE: 1.15,
  BASICO: 1.05,
  INTERMEDIARIO: 1.0,
  AVANCADO: 0.85,
  DOMINIO: 0.7,
};

/** Rank numérico (0–4) usado só para ponderar prioridade — não substitui o enum `Difficulty`. */
export const DIFFICULTY_URGENCY_RANK: Record<DifficultyValue, number> = {
  INICIANTE: 0,
  BASICO: 1,
  INTERMEDIARIO: 2,
  AVANCADO: 3,
  DOMINIO: 4,
};

/**
 * Pesos da função de prioridade (Módulo 5, seção 11). `overdueDayWeight` é
 * deliberadamente dominante: um dia de atraso vale mais que o máximo
 * possível de qualquer outro fator isolado, para que "quanto mais atrasado,
 * maior a prioridade" (regra explícita do prompt) nunca seja subvertido por
 * erro/dificuldade/recência — esses fatores só desempatam DENTRO do mesmo
 * nível de atraso. Isso permite usar um único score (`computeReviewPriority`)
 * como critério de ordenação da fila inteira, em vez de uma comparação
 * multi-chave frágil.
 */
export const PRIORITY_WEIGHTS = {
  /** Pontos por dia de atraso (dueAt no passado). Dominante por design. */
  overdueDayWeight: 100,
  /** Penalidade por dia até o vencimento (dueAt no futuro) — empurra itens ainda não vencidos para o fim da fila. */
  notYetDueDayPenalty: 5,
  /** Pontos máximos (taxa de erro 0–1 × este peso) por desempenho ruim no item/conceito. */
  errorRateWeight: 20,
  /** Pontos máximos (rank de dificuldade 0–4, normalizado 0–1, × este peso). */
  difficultyWeight: 8,
  /** Pontos por dia desde a última revisão (ou desde a criação, se nunca revisado) — item "esquecido" ganha um empurrão pequeno. */
  recencyDayWeight: 0.2,
  /** Bônus fixo quando o conceito do item é uma lacuna diagnóstica (seção 16 — reaproveita `WEAK_CONCEPT_THRESHOLD` do Módulo 3). */
  weakConceptBonus: 15,
} as const;

/** Limite diário padrão de itens por sessão/fila de revisão (Módulo 5, seção 13) — configurável por parâmetro, sem tela de configuração ainda. */
export const DEFAULT_DAILY_REVIEW_LIMIT = 20;

/**
 * Vocabulário validado em código para `ReviewLog.origin` (mesmo padrão de
 * `AUDIT_ACTIONS`/`relation-types.ts`) — só um valor por ora, único ponto de
 * entrada deste módulo (`submitReviewAnswer`).
 */
export const REVIEW_LOG_ORIGINS = {
  REVIEW_SESSION: "REVIEW_SESSION",
} as const;
export type ReviewLogOrigin = (typeof REVIEW_LOG_ORIGINS)[keyof typeof REVIEW_LOG_ORIGINS];

/** Estado inicial de todo `ReviewItem` recém-criado (Módulo 5, seção 7). */
export const INITIAL_REVIEW_STATE: ReviewStateValue = "NEW";
