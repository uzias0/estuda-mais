/**
 * Configuração central da execução de lição (Módulo 8, seção 18: "não
 * espalhar o número mágico pelo código"). Qualquer ajuste do limiar de
 * domínio (mastery) muda aqui — nenhum serviço lê um número solto.
 */

/**
 * Percentual mínimo de aproveitamento em atividades avaliativas (blocos
 * QUESTION) para que uma Lesson já COMPLETED alcance MASTERED. Mesma escala
 * 0–100 das faixas de domínio do diagnóstico (`@/config/diagnostic`), mas é
 * uma constante deliberadamente separada: mede desempenho DENTRO de uma
 * lição específica, não o nível geral do aluno.
 */
export const LESSON_MASTERY_THRESHOLD = 80;
