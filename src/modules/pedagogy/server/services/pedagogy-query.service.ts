/**
 * Consultas de leitura do Núcleo Pedagógico (Módulo 4, capacidades 20-27) —
 * nenhuma delas muta estado; todas são projeções sobre as tabelas de junção
 * N:N já existentes, ordenadas pelo campo `order` de cada nível.
 *
 * Nota sobre "dificuldade" (capacidade 25): nenhum nó pedagógico
 * (Track/LearningArea/Unit/Stage/Lesson) tem `difficulty` próprio — não é
 * dono da verdade acadêmica (seção 4 do prompt do módulo). A dificuldade de
 * uma Lesson é sempre DERIVADA do(s) `Concept`(s) que ela ensina, via
 * `LessonKnowledgeTag`, nunca duplicada como campo solto na Lesson.
 */
import { prisma } from "@/server/db";
import { Difficulty, KnowledgeEntityType, PublicationStatus } from "@/generated/prisma/enums";

type DifficultyValue = (typeof Difficulty)[keyof typeof Difficulty];
type KnowledgeEntityTypeValue = (typeof KnowledgeEntityType)[keyof typeof KnowledgeEntityType];

export interface LessonQueryParams {
  publishedOnly?: boolean;
  take?: number;
  skip?: number;
}

/**
 * Monta a trilha pedagógica completa (Módulo 4, capacidade 20/21): Track →
 * LearningArea → Unit → Stage → Lesson → LessonBlock, cada nível ordenado
 * pelo `order` do join que o liga ao pai.
 */
