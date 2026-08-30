/**
 * Regras PURAS de progresso de lição (Módulo 8, seções 7/8/16/17/18) — sem
 * Prisma, sem I/O, facilmente testáveis sem banco (seção 50 do prompt do
 * módulo). Quem chama (`lesson-execution.service.ts`) busca os dados reais
 * e só entrega objetos já prontos para estas funções decidirem.
 *
 * O cliente nunca informa `status`/`completed`/`mastered`/`progress` — tudo
 * aqui é recalculado a partir de `LessonBlockCompletion` já persistidos
 * (seção 7: "não permitir que o cliente envie diretamente... como verdade").
 */
import { LessonProgressStatus } from "@/generated/prisma/enums";
import { LESSON_MASTERY_THRESHOLD } from "@/config/lesson";

type LessonProgressStatusValue = (typeof LessonProgressStatus)[keyof typeof LessonProgressStatus];

export interface LessonBlockOrder {
  id: string;
  order: number;
}

export interface LessonMasteryCounters {
  totalActivities: number;
  correctActivities: number;
}

/** Percentual de acerto (0–100) das atividades avaliativas já respondidas, ou `null` se não houver nenhuma. */
export function deriveLessonAccuracy(counters: LessonMasteryCounters): number | null {
  if (counters.totalActivities === 0) return null;
  return Math.round((counters.correctActivities / counters.totalActivities) * 10000) / 100;
}

/**
 * Deriva o status determinístico da lição (seção 7): NOT_STARTED enquanto
 * nada foi concluído; IN_PROGRESS enquanto restarem blocos; COMPLETED quando
 * todos os blocos foram concluídos; MASTERED só quando, além de COMPLETED,
 * existir evidência de desempenho (>=1 atividade avaliativa respondida) E o
 * aproveitamento atingir `LESSON_MASTERY_THRESHOLD` (seção 18) — uma lição
 * sem nenhuma atividade avaliativa nunca alcança MASTERED por decreto, só
 * COMPLETED (não há evidência de domínio possível de medir).
 */
export function deriveLessonProgressStatus(params: {
  blocksTotal: number;
  blocksCompleted: number;
  counters: LessonMasteryCounters;
}): LessonProgressStatusValue {
  if (params.blocksCompleted <= 0) return LessonProgressStatus.NOT_STARTED;
  if (params.blocksCompleted < params.blocksTotal) return LessonProgressStatus.IN_PROGRESS;

  const accuracy = deriveLessonAccuracy(params.counters);
  if (accuracy !== null && accuracy >= LESSON_MASTERY_THRESHOLD) {
    return LessonProgressStatus.MASTERED;
  }
  return LessonProgressStatus.COMPLETED;
}

export interface LessonProgressSummary {
  status: LessonProgressStatusValue;
  blocksTotal: number;
  blocksCompleted: number;
  /** Percentual de blocos concluídos (0–100), não confundir com `accuracy`. */
  percentage: number;
  /** Próximo bloco pendente, na ordem da lição — `null` quando não há nenhum (lição concluída). */
  currentBlock: LessonBlockOrder | null;
  /** Aproveitamento das atividades avaliativas (0–100), ou `null` se a lição não tiver nenhuma. */
  accuracy: number | null;
  totalActivities: number;
  correctActivities: number;
}

/**
 * Monta o resumo de progresso de uma lição (seção 8: "blocksCompleted,
 * blocksTotal, percentage, currentBlock") a partir dos blocos ordenados da
 * lição e do conjunto de ids de blocos já concluídos por este usuário —
 * "retomar de onde parou" (seção 15) é simplesmente o primeiro bloco, na
 * ordem, que ainda não está em `completedBlockIds`.
 */
export function computeLessonProgressSummary(params: {
  blocks: LessonBlockOrder[];
  completedBlockIds: ReadonlySet<string>;
  counters: LessonMasteryCounters;
}): LessonProgressSummary {
  const sortedBlocks = [...params.blocks].sort((a, b) => a.order - b.order);
  const blocksTotal = sortedBlocks.length;
  const blocksCompleted = sortedBlocks.filter((b) => params.completedBlockIds.has(b.id)).length;
  const currentBlock = sortedBlocks.find((b) => !params.completedBlockIds.has(b.id)) ?? null;

  return {
    status: deriveLessonProgressStatus({ blocksTotal, blocksCompleted, counters: params.counters }),
    blocksTotal,
    blocksCompleted,
    percentage: blocksTotal === 0 ? 0 : Math.round((blocksCompleted / blocksTotal) * 10000) / 100,
    currentBlock,
    accuracy: deriveLessonAccuracy(params.counters),
    totalActivities: params.counters.totalActivities,
    correctActivities: params.counters.correctActivities,
  };
}
