/**
 * Fixtures de TESTE — não é seed de conteúdo acadêmico. Cria linhas mínimas
 * e descartáveis (prefixo `TEST_FIXTURE_`) só para exercitar constraints e
 * relações do banco; cada teste que as usa remove tudo que criou ao final
 * (ver `cleanupFixtures`). Nada aqui representa uma pessoa, obra, teoria,
 * conceito, questão ou prova real — ver docs/MODULO-1.md, "O que não foi
 * implementado", e docs/MODULO-3.md, "Conteúdo real inserido".
 */
import { prisma } from "@/server/db";
import {
  Role,
  CitationEntityType,
  Difficulty,
  StudyMode,
  BlockType,
  KnowledgeEntityType,
  ReviewState,
  LibraryMaterialType,
  FreeAccessReason,
} from "@/generated/prisma/enums";

type RoleValue = (typeof Role)[keyof typeof Role];
type DifficultyValue = (typeof Difficulty)[keyof typeof Difficulty];
type CitationEntityTypeValue = (typeof CitationEntityType)[keyof typeof CitationEntityType];
type StudyModeValue = (typeof StudyMode)[keyof typeof StudyMode];
type BlockTypeValue = (typeof BlockType)[keyof typeof BlockType];
type KnowledgeEntityTypeValue = (typeof KnowledgeEntityType)[keyof typeof KnowledgeEntityType];
type ReviewStateValue = (typeof ReviewState)[keyof typeof ReviewState];
type LibraryMaterialTypeValue = (typeof LibraryMaterialType)[keyof typeof LibraryMaterialType];
type FreeAccessReasonValue = (typeof FreeAccessReason)[keyof typeof FreeAccessReason];

interface ReviewItemFixtureOpts {
  dueAt?: Date;
  intervalDays?: number;
  easeFactor?: number;
  repetitions?: number;
  state?: ReviewStateValue;
  lastReviewedAt?: Date;
}

export async function createFixtureUser(suffix: string, role: RoleValue = Role.STUDENT) {
  return prisma.user.create({
    data: { email: `test-fixture-${suffix}-${Date.now()}@example.invalid`, role },
  });
}

export async function createFixtureSource(suffix: string) {
  return prisma.source.create({
    data: { name: `TEST_FIXTURE_source_${suffix}`, sourceType: "AUTORAL" },
  });
}

export async function createFixtureConcept(
  suffix: string,
  opts?: { difficulty?: DifficultyValue },
) {
  return prisma.concept.create({
    data: {
      slug: `test-fixture-concept-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_concept_${suffix}`,
      definition: "Definição de fixture de teste — não é conteúdo acadêmico real.",
      difficulty: opts?.difficulty,
    },
  });
}

export async function createFixtureQuestion(suffix: string, sourceId: string) {
  return prisma.question.create({
    data: {
      prompt: `TEST_FIXTURE_question_${suffix}`,
      type: "MULTIPLE_CHOICE",
      difficulty: "INICIANTE",
      sourceId,
    },
  });
}

export async function createFixtureDiscipline(suffix: string) {
  return prisma.discipline.create({
    data: {
      slug: `test-fixture-discipline-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_discipline_${suffix}`,
    },
  });
}

export async function createFixtureSchool(suffix: string) {
  return prisma.school.create({
    data: {
      slug: `test-fixture-school-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_school_${suffix}`,
    },
  });
}

export async function createFixtureTheory(suffix: string) {
  return prisma.theory.create({
    data: {
      slug: `test-fixture-theory-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_theory_${suffix}`,
    },
  });
}

export async function createFixtureAcademicPerson(suffix: string) {
  return prisma.academicPerson.create({
    data: {
      slug: `test-fixture-person-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_person_${suffix}`,
    },
  });
}

export async function createFixtureAcademicWork(suffix: string, sourceId?: string) {
  return prisma.academicWork.create({
    data: {
      title: `TEST_FIXTURE_work_${suffix}`,
      type: "LIVRO",
      sourceId,
    },
  });
}

