/**
 * Consultas de questões com filtros tipados (Módulo 3, seção 37) — evita uma
 * função gigante com dezenas de parâmetros soltos sem tipagem.
 *
 * Nota sobre "recentes" (seção 38): para questões de prova, a referência de
 * atualidade é `ExamEdition.year`, nunca uma data de cadastro — uma questão
 * inserida hoje pode ser de uma prova de 2018. `Question` não possui
 * `createdAt` (não foi adicionado neste módulo por não ser indispensável —
 * ver docs/MODULO-3.md, "Limitações"): questões autorais (sem
 * `examEditionId`) não têm hoje um sinal de atualidade comparável.
 *
 * `examBoardId`/`organizationId`/`positionId`/`yearFrom`/`yearTo` adicionados
 * no Módulo 6 (docs/MODULO-6.md, "Decisões técnicas") — o sistema de
 * simulados precisa filtrar questões por banca/órgão/cargo e por faixa de
 * anos ("últimos 5 anos" etc.), e esses três já são dimensões de
 * `ExamEdition` desde o Módulo 3 (`examBoardId`/`organizationId`/
 * `positionId`) — só não existia o filtro correspondente aqui. A ordenação
 * por atualidade (`orderBy examEdition.year desc`) já era o padrão desde o
 * Módulo 3 e continua determinística.
 */
import { prisma } from "@/server/db";
import { KnowledgeEntityType, PublicationStatus } from "@/generated/prisma/enums";
import type { Difficulty, QuestionType } from "@/generated/prisma/enums";
import type { Question, QuestionOption } from "@/generated/prisma/client";

type DifficultyValue = (typeof Difficulty)[keyof typeof Difficulty];
type QuestionTypeValue = (typeof QuestionType)[keyof typeof QuestionType];
type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];
type KnowledgeEntityTypeValue = (typeof KnowledgeEntityType)[keyof typeof KnowledgeEntityType];

export interface QuestionFilters {
  difficulty?: DifficultyValue;
  type?: QuestionTypeValue;
  reviewStatus?: PublicationStatusValue;
  conceptId?: string;
  schoolId?: string;
  theoryId?: string;
  disciplineId?: string;
  personId?: string;
  examEditionId?: string;
  examBoardId?: string;
  organizationId?: string;
  positionId?: string;
  /** Ano exato da prova de origem — via `ExamEdition.year`, nunca `createdAt` (seção 38). */
  year?: number;
  /** Faixa de anos (ex.: "últimos 5 anos") — ignorada se `year` (exato) for informado. */
  yearFrom?: number;
  yearTo?: number;
  /** `Tag` (rótulo transversal, Módulo 2) — adicionado no Módulo 6 para os filtros de simulado (seção 6.1). */
  tagIds?: string[];
  /** Só publicadas, com >= 1 conhecimento associado — o mesmo critério do diagnóstico (seção 29). */
  availableForDiagnostic?: boolean;
  take?: number;
  skip?: number;
}

const KNOWLEDGE_FILTER_KEYS = [
  "conceptId",
  "schoolId",
  "theoryId",
  "disciplineId",
  "personId",
] as const;
const KNOWLEDGE_ENTITY_TYPE_BY_FILTER_KEY: Record<
  (typeof KNOWLEDGE_FILTER_KEYS)[number],
  KnowledgeEntityTypeValue
> = {
  conceptId: KnowledgeEntityType.CONCEPT,
  schoolId: KnowledgeEntityType.SCHOOL,
  theoryId: KnowledgeEntityType.THEORY,
  disciplineId: KnowledgeEntityType.DISCIPLINE,
  personId: KnowledgeEntityType.PERSON,
};

export async function listQuestions(filters: QuestionFilters = {}) {
  const knowledgeTagFilters = KNOWLEDGE_FILTER_KEYS.filter((key) => filters[key]).map((key) => ({
    entityType: KNOWLEDGE_ENTITY_TYPE_BY_FILTER_KEY[key],
    entityId: filters[key] as string,
  }));

  const yearFilter = filters.year
    ? filters.year
    : filters.yearFrom || filters.yearTo
      ? { gte: filters.yearFrom, lte: filters.yearTo }
      : undefined;
  const hasExamEditionFilter =
    !!filters.examBoardId || !!filters.organizationId || !!filters.positionId || !!yearFilter;

  return prisma.question.findMany({
    where: {
      difficulty: filters.difficulty,
      type: filters.type,
      reviewStatus: filters.availableForDiagnostic
        ? PublicationStatus.PUBLISHED
        : filters.reviewStatus,
      examEditionId: filters.examEditionId,
      examEdition: hasExamEditionFilter
        ? {
            year: yearFilter,
            examBoardId: filters.examBoardId,
            organizationId: filters.organizationId,
            positionId: filters.positionId,
          }
        : undefined,
      knowledgeTags: filters.availableForDiagnostic
        ? { some: {} }
        : knowledgeTagFilters.length
          ? { some: { OR: knowledgeTagFilters } }
          : undefined,
      tags: filters.tagIds?.length ? { some: { id: { in: filters.tagIds } } } : undefined,
    },
    include: { options: true, knowledgeTags: true, examEdition: true, source: true },
    orderBy: [{ examEdition: { year: "desc" } }, { id: "desc" }],
    take: filters.take ?? 50,
    skip: filters.skip ?? 0,
  });
}

/**
 * Visão pública de uma `Question` — NUNCA inclui `isCorrect`/`answerKey`/
 * gabarito (regra absoluta desde o Módulo 3, reforçada nos Módulos 5/6).
 * Extraída no Módulo 6 a partir de duas cópias idênticas que viviam em
 * `diagnostic.service.ts` (Módulo 3) e `reviewSession.service.ts` (Módulo 5)
 * — um terceiro consumidor (`simulation`) tornaria a duplicata insustentável;
 * `Question` pertence a este módulo, então a visão pública dela também.
 */
export function toPublicQuestionView(question: Question & { options: QuestionOption[] }) {
  return {
    id: question.id,
    prompt: question.prompt,
    type: question.type,
    difficulty: question.difficulty,
    options: question.options
      .map((o) => ({ id: o.id, text: o.text, order: o.order }))
      .sort((a, b) => a.order - b.order),
  };
}
