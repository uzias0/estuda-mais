/**
 * Configuração central do diagnóstico inicial (Módulo 3, seção 24: "não
 * espalhar 20 pelo código"). Qualquer ajuste de tamanho/distribuição da mini
 * prova, ou das faixas de domínio usadas para estimar nível/lacunas, muda
 * aqui — nenhum serviço lê um número mágico diretamente.
 */

/** Quantidade padrão de questões da mini prova diagnóstica. */
export const DIAGNOSTIC_QUESTION_COUNT = 20;

/**
 * Distribuição-alvo por dificuldade (soma = 1). Aplicada sobre
 * `DIAGNOSTIC_QUESTION_COUNT` para calcular quantas questões de cada nível
 * buscar — o objetivo é descobrir o ponto de partida, não reprovar o aluno,
 * por isso o peso maior fica em BASICO/INTERMEDIARIO.
 */
export const DIAGNOSTIC_DIFFICULTY_WEIGHTS: Record<string, number> = {
  INICIANTE: 0.2,
  BASICO: 0.3,
  INTERMEDIARIO: 0.3,
  AVANCADO: 0.15,
  DOMINIO: 0.05,
};

/**
 * Teto de questões por conceito na mesma mini prova — evita que um único
 * assunto domine a amostra (Módulo 3, seção 25/30: "diversidade de conceitos").
 */
export const DIAGNOSTIC_MAX_QUESTIONS_PER_CONCEPT = 2;

/**
 * Faixas de domínio (mesma convenção de docs/ARQUITETURA.md, seção 7):
 * 0–20% iniciante · 21–40% básico · 41–60% intermediário · 61–80% avançado ·
 * 81–100% domínio. Usada tanto para o nível geral do diagnóstico quanto para
 * classificar cada conceito como "forte" ou "fraco".
 */
export const MASTERY_BANDS = [
  { max: 20, level: "INICIANTE" },
  { max: 40, level: "BASICO" },
  { max: 60, level: "INTERMEDIARIO" },
  { max: 80, level: "AVANCADO" },
  { max: 100, level: "DOMINIO" },
] as const;

export type MasteryLevel = (typeof MASTERY_BANDS)[number]["level"];

/** Converte um percentual de acerto (0–100) na faixa de domínio correspondente. */
export function percentageToMasteryLevel(percentage: number): MasteryLevel {
  const clamped = Math.max(0, Math.min(100, percentage));
  const band = MASTERY_BANDS.find((b) => clamped <= b.max);
  return (band ?? MASTERY_BANDS[MASTERY_BANDS.length - 1]).level;
}

/** Percentual de acerto por conceito abaixo do qual ele é considerado uma lacuna ("fraco"). */
export const WEAK_CONCEPT_THRESHOLD = 40;
/** Percentual de acerto por conceito a partir do qual ele é considerado uma força ("forte"). */
export const STRONG_CONCEPT_THRESHOLD = 61;