export async function getFullTrack(trackId: string) {
  return prisma.track.findUnique({
    where: { id: trackId },
    include: {
      areas: {
        orderBy: { order: "asc" },
        include: {
          area: {
            include: {
              units: {
                orderBy: { order: "asc" },
                include: {
                  unit: {
                    include: {
                      stages: {
                        orderBy: { order: "asc" },
                        include: {
                          stage: {
                            include: {
                              lessons: {
                                orderBy: { order: "asc" },
                                include: {
                                  lesson: {
                                    include: { blocks: { orderBy: { order: "asc" } } },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

/** Conteúdo por área (Módulo 4, capacidade 22): units → stages → lessons de uma `LearningArea`. */
export async function listContentByArea(areaId: string) {
  return prisma.areaUnit.findMany({
    where: { areaId },
    orderBy: { order: "asc" },
    include: {
      unit: {
        include: {
          stages: {
            orderBy: { order: "asc" },
            include: {
              stage: {
                include: { lessons: { orderBy: { order: "asc" }, include: { lesson: true } } },
              },
            },
          },
        },
      },
    },
  });
}

async function listLessonsByKnowledgeEntity(
  entityType: KnowledgeEntityTypeValue,
  entityId: string,
  params?: LessonQueryParams,
) {
  return prisma.lesson.findMany({
    where: {
      knowledgeTags: { some: { entityType, entityId } },
      status: params?.publishedOnly ? PublicationStatus.PUBLISHED : undefined,
    },
    include: { knowledgeTags: true, blocks: { orderBy: { order: "asc" } } },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}

/** Conteúdo por conceito (Módulo 4, capacidade 23). */
export function listLessonsByConcept(conceptId: string, params?: LessonQueryParams) {
  return listLessonsByKnowledgeEntity(KnowledgeEntityType.CONCEPT, conceptId, params);
}

/** Conteúdo por teoria (Módulo 4, capacidade 24). */
export function listLessonsByTheory(theoryId: string, params?: LessonQueryParams) {
  return listLessonsByKnowledgeEntity(KnowledgeEntityType.THEORY, theoryId, params);
}

/** Conteúdo por escola (Módulo 4, capacidade 25 — numeração do prompt trata escola antes de dificuldade). */
export function listLessonsBySchool(schoolId: string, params?: LessonQueryParams) {
  return listLessonsByKnowledgeEntity(KnowledgeEntityType.SCHOOL, schoolId, params);
}

/**
 * Conteúdo por dificuldade (Módulo 4, capacidade 26) — via `Concept.difficulty`
 * dos conceitos que a Lesson ensina (ver nota do cabeçalho).
 */
export async function listLessonsByDifficulty(
  difficulty: DifficultyValue,
  params?: LessonQueryParams,
) {
  const concepts = await prisma.concept.findMany({ where: { difficulty }, select: { id: true } });
  if (concepts.length === 0) return [];

  return prisma.lesson.findMany({
    where: {
      knowledgeTags: {
        some: {
          entityType: KnowledgeEntityType.CONCEPT,
          entityId: { in: concepts.map((c) => c.id) },
        },
      },
      status: params?.publishedOnly ? PublicationStatus.PUBLISHED : undefined,
    },
    include: { knowledgeTags: true },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}

/** Lições publicadas (Módulo 4, capacidade 27). */
export async function listPublishedLessons(params?: { take?: number; skip?: number }) {
  return prisma.lesson.findMany({
    where: { status: PublicationStatus.PUBLISHED },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}

export interface PedagogicalContext {
  conceptIds: string[];
  lessonIds: string[];
  stageIds: string[];
  unitIds: string[];
  areaIds: string[];
  trackIds: string[];
}

/**
 * Resolve "a que parte do curso isto pertence?" a partir de um conjunto de
 * conceitos (e, opcionalmente, uma questão referenciada diretamente por um
 * `LessonBlock`) — travessia read-only do grafo pedagógico já existente
 * (`LessonKnowledgeTag`/`StageLesson`/`UnitStage`/`AreaUnit`/`TrackArea`),
 * nunca copia dado de lição para dentro de quem chama.
 *
 * Extraído no Módulo 6 a partir de uma função equivalente que vivia só em
 * `review/server/services/reviewContext.ts` (Módulo 5) — dois bounded
 * contexts (`review` e `simulation`) precisavam exatamente da mesma
 * travessia; ela pertence, por natureza, ao dono do grafo pedagógico
 * (`pedagogy`), não a quem só a consome. `review` foi atualizado para
 * delegar aqui em vez de manter uma cópia (ver `docs/MODULO-6.md`).
 */
export async function getPedagogicalContextForConcepts(
  conceptIds: string[],
  questionId?: string,
): Promise<PedagogicalContext> {
  const [lessonsByConcept, lessonsByQuestionBlock] = await Promise.all([
    conceptIds.length
      ? prisma.lessonKnowledgeTag.findMany({
          where: { entityType: KnowledgeEntityType.CONCEPT, entityId: { in: conceptIds } },
          select: { lessonId: true },
        })
      : Promise.resolve([]),
    questionId
      ? prisma.lessonBlock.findMany({ where: { questionId }, select: { lessonId: true } })
      : Promise.resolve([]),
  ]);

  const lessonIds = [
    ...new Set([
      ...lessonsByConcept.map((l) => l.lessonId),
      ...lessonsByQuestionBlock.map((l) => l.lessonId),
    ]),
  ];
  if (lessonIds.length === 0) {
    return { conceptIds, lessonIds: [], stageIds: [], unitIds: [], areaIds: [], trackIds: [] };
  }

  const stageLessons = await prisma.stageLesson.findMany({
    where: { lessonId: { in: lessonIds } },
    select: { stageId: true },
  });
  const stageIds = [...new Set(stageLessons.map((s) => s.stageId))];

  const unitStages = stageIds.length
    ? await prisma.unitStage.findMany({
        where: { stageId: { in: stageIds } },
        select: { unitId: true },
      })
    : [];
  const unitIds = [...new Set(unitStages.map((u) => u.unitId))];

  const areaUnits = unitIds.length
    ? await prisma.areaUnit.findMany({
        where: { unitId: { in: unitIds } },
        select: { areaId: true },
      })
    : [];
  const areaIds = [...new Set(areaUnits.map((a) => a.areaId))];

  const trackAreas = areaIds.length
    ? await prisma.trackArea.findMany({
        where: { areaId: { in: areaIds } },
        select: { trackId: true },
      })
    : [];
  const trackIds = [...new Set(trackAreas.map((t) => t.trackId))];

  return { conceptIds, lessonIds, stageIds, unitIds, areaIds, trackIds };
}
