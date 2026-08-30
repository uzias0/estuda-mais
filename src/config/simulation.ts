/**
 * Configuração central dos simulados (Módulo 6) — mesma convenção de
 * `config/diagnostic.ts`/`config/review.ts`: nenhum serviço lê um número
 * mágico diretamente.
 *
 * Classificação de desempenho (seção 18 do prompt): NÃO cria uma política
 * nova — reaproveita integralmente `MASTERY_BANDS`/`percentageToMasteryLevel`
 * (Módulo 3, já usadas pelo diagnóstico) e `WEAK_CONCEPT_THRESHOLD`/
 * `STRONG_CONCEPT_THRESHOLD` (idem). As faixas 0–20/21–40/41–60/61–80/81–100
 * já existiam; este módulo só adiciona rótulos em prosa equivalentes aos já
 * usados no prompt ("muito fraco".."excelente"), sem redefinir limites.
 */
import { percentageToMasteryLevel, type MasteryLevel } from "@/config/diagnostic";

export const MIN_QUESTIONS_PER_SIMULATION = 1;
/** Limite máximo de questões por simulado (seção 38 — "valor razoável definido/documentado"). */
export const MAX_QUESTIONS_PER_SIMULATION = 100;

export const DEFAULT_SIMULATION_LIST_TAKE = 50;
export const MAX_SIMULATION_LIST_TAKE = 100;

/** Seed padrão do embaralhamento determinístico (`deterministicShuffle.ts`) quando o chamador não informa uma. */
export const DEFAULT_SHUFFLE_SEED = 0;

/**
 * Rótulo em prosa (seção 18) para o mesmo `MasteryLevel` do Módulo 3 — não é
 * uma segunda classificação, só um texto de exibição para o mesmo valor.
 */
const PERFORMANCE_LABEL_BY_MASTERY_LEVEL: Record<MasteryLevel, string> = {
  INICIANTE: "muito fraco",
  BASICO: "fraco",
  INTERMEDIARIO: "básico",
  AVANCADO: "bom",
  DOMINIO: "excelente",
};

export function classifyPerformance(percentage: number): { level: MasteryLevel; label: string } {
  const level = percentageToMasteryLevel(percentage);
  return { level, label: PERFORMANCE_LABEL_BY_MASTERY_LEVEL[level] };
}

/**
 * Variação mínima (pontos percentuais) entre o primeiro e o último
 * resultado para considerar a tendência "melhorando"/"piorando" em vez de
 * "estável" (seção 17) — evita que uma flutuação de 0,5% vire uma tendência.
 */
export const EVOLUTION_TREND_EPSILON = 1;

/**
 * Lacunas de conceito (seção 19) — reaproveita as MESMAS faixas do Módulo 3
 * (`MASTERY_BANDS`), sem nova política: "crítica" é a faixa mais baixa
 * (INICIANTE, 0–20%), "moderada" é a faixa seguinte (BASICO, 21–40% — o
 * mesmo corte de `WEAK_CONCEPT_THRESHOLD`), "ponto forte" é
 * `STRONG_CONCEPT_THRESHOLD` (>=61%, já usado pelo diagnóstico).
 */
export const CRITICAL_GAP_MAX_PERCENTAGE = 20;

/** Recomendação de próximo simulado (seção 23) — quantidade padrão e a divisão foco/relacionados do exemplo do prompt. */
export const NEXT_SIMULATION_DEFAULT_COUNT = 20;
export const NEXT_SIMULATION_PRIMARY_SHARE = 0.7;
export const NEXT_SIMULATION_SECONDARY_SHARE = 0.3;
/** Amostra mínima de questões respondidas para uma disciplina/conceito entrar na recomendação (evita opinar com 1 questão). */
export const MIN_SAMPLE_SIZE_FOR_RECOMMENDATION = 3;
