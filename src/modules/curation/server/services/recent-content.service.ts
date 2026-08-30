/**
 * Questões recentes (Módulo 7, seção 15/16/25) — NÃO duplica `Question` nem
 * a lógica de filtros: reaproveita `listQuestions` (Módulo 3, estendida no
 * Módulo 6 com `examBoardId`/`organizationId`/`positionId`/`yearFrom`/
 * `yearTo`/`tagIds`) integralmente. Estas são funções finas, só para dar aos
 * consumidores deste módulo (biblioteca/atualidades/diagnóstico) nomes
 * coerentes com o vocabulário do prompt, sem reimplementar nada.
 */
import { PublicationStatus } from "@/generated/prisma/enums";
import {
  listQuestions,
  type QuestionFilters,
} from "@/modules/assessment/server/services/questionQuery.service";

/** "Quais questões mais recentes existem sobre este assunto?" (seção 15) — sempre publicadas, ordenadas por atualidade (já é o padrão de `listQuestions`). */
export function getRecentQuestions(filters: Omit<QuestionFilters, "reviewStatus"> = {}) {
  return listQuestions({ ...filters, reviewStatus: PublicationStatus.PUBLISHED });
}

export function getQuestionsByConcept(
  conceptId: string,
  filters: Omit<QuestionFilters, "reviewStatus" | "conceptId"> = {},
) {
  return listQuestions({ ...filters, conceptId, reviewStatus: PublicationStatus.PUBLISHED });
}

export function getQuestionsByExam(
  examEditionId: string,
  filters: Omit<QuestionFilters, "reviewStatus" | "examEditionId"> = {},
) {
  return listQuestions({ ...filters, examEditionId, reviewStatus: PublicationStatus.PUBLISHED });
}
