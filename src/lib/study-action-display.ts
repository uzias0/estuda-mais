/**
 * Resolve nomes legíveis (título/subtítulo) para uma `NextStudyAction`
 * (Módulo 11) — pequena função de integração que faltava (seção 1.6 do
 * prompt: "se faltar uma pequena função de integração necessária para a
 * UI, crie apenas o mínimo indispensável e documente"). O Módulo 10 só
 * devolve IDs (`lessonId`/`conceptId`/...) — de propósito, para não copiar
 * dado de outro domínio; esta função só faz o lookup de exibição,
 * reaproveitando os `getX` já existentes, nunca decide nada de negócio.
 */
import { getLesson } from "@/modules/pedagogy/server/services/lesson.service";
import { getConcept } from "@/modules/knowledge/server/services/concept.service";
import { getDiscipline } from "@/modules/knowledge/server/services/discipline.service";
import { getLibraryItem } from "@/modules/curation/server/services/library.service";
import { getCurrentAffair } from "@/modules/curation/server/services/current-affairs.service";
import type { NextStudyAction } from "@/modules/study-engine/types/next-study-action";

export interface StudyActionDisplay {
  title: string;
  subtitle: string | null;
}

export async function resolveStudyActionDisplay(
  action: NextStudyAction,
): Promise<StudyActionDisplay> {
  switch (action.type) {
    case "START_DIAGNOSTIC":
      return { title: "Diagnóstico inicial", subtitle: null };

    case "LESSON": {
      const lesson = action.lessonId ? await getLesson(action.lessonId) : null;
      return { title: lesson?.title ?? "Próxima lição", subtitle: null };
    }

    case "REVIEW": {
      const concept = action.conceptId ? await getConcept(action.conceptId) : null;
      return { title: concept?.name ?? "Revisão pendente", subtitle: null };
    }

    case "QUESTION": {
      const concept = action.conceptId ? await getConcept(action.conceptId) : null;
      const count = (action.metadata?.sampleSize as number | undefined) ?? undefined;
      return {
        title: concept?.name ? `Questões sobre ${concept.name}` : "Questões recentes",
        subtitle: count ? `${count} questão(ões) disponível(is)` : null,
      };
    }

    case "SIMULATION": {
      const discipline = action.disciplineId ? await getDiscipline(action.disciplineId) : null;
      return {
        title: discipline?.name ? `Simulado de ${discipline.name}` : "Simulado recomendado",
        subtitle: null,
      };
    }

    case "LIBRARY": {
      const item = action.libraryItemId ? await getLibraryItem(action.libraryItemId) : null;
      return { title: item?.title ?? "Material recomendado", subtitle: item?.authorName ?? null };
    }

    case "CURRENT_AFFAIR": {
      const affair = action.currentAffairId ? await getCurrentAffair(action.currentAffairId) : null;
      return { title: affair?.title ?? "Atualidade relacionada", subtitle: null };
    }
  }
}
