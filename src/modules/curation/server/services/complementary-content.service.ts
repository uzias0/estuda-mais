/**
 * Ponte diagnóstico → conteúdo complementar (Módulo 7, seção 17/40):
 *
 *   diagnóstico → conceito fraco → livros gratuitos → materiais acadêmicos
 *   → atualidades → questões recentes → revisão/simulado
 *
 * NÃO recria o diagnóstico (Módulo 3) nem decide "o que é fraco" de novo —
 * recebe um `conceptId` (já identificado por
 * `diagnostic.service.getDiagnosticResult`, ou por qualquer outro chamador)
 * e só agrega o que já existe: biblioteca, atualidades e questões recentes
 * relacionadas a esse conceito. Nenhuma IA — três consultas determinísticas
 * em paralelo.
 */
import { listLibraryByConcept } from "./library-query.service";
import { getCurrentAffairsByConcept } from "./current-affairs-query.service";
import { getQuestionsByConcept } from "./recent-content.service";

export interface ComplementaryContentOptions {
  take?: number;
}

export async function getComplementaryContentForConcept(
  conceptId: string,
  options: ComplementaryContentOptions = {},
) {
  const take = options.take ?? 10;
  const [libraryItems, currentAffairs, recentQuestions] = await Promise.all([
    listLibraryByConcept(conceptId, { take }),
    getCurrentAffairsByConcept(conceptId, { take }),
    getQuestionsByConcept(conceptId, { take }),
  ]);
  return { conceptId, libraryItems, currentAffairs, recentQuestions };
}
