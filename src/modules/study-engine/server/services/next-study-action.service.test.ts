/**
 * Testes de integração reais dos geradores de candidato (Módulo 10, seções
 * 4/7-16/30/40) — cada gerador delega ao módulo autoridade correspondente;
 * aqui só se confirma a conversão correta para `NextStudyAction` e que
 * nenhum conteúdo inválido (não publicado / sem procedência / sem fonte)
 * nunca é recomendado.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import {
  generateDiagnosticAction,
  generateReviewOverdueActions,
  generateLessonAction,
  generateRecentQuestionAction,
  generateSimulationAction,
  generateComplementaryActions,
  generateInterdisciplinaryActions,
} from "./next-study-action.service";
import { linkTrackToArea, publishTrack } from "@/modules/pedagogy/server/services/track.service";
import {
  linkAreaToUnit,
  publishLearningArea,
} from "@/modules/pedagogy/server/services/learning-area.service";
import { linkUnitToStage, publishUnit } from "@/modules/pedagogy/server/services/unit.service";
import { linkStageToLesson, publishStage } from "@/modules/pedagogy/server/services/stage.service";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import {
  createLibraryItem,
  publishLibraryItem,
} from "@/modules/curation/server/services/library.service";
import {
  createCurrentAffair,
  publishCurrentAffair,
} from "@/modules/curation/server/services/current-affairs.service";
import {
  linkLibraryItemToKnowledge,
  linkCurrentAffairToKnowledge,
} from "@/modules/curation/server/services/content-linking.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  createFixtureTrack,
  createFixtureLearningArea,
  createFixtureUnit,
  createFixturePedagogyStage,
  createFixturePublishedLesson,
  createFixtureReviewItem,
  createFixtureExam,
  createFixtureExamEdition,
  cleanupFixtures,
} from "@/test/fixtures";

describe("next-study-action generators", () => {
  let studentId: string;
  let adminUserId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const lessonIds: string[] = [];
  const citationIds: string[] = [];
  const trackIds: string[] = [];
  const learningAreaIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const reviewItemIds: string[] = [];
  const examIds: string[] = [];
  const examEditionIds: string[] = [];
  const libraryItemIds: string[] = [];
  const currentAffairIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("gen-student", Role.STUDENT);
    const adminUser = await createFixtureUser("gen-admin", Role.ADMIN);
    studentId = studentUser.id;
    adminUserId = adminUser.id;
    userIds.push(studentId, adminUserId);
  });

  const adminActor = () => ({ userId: adminUserId, role: Role.ADMIN });
  const editorActor = () => ({ userId: adminUserId, role: Role.CONTENT_EDITOR });

  it("generateDiagnosticAction: ação única, sem nenhuma referência", () => {
    const result = generateDiagnosticAction();
    expect(result.type).toBe("START_DIAGNOSTIC");
    expect(result.lessonId).toBeNull();
    expect(result.conceptId).toBeNull();
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("generateReviewOverdueActions: converte a fila de revisão (Módulo 5) sem recalcular nada", async () => {
    const concept = await createFixtureConcept("gen-review");
    conceptIds.push(concept.id);
    const item = await createFixtureReviewItem(studentId, {
      scope: "CONCEPT",
      conceptId: concept.id,
      opts: { dueAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), state: "REVIEW" },
    });
    reviewItemIds.push(item.id);

    const actions = await generateReviewOverdueActions(student(), studentId);
    const match = actions.find((a) => a.conceptId === concept.id);
    expect(match).toBeDefined();
    expect(match?.type).toBe("REVIEW");
    expect(match?.reason.length).toBeGreaterThan(0);
    expect(match?.metadata?.reviewItemId).toBe(item.id);
  });

  it("generateLessonAction: encontra a lição da trilha informada, com razão enriquecida quando ligada a um conceito fraco", async () => {
    // Escopado por `preferredTrackId` de propósito em todo este teste (não
    // testamos aqui a varredura global sem trackId): sob a suíte completa
    // em paralelo, QUALQUER outra trilha publicada por outro arquivo de
    // teste também conta como "disponível" para este aluno novo — a
    // varredura sem trackId é, por design (Módulo 8), global e não
    // isolada por teste (ver docs/MODULO-10.md, "Divergências"). Testar
    // "nenhuma lição encontrada" com um trackId real também não é
    // determinístico aqui: quando a trilha preferida não tem sequência,
    // `generateLessonAction` cai de propósito na varredura global (mesma
    // observação) — comportamento correto em produção, só não isolável em
    // teste sob paralelismo.
    const track = await createFixtureTrack("gen-lesson");
    const area = await createFixtureLearningArea("gen-lesson");
    const unit = await createFixtureUnit("gen-lesson");
    const stage = await createFixturePedagogyStage("gen-lesson");
    trackIds.push(track.id);
    learningAreaIds.push(area.id);
    unitIds.push(unit.id);
    pedagogyStageIds.push(stage.id);

    const lesson = await createFixturePublishedLesson("gen-lesson");
    lessonIds.push(lesson.lesson.id);
    sourceIds.push(lesson.source.id);
    citationIds.push(lesson.citation.id);

    await linkStageToLesson(editorActor(), stage.id, { lessonId: lesson.lesson.id, order: 0 });
    await linkUnitToStage(editorActor(), unit.id, { stageId: stage.id });
    await linkAreaToUnit(editorActor(), area.id, { unitId: unit.id });
    await linkTrackToArea(editorActor(), track.id, { areaId: area.id });
    await publishStage(adminActor(), stage.id);
    await publishUnit(adminActor(), unit.id);
    await publishLearningArea(adminActor(), area.id);
    await publishTrack(adminActor(), track.id);

    const found = await generateLessonAction(student(), studentId, { preferredTrackId: track.id });
    expect(found?.lessonId).toBe(lesson.lesson.id);
    expect(found?.trackId).toBe(track.id);
    expect(found?.type).toBe("LESSON");

    // com preferredTrackId + relatedToWeakConceptId, a razão é enriquecida.
    const enriched = await generateLessonAction(student(), studentId, {
      preferredTrackId: track.id,
      relatedToWeakConceptId: "concept-fraco-qualquer",
    });
    expect(enriched?.reason).toContain("Relacionada ao conceito com desempenho mais baixo");
    expect(enriched?.conceptId).toBe("concept-fraco-qualquer");
  });

  it("generateRecentQuestionAction: null sem questão; escolhe a mais recente entre publicadas", async () => {
    const concept = await createFixtureConcept("gen-question");
    conceptIds.push(concept.id);
    expect(await generateRecentQuestionAction(concept.id)).toBeNull();

    const source = await createFixtureSource("gen-question");
    sourceIds.push(source.id);
    const exam = await createFixtureExam("gen-question");
    examIds.push(exam.id);
    const oldEdition = await createFixtureExamEdition("gen-question-old", exam.id, { year: 2018 });
    const newEdition = await createFixtureExamEdition("gen-question-new", exam.id, { year: 2024 });
    examEditionIds.push(oldEdition.id, newEdition.id);

    const oldQuestion = await createFixtureMultipleChoiceQuestion("gen-question-old", source.id, {
      examEditionId: oldEdition.id,
    });
    const newQuestion = await createFixtureMultipleChoiceQuestion("gen-question-new", source.id, {
      examEditionId: newEdition.id,
    });
    const draftQuestion = await createFixtureMultipleChoiceQuestion(
      "gen-question-draft",
      source.id,
      {
        examEditionId: newEdition.id,
      },
    );
    questionIds.push(oldQuestion.id, newQuestion.id, draftQuestion.id);
    for (const q of [oldQuestion, newQuestion, draftQuestion]) {
      await createFixtureQuestionKnowledgeTag(q.id, "CONCEPT", concept.id);
    }
    await publishQuestion(adminActor(), oldQuestion.id);
    await publishQuestion(adminActor(), newQuestion.id);
    // draftQuestion nunca é publicada — não deve poder ser recomendada.

    const result = await generateRecentQuestionAction(concept.id);
    expect(result?.questionId).toBe(newQuestion.id); // mais recente (2024) primeiro
    expect(result?.type).toBe("QUESTION");
    expect(result?.metadata?.relatedQuestionIds as string[]).not.toContain(draftQuestion.id);
  });

  it("generateSimulationAction: sempre devolve algo, mesmo sem histórico (fallback neutro do Módulo 6)", async () => {
    const otherStudent = await createFixtureUser("gen-sim-fresh", Role.STUDENT);
    userIds.push(otherStudent.id);
    const result = await generateSimulationAction(
      { userId: otherStudent.id, role: Role.STUDENT },
      otherStudent.id,
    );
    expect(result.type).toBe("SIMULATION");
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("generateComplementaryActions: prioriza livro gratuito e atualidade mais recente, ambas publicadas", async () => {
    const source = await createFixtureSource("gen-complementary");
    sourceIds.push(source.id);
    await prisma.source.update({
      where: { id: source.id },
      data: { url: "https://example.invalid/gen-complementary", license: "CC-BY-4.0" },
    });
    const concept = await createFixtureConcept("gen-complementary");
    conceptIds.push(concept.id);

    const paidItem = await createLibraryItem(adminActor(), {
      title: "TEST_FIXTURE_gen_complementary_paid",
      materialType: "LIVRO",
      sourceId: source.id,
      isFree: false,
    });
    await linkLibraryItemToKnowledge(adminActor(), paidItem.id, {
      entityType: "CONCEPT",
      entityId: concept.id,
    });
    await publishLibraryItem(adminActor(), paidItem.id);

    const freeItem = await createLibraryItem(adminActor(), {
      title: "TEST_FIXTURE_gen_complementary_free",
      materialType: "EBOOK",
      sourceId: source.id,
      isFree: true,
      freeAccessReason: "PUBLIC_DOMAIN",
    });
    await linkLibraryItemToKnowledge(adminActor(), freeItem.id, {
      entityType: "CONCEPT",
      entityId: concept.id,
    });
    await publishLibraryItem(adminActor(), freeItem.id);
    libraryItemIds.push(paidItem.id, freeItem.id);

    const affair = await createCurrentAffair(adminActor(), {
      title: "TEST_FIXTURE_gen_complementary_affair",
      summary: "resumo",
      eventDate: new Date(),
      sourceId: source.id,
    });
    await linkCurrentAffairToKnowledge(adminActor(), affair.id, {
      entityType: "CONCEPT",
      entityId: concept.id,
    });
    await publishCurrentAffair(adminActor(), affair.id);
    currentAffairIds.push(affair.id);

    const actions = await generateComplementaryActions(concept.id);
    const libraryAction = actions.find((a) => a.type === "LIBRARY");
    const affairAction = actions.find((a) => a.type === "CURRENT_AFFAIR");
    expect(libraryAction?.libraryItemId).toBe(freeItem.id); // gratuito preferido sobre pago
    expect(affairAction?.currentAffairId).toBe(affair.id);
  });

  it("generateInterdisciplinaryActions: vazio quando não há AcademicRelation publicada para o conceito", async () => {
    const concept = await createFixtureConcept("gen-interdisc-empty");
    conceptIds.push(concept.id);
    const actions = await generateInterdisciplinaryActions(concept.id);
    expect(actions).toEqual([]);
  });

  afterAll(async () => {
    await cleanupFixtures({
      reviewItemIds,
      libraryItemIds,
      currentAffairIds,
      citationIds,
      lessonIds,
      pedagogyStageIds,
      unitIds,
      learningAreaIds,
      trackIds,
      examEditionIds,
      examIds,
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
