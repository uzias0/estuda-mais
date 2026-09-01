/**
 * Missões semanais (pedido do usuário, prioridade confirmada logo depois
 * de vidas/joias: "missões semanais" → ranking → mais conteúdo). Mesmo
 * padrão de `gamification.ts`/`hearts.ts`: nenhum número mágico
 * espalhado pelo código, toda política muda só aqui.
 *
 * Decisão de arquitetura (documentada em docs/FASE-MISSOES-RANKING.md):
 * este projeto NÃO tem infraestrutura de cron/job em segundo plano (mesmo
 * motivo já registrado para bateria/meta diária) — não existe um processo
 * que "sorteie as missões da semana" toda segunda-feira. Em vez disso, o
 * catálogo abaixo é FIXO e a seleção de quais 3 estão ativas em cada
 * semana é uma função PURA e determinística do próprio `weekKey`
 * (`selectActiveMissions`, `weekly-missions.service.ts`) — sempre a
 * mesma seleção para todo mundo, sem precisar persistir nada além do
 * próprio progresso (que já vem 100% derivado do ledger de eventos).
 */

export const MISSION_TYPES = {
  LESSONS_COMPLETED_WEEK: "LESSONS_COMPLETED_WEEK",
  QUESTIONS_CORRECT_WEEK: "QUESTIONS_CORRECT_WEEK",
  XP_EARNED_WEEK: "XP_EARNED_WEEK",
  DAYS_STUDIED_WEEK: "DAYS_STUDIED_WEEK",
} as const;
export type MissionType = (typeof MISSION_TYPES)[keyof typeof MISSION_TYPES];

export interface MissionTemplate {
  /** Estável para sempre — vira parte da chave de idempotência da recompensa; nunca reordenar/remover um id já publicado. */
  id: string;
  type: MissionType;
  title: string;
  count: number;
  xpReward: number;
  gemReward: number;
}

export const MISSION_CATALOG: MissionTemplate[] = [
  {
    id: "lessons-3",
    type: "LESSONS_COMPLETED_WEEK",
    title: "Complete 3 lições",
    count: 3,
    xpReward: 30,
    gemReward: 15,
  },
  {
    id: "lessons-5",
    type: "LESSONS_COMPLETED_WEEK",
    title: "Complete 5 lições",
    count: 5,
    xpReward: 50,
    gemReward: 25,
  },
  {
    id: "correct-20",
    type: "QUESTIONS_CORRECT_WEEK",
    title: "Acerte 20 questões",
    count: 20,
    xpReward: 40,
    gemReward: 20,
  },
  {
    id: "correct-40",
    type: "QUESTIONS_CORRECT_WEEK",
    title: "Acerte 40 questões",
    count: 40,
    xpReward: 70,
    gemReward: 35,
  },
  {
    id: "xp-100",
    type: "XP_EARNED_WEEK",
    title: "Ganhe 100 XP",
    count: 100,
    xpReward: 20,
    gemReward: 10,
  },
  {
    id: "xp-250",
    type: "XP_EARNED_WEEK",
    title: "Ganhe 250 XP",
    count: 250,
    xpReward: 40,
    gemReward: 20,
  },
  {
    id: "days-3",
    type: "DAYS_STUDIED_WEEK",
    title: "Estude em 3 dias diferentes",
    count: 3,
    xpReward: 30,
    gemReward: 15,
  },
  {
    id: "days-5",
    type: "DAYS_STUDIED_WEEK",
    title: "Estude em 5 dias diferentes",
    count: 5,
    xpReward: 60,
    gemReward: 30,
  },
];

/** Quantas missões ficam ativas por semana (das `MISSION_CATALOG.length` disponíveis). */
export const ACTIVE_MISSIONS_PER_WEEK = 3;
