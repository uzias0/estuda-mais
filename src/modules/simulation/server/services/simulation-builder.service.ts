/**
 * `buildSimulation` — função central de composição de simulados (Módulo 6,
 * seção 7). Suporta os 3 modos da seção 6: PERSONALIZED (filtros livres,
 * reaproveitando `questionQuery.service.listQuestions` do Módulo 3),
 * EXAM_EDITION (prova real cadastrada, Módulo 3), e REVIEW (fila de revisão
 * espaçada, Módulo 5 — só LEITURA, nunca recalcula intervalo/prioridade/
 * estado). Nenhum modo aceita `isCorrect`/gabarito na entrada ou devolve na
 * saída (seção 10).
 *
 * Autorização: nenhuma role específica — qualquer `Actor` autenticado monta
 * um simulado para SI MESMO (`createdByUserId = actor.userId`), coerente com
 * a seção 2 do prompt ("o aluno... faz simulados personalizados"). A
 * curadoria administrativa (montagem manual, publicar, arquivar) é
 * `simulation.service.ts`.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { KnowledgeEntityType, PublicationStatus } from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import {
  listQuestions,
  toPublicQuestionView,
} from "@/modules/assessment/server/services/questionQuery.service";
import { getPedagogicalContextForConcepts } from "@/modules/pedagogy/server/services/pedagogy-query.service";
import { getReviewQueue } from "@/modules/review/server/services/reviewQueue.service";
import { pickQuestionForConcept } from "@/modules/review/server/services/reviewContext";
import { deterministicShuffle } from "./deterministicShuffle";
import { createSimulationRecord } from "./simulation.service";
import { SimulationValidationError } from "./errors";
import { DEFAULT_SHUFFLE_SEED } from "@/config/simulation";
import {
  BuildSimulationInputSchema,
  type BuildSimulationInput,
  type SimulationFilters,
} from "@/modules/simulation/types/simulation.schema";

type CandidateQuestion = Awaited<ReturnType<typeof listQuestions>>[number];

/** Aplica os 3 flags de "já respondida" (seção 9) — sempre a partir de `QuestionAttempt` real, nunca inventado. */
async function applyPreviouslyAnsweredFilters(
  userId: string,
  candidates: CandidateQuestion[],
  filters: Pick<
    SimulationFilters,
    "includePreviouslyAnswered" | "excludePreviouslyCorrect" | "includePreviouslyWrong"
  >,
): Promise<CandidateQuestion[]> {
  if (candidates.length === 0) return candidates;
  const questionIds = candidates.map((q) => q.id);

  if (filters.includePreviouslyAnswered === false) {
    const answered = await prisma.questionAttempt.findMany({
      where: { userId, questionId: { in: questionIds } },
      select: { questionId: true },
    });
    const answeredIds = new Set(answered.map((a) => a.questionId));
    return candidates.filter((q) => !answeredIds.has(q.id));
  }

  let excludeIds = new Set<string>();
  if (filters.excludePreviouslyCorrect) {
    const correct = await prisma.questionAttempt.findMany({
      where: { userId, questionId: { in: questionIds }, isCorrect: true },
      select: { questionId: true },
    });
    excludeIds = new Set(correct.map((a) => a.questionId));
  }
  if (filters.includePreviouslyWrong === false) {
    const wrong = await prisma.questionAttempt.findMany({
      where: { userId, questionId: { in: questionIds }, isCorrect: false },
      select: { questionId: true },
    });
    for (const a of wrong) excludeIds.add(a.questionId);
  }
  return excludeIds.size === 0 ? candidates : candidates.filter((q) => !excludeIds.has(q.id));
}

const PEDAGOGY_FILTER_KEYS = ["trackId", "areaId", "unitId", "stageId", "lessonId"] as const;

/** Filtra candidatas pelo escopo pedagógico (Módulo 4) — só executa a travessia se algum filtro foi de fato pedido. */
async function applyPedagogyScopeFilter(
  candidates: CandidateQuestion[],
  filters: Pick<SimulationFilters, (typeof PEDAGOGY_FILTER_KEYS)[number]>,
): Promise<CandidateQuestion[]> {
  if (!PEDAGOGY_FILTER_KEYS.some((key) => filters[key])) return candidates;

  const kept: CandidateQuestion[] = [];
  for (const question of candidates) {
    const conceptIds = question.knowledgeTags
      .filter((t) => t.entityType === KnowledgeEntityType.CONCEPT)
      .map((t) => t.entityId);
    const context = await getPedagogicalContextForConcepts(conceptIds, question.id);
    const matches = PEDAGOGY_FILTER_KEYS.every((key) => {
      const value = filters[key];
      if (!value) return true;
      const plural = `${key.replace("Id", "")}Ids` as
        "trackIds" | "areaIds" | "unitIds" | "stageIds" | "lessonIds";
      return context[plural].includes(value);
    });
    if (matches) kept.push(question);
  }
  return kept;
}

function assignOrder(questions: CandidateQuestion[]) {
  return questions.map((q) => q.id);
}

