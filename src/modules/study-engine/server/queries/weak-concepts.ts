/**
 * Conceitos fracos "atuais" do aluno (Módulo 10, seção 8) — reaproveita
 * INTEGRALMENTE `computePerformance` (Módulo 3, sobre TODAS as tentativas
 * do usuário, não só as do diagnóstico) e o MESMO limiar
 * `WEAK_CONCEPT_THRESHOLD` (Módulo 3) — nenhum cálculo novo, nenhum limiar
 * novo (seção 8: "não criar outro limiar. Não criar outro cálculo"). O
 * diagnóstico (`getDiagnosticResult`) continua sendo a autoridade sobre o
 * PONTO DE PARTIDA (seção 11); esta consulta serve para identificar
 * conceitos fracos DEPOIS do ponto de partida, conforme o aluno acumula
 * tentativas em lições/revisões/simulados.
 */
import { computePerformance } from "@/modules/assessment/server/services/performance.service";
import { WEAK_CONCEPT_THRESHOLD } from "@/config/diagnostic";
import { MIN_SAMPLE_SIZE_FOR_RECOMMENDATION } from "@/config/study-engine";

export interface WeakConceptEntry {
  conceptId: string;
  accuracyPercentage: number;
  totalAnswered: number;
}

/**
 * Conceitos com `accuracyPercentage <= WEAK_CONCEPT_THRESHOLD`, exigindo
 * amostra mínima (`MIN_SAMPLE_SIZE_FOR_RECOMMENDATION`, reaproveitado do
 * Módulo 6 — o mesmo problema de "não julgar um conceito por 1 questão"),
 * ordenados do pior para o melhor desempenho.
 */
export async function getCurrentWeakConcepts(userId: string): Promise<WeakConceptEntry[]> {
  const performance = await computePerformance(userId);

  return Object.entries(performance.byConcept)
    .filter(([, summary]) => summary.total >= MIN_SAMPLE_SIZE_FOR_RECOMMENDATION)
    .filter(([, summary]) => summary.accuracyPercentage <= WEAK_CONCEPT_THRESHOLD)
    .map(([conceptId, summary]) => ({
      conceptId,
      accuracyPercentage: summary.accuracyPercentage,
      totalAnswered: summary.total,
    }))
    .sort((a, b) => a.accuracyPercentage - b.accuracyPercentage);
}