export async function createFixtureHistoricalPeriod(suffix: string) {
  return prisma.historicalPeriod.create({
    data: {
      slug: `test-fixture-period-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_period_${suffix}`,
    },
  });
}

export async function createFixtureDevelopmentalStage(suffix: string, order = 0) {
  return prisma.developmentalStage.create({
    data: {
      slug: `test-fixture-stage-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_stage_${suffix}`,
      order,
    },
  });
}

export async function createFixtureTag(suffix: string) {
  return prisma.tag.create({
    data: {
      slug: `test-fixture-tag-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_tag_${suffix}`,
    },
  });
}

export async function createFixtureCitation(params: {
  entityType: CitationEntityTypeValue;
  entityId: string;
  sourceId: string;
}) {
  return prisma.citation.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      sourceId: params.sourceId,
    },
  });
}

// ---- Módulo 3 — avaliações ------------------------------------------------

export async function createFixtureExam(suffix: string) {
  return prisma.exam.create({
    data: {
      slug: `test-fixture-exam-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_exam_${suffix}`,
    },
  });
}

export async function createFixtureExamBoard(suffix: string) {
  return prisma.examBoard.create({
    data: {
      slug: `test-fixture-board-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_board_${suffix}`,
    },
  });
}

export async function createFixtureOrganization(suffix: string) {
  return prisma.organization.create({
    data: { slug: `test-fixture-org-${suffix}-${Date.now()}`, name: `TEST_FIXTURE_org_${suffix}` },
  });
}

export async function createFixturePosition(suffix: string) {
  return prisma.position.create({
    data: {
      slug: `test-fixture-position-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_position_${suffix}`,
    },
  });
}

export async function createFixtureExamEdition(
  suffix: string,
  examId: string,
  opts?: {
    year?: number;
    examBoardId?: string;
    organizationId?: string;
    positionId?: string;
    sourceId?: string;
  },
) {
  return prisma.examEdition.create({
    data: {
      examId,
      name: `TEST_FIXTURE_edition_${suffix}`,
      year: opts?.year ?? 2020,
      examBoardId: opts?.examBoardId,
      organizationId: opts?.organizationId,
      positionId: opts?.positionId,
      sourceId: opts?.sourceId,
    },
  });
}

/**
 * Questão MULTIPLE_CHOICE completa (com alternativas), pronta para ser
 * publicada e usada em tentativas/diagnóstico — diferente de
 * `createFixtureQuestion` (mínima, sem alternativas, usada pelos testes do
 * Módulo 1/2 de `ReviewItem`).
 */
export async function createFixtureMultipleChoiceQuestion(
  suffix: string,
  sourceId: string,
  opts?: { difficulty?: DifficultyValue; correctIndex?: number; examEditionId?: string },
) {
  const correctIndex = opts?.correctIndex ?? 0;
  return prisma.question.create({
    data: {
      prompt: `TEST_FIXTURE_question_mc_${suffix}`,
      type: "MULTIPLE_CHOICE",
      difficulty: opts?.difficulty ?? "INICIANTE",
      sourceId,
      examEditionId: opts?.examEditionId,
      options: {
        create: [0, 1, 2, 3].map((i) => ({
          text: `TEST_FIXTURE_option_${suffix}_${i}`,
          isCorrect: i === correctIndex,
          order: i,
        })),
      },
    },
    include: { options: true },
  });
}

// ---- Módulo 4 — núcleo pedagógico ------------------------------------------

export async function createFixtureTrack(suffix: string, mode: StudyModeValue = "FORMACAO") {
  return prisma.track.create({
    data: {
      slug: `test-fixture-track-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_track_${suffix}`,
      mode,
    },
  });
}

export async function createFixtureLearningArea(suffix: string) {
  return prisma.learningArea.create({
    data: {
      slug: `test-fixture-area-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_area_${suffix}`,
    },
  });
}