async function buildPersonalized(actor: Actor, title: string, filters: SimulationFilters) {
  let candidates = await listQuestions({
    reviewStatus: PublicationStatus.PUBLISHED,
    difficulty: filters.difficulty,
    type: filters.questionType,
    conceptId: filters.conceptId,
    disciplineId: filters.disciplineId,
    examEditionId: filters.examEditionId,
    examBoardId: filters.examBoardId,
    organizationId: filters.organizationId,
    positionId: filters.positionId,
    year: filters.year,
    yearFrom: filters.yearFrom,
    yearTo: filters.yearTo,
    tagIds: filters.tagIds,
    take: 500, // teto de segurança do pool (seção 38/39) — nunca carrega a base inteira
  });

  candidates = await applyPreviouslyAnsweredFilters(actor.userId, candidates, filters);
  candidates = await applyPedagogyScopeFilter(candidates, filters);

  if (candidates.length === 0) {
    throw new SimulationValidationError(
      "Nenhuma questão elegível encontrada para os filtros informados.",
    );
  }

  const seed = filters.seed ?? DEFAULT_SHUFFLE_SEED;
  const selected = deterministicShuffle(candidates, seed).slice(0, filters.count);

  const simulation = await createSimulationRecord({
    title,
    config: { kind: "PERSONALIZED", filters, seed },
    createdByUserId: actor.userId,
    questionIds: assignOrder(selected),
  });
  return { simulation, questions: selected.map(toPublicQuestionView) };
}

async function buildFromExamEdition(
  actor: Actor,
  title: string,
  examEditionId: string,
  count: number | undefined,
  seed: number | undefined,
) {
  const edition = await prisma.examEdition.findUnique({ where: { id: examEditionId } });
  if (!edition) throw new NotFoundError(`ExamEdition "${examEditionId}" não encontrada.`);

  // Ordem determinística por `id` (fallback documentado — `Question` não tem
  // hoje um campo de ordem própria dentro de uma prova; ver MODULO-6.md,
  // "Limitações". Preserva-se, ao gravar `SimulationQuestion.order`, QUALQUER
  // ordem que este builder produza — se um campo de ordem nativo existir no
  // futuro, basta trocar este `orderBy`.)
  const candidates = await listQuestions({
    examEditionId,
    reviewStatus: PublicationStatus.PUBLISHED,
    take: 500,
  });
  const sorted = [...candidates].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  if (sorted.length === 0) {
    throw new SimulationValidationError(
      `Nenhuma questão publicada encontrada para a prova "${examEditionId}".`,
    );
  }

  const selected = count
    ? deterministicShuffle(sorted, seed ?? DEFAULT_SHUFFLE_SEED).slice(0, count)
    : sorted;

  const simulation = await createSimulationRecord({
    title,
    config: { kind: "EXAM_EDITION", examEditionId, count, seed },
    createdByUserId: actor.userId,
    questionIds: assignOrder(selected),
  });
  return { simulation, questions: selected.map(toPublicQuestionView) };
}

/**
 * Simulado de revisão (seção 6.5) — só LEITURA da fila de revisão (Módulo
 * 5) e do histórico de erros; nunca recalcula intervalo/prioridade/estado.
 */
async function buildFromReview(
  actor: Actor,
  title: string,
  count: number,
  seed: number | undefined,
) {
  const queue = await getReviewQueue(actor, actor.userId, { limit: count });

  const fromQueue: CandidateQuestion[] = [];
  for (const entry of queue) {
    const question =
      entry.reviewItem.scope === "QUESTION"
        ? await prisma.question.findUnique({
            where: { id: entry.reviewItem.questionId! },
            include: { options: true, knowledgeTags: true, examEdition: true, source: true },
          })
        : await pickQuestionForConcept(entry.reviewItem.conceptId!);
    if (question && question.reviewStatus === PublicationStatus.PUBLISHED) {
      fromQueue.push(question as CandidateQuestion);
    }
  }

  const remaining = count - fromQueue.length;
  let fromWrongHistory: CandidateQuestion[] = [];
  if (remaining > 0) {
    const wrongAttempts = await prisma.questionAttempt.findMany({
      where: { userId: actor.userId, isCorrect: false },
      select: { questionId: true },
      distinct: ["questionId"],
      take: remaining * 3, // margem para descartar duplicadas/já incluídas abaixo
    });
    const excludeIds = new Set(fromQueue.map((q) => q.id));
    const wrongIds = wrongAttempts.map((a) => a.questionId).filter((id) => !excludeIds.has(id));
    if (wrongIds.length > 0) {
      // Busca direta pelos ids relevantes — nunca a base inteira filtrada em
      // JS depois (seção 39: evitar N+1 / full scan).
      fromWrongHistory = await prisma.question.findMany({
        where: { id: { in: wrongIds }, reviewStatus: PublicationStatus.PUBLISHED },
        include: { options: true, knowledgeTags: true, examEdition: true, source: true },
      });
    }
  }

  const merged = [...fromQueue, ...fromWrongHistory];
  const dedupedIds = new Set<string>();
  const candidates = merged.filter((q) => {
    if (dedupedIds.has(q.id)) return false;
    dedupedIds.add(q.id);
    return true;
  });

  if (candidates.length === 0) {
    throw new SimulationValidationError(
      "Nenhum item de revisão ou erro anterior elegível no momento para montar este simulado.",
    );
  }

  const selected = deterministicShuffle(candidates, seed ?? DEFAULT_SHUFFLE_SEED).slice(0, count);
  const simulation = await createSimulationRecord({
    title,
    config: { kind: "REVIEW", count, seed },
    createdByUserId: actor.userId,
    questionIds: assignOrder(selected),
  });
  return { simulation, questions: selected.map(toPublicQuestionView) };
}

export async function buildSimulation(actor: Actor, input: BuildSimulationInput) {
  const data = BuildSimulationInputSchema.parse(input);
  switch (data.kind) {
    case "PERSONALIZED":
      return buildPersonalized(actor, data.title, data.filters);
    case "EXAM_EDITION":
      return buildFromExamEdition(actor, data.title, data.examEditionId, data.count, data.seed);
    case "REVIEW":
      return buildFromReview(actor, data.title, data.count, data.seed);
  }
}
