/**
 * Cálculo de prioridade de revisão (Módulo 5, seção 11) — `priority(reviewItem,
 * now) -> number`, pura e testável, sem IA. `overdueDayWeight` domina a soma
 * por design (ver `config/review.ts`), de forma que ordenar a fila
 * simplesmente por este score, decrescente, já produz "vencidos primeiro,
 * mais atrasados depois, maior prioridade e maior necessidade pedagógica
 * desempatando o resto" (seção 12) num único critério, sem comparação
 * multi-chave frágil.
 */
import { PRIORITY_WEIGHTS, DIFFICULTY_URGENCY_RANK } from "@/config/review";

type DifficultyValue = keyof typeof DIFFICULTY_URGENCY_RANK;

const MAX_DIFFICULTY_RANK = Math.max(...Object.values(DIFFICULTY_URGENCY_RANK));

export interface ReviewPriorityInput {
  dueAt: Date;
  /** `null` se o item nunca foi revisado — recência é medida a partir de `createdAt` nesse caso. */
  lastReviewedAt: Date | null;
  createdAt: Date;
  difficulty: DifficultyValue | null;
  /** Taxa de erro (0–1) do item/conceito, derivada do histórico real (`reviewContext.ts`) — nunca inventada. */
  errorRate: number;
  /** `true` se o conceito deste item é uma lacuna diagnóstica (Módulo 3 — `WEAK_CONCEPT_THRESHOLD`). */
  isWeakConcept: boolean;
}

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000);
}

/** Score de prioridade — quanto maior, mais urgente revisar. Determinístico, sem aleatoriedade/IA. */
export function computeReviewPriority(input: ReviewPriorityInput, now: Date): number {
  const overdueDays = daysBetween(now, input.dueAt);
  const overdueScore =
    overdueDays >= 0
      ? overdueDays * PRIORITY_WEIGHTS.overdueDayWeight
      : overdueDays * PRIORITY_WEIGHTS.notYetDueDayPenalty; // overdueDays negativo aqui => reduz o score

  const errorScore = Math.max(0, Math.min(1, input.errorRate)) * PRIORITY_WEIGHTS.errorRateWeight;

  const difficultyRank = input.difficulty ? DIFFICULTY_URGENCY_RANK[input.difficulty] : 0;
  const difficultyScore =
    (difficultyRank / MAX_DIFFICULTY_RANK) * PRIORITY_WEIGHTS.difficultyWeight;

  const lastTouched = input.lastReviewedAt ?? input.createdAt;
  const recencyDays = Math.max(0, daysBetween(now, lastTouched));
  const recencyScore = recencyDays * PRIORITY_WEIGHTS.recencyDayWeight;

  const weakConceptScore = input.isWeakConcept ? PRIORITY_WEIGHTS.weakConceptBonus : 0;

  return overdueScore + errorScore + difficultyScore + recencyScore + weakConceptScore;
}

/**
 * Justificativa textual determinística (seção 24 — "toda recomendação deve
 * poder ser justificada pelos dados existentes"). Nenhuma geração de
 * linguagem natural livre/IA — apenas interpolação de números já calculados.
 */
export function explainReviewPriority(input: ReviewPriorityInput, now: Date): string {
  const overdueDays = Math.round(daysBetween(now, input.dueAt));
  const errorPercentage = Math.round(Math.max(0, Math.min(1, input.errorRate)) * 100);

  const parts: string[] = [];
  if (overdueDays > 0) {
    parts.push(`vencido há ${overdueDays} dia(s)`);
  } else if (overdueDays === 0) {
    parts.push("vence hoje");
  } else {
    parts.push(`ainda não vencido (faltam ${Math.abs(overdueDays)} dia(s))`);
  }
  parts.push(`${errorPercentage}% de erro no histórico deste item`);
  if (input.isWeakConcept) parts.push("conceito identificado como lacuna no diagnóstico");
  if (input.difficulty) parts.push(`dificuldade ${input.difficulty}`);

  return parts.join("; ") + ".";
}