export async function createFixtureUnit(suffix: string) {
  return prisma.unit.create({
    data: { name: `TEST_FIXTURE_unit_${suffix}` },
  });
}

export async function createFixturePedagogyStage(suffix: string) {
  return prisma.stage.create({
    data: { name: `TEST_FIXTURE_pedagogy_stage_${suffix}` },
  });
}

export async function createFixtureLesson(suffix: string) {
  return prisma.lesson.create({
    data: { title: `TEST_FIXTURE_lesson_${suffix}` },
  });
}

export async function createFixtureLessonBlock(
  lessonId: string,
  order: number,
  opts?: { type?: BlockTypeValue; content?: string; questionId?: string },
) {
  return prisma.lessonBlock.create({
    data: {
      lessonId,
      order,
      type: opts?.type ?? "CONCEPT",
      content: opts?.questionId ? undefined : (opts?.content ?? "TEST_FIXTURE_block_content"),
      questionId: opts?.questionId,
    },
  });
}

/**
 * Atalho de fixture (Módulo 8): Lesson já PUBLISHED, com Citation e os
 * blocos informados. Publica via `prisma` direto (não via `publishLesson`)
 * de propósito — o gate de publicação da Lesson em si já é testado
 * exaustivamente em `lesson.service.test.ts` (Módulo 4); aqui só se precisa
 * de uma lição publicada como PRÉ-CONDIÇÃO para testar execução/progresso.
 */
export async function createFixturePublishedLesson(
  suffix: string,
  opts?: { blocks?: Array<{ type?: BlockTypeValue; content?: string; questionId?: string }> },
) {
  const source = await createFixtureSource(`lesson-pub-${suffix}`);
  const lesson = await createFixtureLesson(suffix);
  const blockSpecs: Array<{ type?: BlockTypeValue; content?: string; questionId?: string }> =
    opts?.blocks ?? [{ type: BlockType.CONCEPT, content: "TEST_FIXTURE_block_content" }];

  const blocks = [];
  for (let i = 0; i < blockSpecs.length; i++) {
    blocks.push(await createFixtureLessonBlock(lesson.id, i, blockSpecs[i]));
  }
  const citation = await prisma.citation.create({
    data: { entityType: "LESSON", entityId: lesson.id, sourceId: source.id },
  });
  const published = await prisma.lesson.update({
    where: { id: lesson.id },
    data: { status: "PUBLISHED" },
  });
  return { lesson: published, source, citation, blocks };
}

// ---- Módulo 5 — revisão espaçada -------------------------------------------

export async function createFixtureQuestionKnowledgeTag(
  questionId: string,
  entityType: KnowledgeEntityTypeValue,
  entityId: string,
) {
  return prisma.questionKnowledgeTag.create({ data: { questionId, entityType, entityId } });
}

export async function createFixtureReviewItem(
  userId: string,
  params:
    | { scope: "QUESTION"; questionId: string; opts?: ReviewItemFixtureOpts }
    | { scope: "CONCEPT"; conceptId: string; opts?: ReviewItemFixtureOpts },
) {
  return prisma.reviewItem.create({
    data: {
      userId,
      scope: params.scope,
      questionId: params.scope === "QUESTION" ? params.questionId : undefined,
      conceptId: params.scope === "CONCEPT" ? params.conceptId : undefined,
      dueAt: params.opts?.dueAt ?? new Date(),
      intervalDays: params.opts?.intervalDays ?? 1,
      easeFactor: params.opts?.easeFactor ?? 2.5,
      repetitions: params.opts?.repetitions ?? 0,
      state: params.opts?.state ?? "NEW",
      lastReviewedAt: params.opts?.lastReviewedAt,
    },
  });
}

// ---- Módulo 7 — biblioteca e atualidades -----------------------------------

export async function createFixtureLibraryItem(
  sourceId: string,
  opts?: {
    title?: string;
    materialType?: LibraryMaterialTypeValue;
    isFree?: boolean;
    freeAccessReason?: FreeAccessReasonValue;
    academicWorkId?: string;
  },
) {
  return prisma.libraryItem.create({
    data: {
      title: opts?.title ?? `TEST_FIXTURE_library_item_${Date.now()}`,
      materialType: opts?.materialType ?? "LIVRO",
      isFree: opts?.isFree ?? false,
      freeAccessReason: opts?.freeAccessReason,
      academicWorkId: opts?.academicWorkId,
      sourceId,
    },
  });
}

export async function createFixtureLibraryItemKnowledgeTag(
  libraryItemId: string,
  entityType: KnowledgeEntityTypeValue,
  entityId: string,
) {
  return prisma.libraryItemKnowledgeTag.create({ data: { libraryItemId, entityType, entityId } });
}

export async function createFixtureCurrentAffair(
  sourceId: string,
  opts?: { title?: string; eventDate?: Date; validUntil?: Date },
) {
  return prisma.currentAffair.create({
    data: {
      title: opts?.title ?? `TEST_FIXTURE_current_affair_${Date.now()}`,
      summary: "Resumo de fixture de teste — não é uma atualidade real.",
      eventDate: opts?.eventDate ?? new Date(),
      validUntil: opts?.validUntil,
      sourceId,
    },
  });
}

export async function createFixtureCurrentAffairKnowledgeTag(
  currentAffairId: string,
  entityType: KnowledgeEntityTypeValue,
  entityId: string,
) {
  return prisma.currentAffairKnowledgeTag.create({
    data: { currentAffairId, entityType, entityId },
  });
}

// ---- Módulo 9 — gamificação -------------------------------------------------

/**
 * `Achievement` de fixture — `criteria` já no formato validado por
 * `AchievementCriteriaSchema` (ver `achievement-evaluator.ts`). Não é
 * conteúdo real (nenhuma conquista de produto é inserida por este
 * projeto); só serve para exercitar `evaluateAndUnlockAchievements` nos
 * testes do Módulo 9.
 */
export async function createFixtureAchievement(
  suffix: string,
  criteria: Record<string, unknown>,
  opts?: { xpReward?: number },
) {
  return prisma.achievement.create({
    data: {
      code: `test-fixture-achievement-${suffix}-${Date.now()}`,
      name: `TEST_FIXTURE_achievement_${suffix}`,
      description: "Conquista de fixture de teste — não é conteúdo real de produto.",
      criteria: criteria as object,
      xpReward: opts?.xpReward ?? 0,
    },
  });
}

/** Remove, em ordem segura de FKs, tudo criado por um conjunto de fixtures. */
export async function cleanupFixtures(ids: {
  reviewItemIds?: string[];
  questionAttemptIds?: string[];
  studySessionIds?: string[];
  questionIds?: string[];
  conceptIds?: string[];
  sourceIds?: string[];
  disciplineIds?: string[];
  userIds?: string[];
  schoolIds?: string[];
  theoryIds?: string[];
  personIds?: string[];
  workIds?: string[];
  periodIds?: string[];
  stageIds?: string[];
  tagIds?: string[];
  citationIds?: string[];
  academicRelationIds?: string[];
  legalReferenceSourceIds?: string[];
  examIds?: string[];
  examEditionIds?: string[];
  examBoardIds?: string[];
  organizationIds?: string[];
  positionIds?: string[];
  trackIds?: string[];
  learningAreaIds?: string[];
  unitIds?: string[];
  pedagogyStageIds?: string[];
  lessonIds?: string[];
  simulationIds?: string[];
  simulationAttemptIds?: string[];
  libraryItemIds?: string[];
  currentAffairIds?: string[];
  achievementIds?: string[];
}) {
  // Módulo 7 — biblioteca/atualidades. Tags (join tables) removidas antes
  // das entidades que as referenciam; `_CurrentAffairToTag` (implícita) já
  // cai sozinha via ON DELETE CASCADE ao apagar a CurrentAffair.
  if (ids.libraryItemIds?.length) {
    await prisma.libraryItemKnowledgeTag.deleteMany({
      where: { libraryItemId: { in: ids.libraryItemIds } },
    });
    await prisma.libraryItem.deleteMany({ where: { id: { in: ids.libraryItemIds } } });
  }
  if (ids.currentAffairIds?.length) {
    await prisma.currentAffairKnowledgeTag.deleteMany({
      where: { currentAffairId: { in: ids.currentAffairIds } },
    });
    await prisma.currentAffair.deleteMany({ where: { id: { in: ids.currentAffairIds } } });
  }
  // Módulo 5 — ReviewLog referencia ReviewItem/QuestionAttempt/User; precisa
  // ser removido ANTES de qualquer um dos três, mesmo que o teste não tenha
  // rastreado ids de log individualmente (eles nascem de serviço, não de fixture).
  if (ids.reviewItemIds?.length) {
    await prisma.reviewLog.deleteMany({ where: { reviewItemId: { in: ids.reviewItemIds } } });
  }
  if (ids.userIds?.length) {
    await prisma.reviewLog.deleteMany({ where: { userId: { in: ids.userIds } } });
  }
  if (ids.reviewItemIds?.length) {
    await prisma.reviewItem.deleteMany({ where: { id: { in: ids.reviewItemIds } } });
  }
  if (ids.academicRelationIds?.length) {
    await prisma.academicRelation.deleteMany({ where: { id: { in: ids.academicRelationIds } } });
  }
  if (ids.citationIds?.length) {
    await prisma.citation.deleteMany({ where: { id: { in: ids.citationIds } } });
  }
  // Núcleo pedagógico (Módulo 4) — de baixo para cima: blocos/tags/joins
  // antes das entidades que eles referenciam, e `lessonIds` antes de
  // `questionIds` (um LessonBlock pode referenciar uma Question de fixture).
  // Módulo 8 — execução de lição. `LessonBlockCompletion` referencia
  // `LessonBlock`/`LessonProgress`/`QuestionAttempt`; precisa sair ANTES de
  // qualquer um dos três (removido aqui por `lessonId`, via `LessonBlock`,
  // porque é a chave que os testes deste módulo sempre têm à mão).
  if (ids.lessonIds?.length) {
    await prisma.lessonBlockCompletion.deleteMany({
      where: { lessonBlock: { lessonId: { in: ids.lessonIds } } },
    });
    await prisma.lessonProgress.deleteMany({ where: { lessonId: { in: ids.lessonIds } } });
  }
  if (ids.lessonIds?.length) {
    await prisma.lessonBlock.deleteMany({ where: { lessonId: { in: ids.lessonIds } } });
    await prisma.lessonKnowledgeTag.deleteMany({ where: { lessonId: { in: ids.lessonIds } } });
    await prisma.stageLesson.deleteMany({ where: { lessonId: { in: ids.lessonIds } } });
  }
  if (ids.pedagogyStageIds?.length) {
    await prisma.stageLesson.deleteMany({ where: { stageId: { in: ids.pedagogyStageIds } } });
    await prisma.unitStage.deleteMany({ where: { stageId: { in: ids.pedagogyStageIds } } });
  }
  if (ids.unitIds?.length) {
    await prisma.unitStage.deleteMany({ where: { unitId: { in: ids.unitIds } } });
    await prisma.areaUnit.deleteMany({ where: { unitId: { in: ids.unitIds } } });
  }
  if (ids.learningAreaIds?.length) {
    await prisma.areaUnit.deleteMany({ where: { areaId: { in: ids.learningAreaIds } } });
    await prisma.trackArea.deleteMany({ where: { areaId: { in: ids.learningAreaIds } } });
  }
  if (ids.trackIds?.length) {
    await prisma.trackArea.deleteMany({ where: { trackId: { in: ids.trackIds } } });
  }
  if (ids.lessonIds?.length) {
    await prisma.lesson.deleteMany({ where: { id: { in: ids.lessonIds } } });
  }
  if (ids.pedagogyStageIds?.length) {
    await prisma.stage.deleteMany({ where: { id: { in: ids.pedagogyStageIds } } });
  }
  if (ids.unitIds?.length) {
    await prisma.unit.deleteMany({ where: { id: { in: ids.unitIds } } });
  }
  if (ids.learningAreaIds?.length) {
    await prisma.learningArea.deleteMany({ where: { id: { in: ids.learningAreaIds } } });
  }
  if (ids.trackIds?.length) {
    await prisma.track.deleteMany({ where: { id: { in: ids.trackIds } } });
  }
  // Módulo 6 — simulados. `SimulationAttempt` gera `QuestionAttempt`
  // (simAttemptId) que por sua vez pode ter gerado `ReviewLog` (Módulo 5,
  // via `ensureReviewItem` ao finalizar) — removidos de baixo para cima,
  // defensivamente, mesmo que o teste não tenha rastreado o ReviewItem
  // dinamicamente criado.
  if (ids.simulationIds?.length) {
    const attempts = await prisma.simulationAttempt.findMany({
      where: { simulationId: { in: ids.simulationIds } },
      select: { id: true },
    });
    for (const a of attempts)
      ids.simulationAttemptIds = [...(ids.simulationAttemptIds ?? []), a.id];
  }
  if (ids.simulationAttemptIds?.length) {
    await prisma.reviewLog.deleteMany({
      where: { questionAttempt: { simAttemptId: { in: ids.simulationAttemptIds } } },
    });
    await prisma.questionAttempt.deleteMany({
      where: { simAttemptId: { in: ids.simulationAttemptIds } },
    });
    await prisma.simulationAttempt.deleteMany({ where: { id: { in: ids.simulationAttemptIds } } });
  }
  if (ids.simulationIds?.length) {
    await prisma.simulationQuestion.deleteMany({
      where: { simulationId: { in: ids.simulationIds } },
    });
    await prisma.simulation.deleteMany({ where: { id: { in: ids.simulationIds } } });
  }
  // Tentativas — sempre filhas de Question/StudySession; removidas antes de
  // qualquer um dos dois, mesmo que não tenham sido rastreadas 1 a 1.
  if (ids.questionAttemptIds?.length) {
    await prisma.questionAttempt.deleteMany({ where: { id: { in: ids.questionAttemptIds } } });
  }
  if (ids.studySessionIds?.length) {
    await prisma.questionAttempt.deleteMany({ where: { sessionId: { in: ids.studySessionIds } } });
  }
  if (ids.questionIds?.length) {
    await prisma.questionAttempt.deleteMany({ where: { questionId: { in: ids.questionIds } } });
    await prisma.questionKnowledgeTag.deleteMany({
      where: { questionId: { in: ids.questionIds } },
    });
    await prisma.questionOption.deleteMany({ where: { questionId: { in: ids.questionIds } } });
    await prisma.simulationQuestion.deleteMany({ where: { questionId: { in: ids.questionIds } } });
  }
  if (ids.studySessionIds?.length) {
    await prisma.studySession.deleteMany({ where: { id: { in: ids.studySessionIds } } });
  }
  if (ids.questionIds?.length) {
    await prisma.question.deleteMany({ where: { id: { in: ids.questionIds } } });
  }
  if (ids.workIds?.length) {
    await prisma.academicWorkAuthor.deleteMany({ where: { workId: { in: ids.workIds } } });
    await prisma.academicWork.deleteMany({ where: { id: { in: ids.workIds } } });
  }
  if (ids.conceptIds?.length) {
    await prisma.concept.deleteMany({ where: { id: { in: ids.conceptIds } } });
  }
  if (ids.theoryIds?.length) {
    await prisma.theory.deleteMany({ where: { id: { in: ids.theoryIds } } });
  }
  if (ids.schoolIds?.length) {
    await prisma.school.deleteMany({ where: { id: { in: ids.schoolIds } } });
  }
  if (ids.personIds?.length) {
    await prisma.academicWorkAuthor.deleteMany({ where: { personId: { in: ids.personIds } } });
    await prisma.academicPerson.deleteMany({ where: { id: { in: ids.personIds } } });
  }
  if (ids.tagIds?.length) {
    await prisma.tag.deleteMany({ where: { id: { in: ids.tagIds } } });
  }
  if (ids.stageIds?.length) {
    await prisma.developmentalStage.deleteMany({ where: { id: { in: ids.stageIds } } });
  }
  if (ids.examEditionIds?.length) {
    await prisma.examEdition.deleteMany({ where: { id: { in: ids.examEditionIds } } });
  }
  if (ids.examIds?.length) {
    await prisma.exam.deleteMany({ where: { id: { in: ids.examIds } } });
  }
  if (ids.examBoardIds?.length) {
    await prisma.examBoard.deleteMany({ where: { id: { in: ids.examBoardIds } } });
  }
  if (ids.organizationIds?.length) {
    await prisma.organization.deleteMany({ where: { id: { in: ids.organizationIds } } });
  }
  if (ids.positionIds?.length) {
    await prisma.position.deleteMany({ where: { id: { in: ids.positionIds } } });
  }
  if (ids.legalReferenceSourceIds?.length) {
    await prisma.legalReference.deleteMany({
      where: { sourceId: { in: ids.legalReferenceSourceIds } },
    });
  }
  if (ids.sourceIds?.length) {
    await prisma.source.deleteMany({ where: { id: { in: ids.sourceIds } } });
  }
  if (ids.disciplineIds?.length) {
    await prisma.discipline.deleteMany({ where: { id: { in: ids.disciplineIds } } });
  }
  if (ids.periodIds?.length) {
    await prisma.historicalPeriod.deleteMany({ where: { id: { in: ids.periodIds } } });
  }
  // Módulo 8 — defensivo: cobre `LessonProgress` de fixtures cujo `lessonId`
  // não foi rastreado (não deveria acontecer nos testes deste módulo, que
  // sempre criam a Lesson também, mas mantém o cleanup seguro por `userId`).
  if (ids.userIds?.length) {
    await prisma.lessonBlockCompletion.deleteMany({
      where: { lessonProgress: { userId: { in: ids.userIds } } },
    });
    await prisma.lessonProgress.deleteMany({ where: { userId: { in: ids.userIds } } });
  }
  // Módulo 9 — gamificação. Todas por `userId` (não há FK de conteúdo a
  // rastrear além de `achievementIds`, que é só de fixture, nunca real).
  if (ids.userIds?.length) {
    await prisma.gamificationEvent.deleteMany({ where: { userId: { in: ids.userIds } } });
    await prisma.userAchievement.deleteMany({ where: { userId: { in: ids.userIds } } });
    await prisma.streak.deleteMany({ where: { userId: { in: ids.userIds } } });
    await prisma.dailyGoal.deleteMany({ where: { userId: { in: ids.userIds } } });
  }
  if (ids.achievementIds?.length) {
    await prisma.userAchievement.deleteMany({
      where: { achievementId: { in: ids.achievementIds } },
    });
    await prisma.achievement.deleteMany({ where: { id: { in: ids.achievementIds } } });
  }
  if (ids.userIds?.length) {
    // AuthSession (etapa de consolidação — autenticação real) referencia
    // User sem cascade; precisa cair antes do usuário, mesmo padrão das
    // demais tabelas dependentes acima.
    await prisma.authSession.deleteMany({ where: { userId: { in: ids.userIds } } });
    await prisma.contentAuditLog.deleteMany({ where: { actorUserId: { in: ids.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.userIds } } });
  }
}
