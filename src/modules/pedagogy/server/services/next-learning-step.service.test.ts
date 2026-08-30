/**
 * Testes de integração reais de "próximo passo" (Módulo 8, seções 21-24) e
 * "ponto de partida via diagnóstico" (seções 22/23) — sem recalcular
 * diagnóstico nem inventar recomendação: só reaproveita
 * `getDiagnosticResult` (Módulo 3) e a estrutura pedagógica já publicada.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { linkTrackToArea, publishTrack } from "./track.service";
import { linkAreaToUnit, publishLearningArea } from "./learning-area.service";
import { linkUnitToStage, publishUnit } from "./unit.service";
import { linkStageToLesson, publishStage } from "./stage.service";
import { linkLessonToKnowledge } from "./lesson.service";
import { getNextLearningStep, getStartingPoint } from "./next-learning-step.service";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import { submitDiagnosticAnswer } from "@/modules/assessment/server/services/diagnostic.service";
import {
  createFixtureUser,
  createFixtureTrack,
  createFixtureLearningArea,
  createFixtureUnit,
  createFixturePedagogyStage,
  createFixturePublishedLesson,
  createFixtureConcept,
  createFixtureSource,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Next learning step service", () => {
  let studentId: string;
  let adminUserId: string;
  let trackId: string;
  let lesson1Id: string;
  let conceptId: string;
  let diagnosticQuestionId: string;
  let wrongOptionId: string;
  const userIds: string[] = [];
  const trackIds: string[] = [];
  const learningAreaIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const studySessionIds: string[] = [];
  const questionAttemptIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("next-student", Role.STUDENT);
    const adminUser = await createFixtureUser("next-admin", Role.ADMIN);
    studentId = studentUser.id;
    adminUserId = adminUser.id;
    userIds.push(studentId, adminUserId);
    const adminActor = { userId: adminUserId, role: Role.ADMIN };
    const editorActor = { userId: adminUserId, role: Role.CONTENT_EDITOR };

    const track = await createFixtureTrack("next");
    const area = await createFixtureLearningArea("next");
    const unit = await createFixtureUnit("next");
    const stage = await createFixturePedagogyStage("next");
    trackIds.push(track.id);
    learningAreaIds.push(area.id);
    unitIds.push(unit.id);
    pedagogyStageIds.push(stage.id);
    trackId = track.id;

    const concept = await createFixtureConcept("next");
    conceptId = concept.id;
    conceptIds.push(conceptId);

    const lesson1 = await createFixturePublishedLesson("next-1");
    lessonIds.push(lesson1.lesson.id);
    sourceIds.push(lesson1.source.id);
    citationIds.push(lesson1.citation.id);
    lesson1Id = lesson1.lesson.id;

    await linkLessonToKnowledge(editorActor, lesson1Id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });

    await linkStageToLesson(editorActor, stage.id, { lessonId: lesson1Id, order: 0 });
    await linkUnitToStage(editorActor, unit.id, { stageId: stage.id });
    await linkAreaToUnit(editorActor, area.id, { unitId: unit.id });
    await linkTrackToArea(editorActor, track.id, { areaId: area.id });

    await publishStage(adminActor, stage.id);
    await publishUnit(adminActor, unit.id);
    await publishLearningArea(adminActor, area.id);
    await publishTrack(adminActor, track.id);

    // Questão diagnóstica ligada ao mesmo conceito, para o pipeline de ponto de partida.
    const source = await createFixtureSource("next");
    sourceIds.push(source.id);
    const question = await createFixtureMultipleChoiceQuestion("next", source.id, {
      correctIndex: 0,
    });
    diagnosticQuestionId = question.id;
    questionIds.push(diagnosticQuestionId);
    wrongOptionId = question.options.find((o) => !o.isCorrect)!.id;
    await createFixtureQuestionKnowledgeTag(diagnosticQuestionId, "CONCEPT", conceptId);
    await publishQuestion(adminActor, diagnosticQuestionId);
  });

  it("getNextLearningStep encontra a primeira lição AVAILABLE da trilha e devolve o caminho completo", async () => {
    const step = await getNextLearningStep(student(), studentId, { trackId });
    expect(step).not.toBeNull();
    expect(step?.lesson.id).toBe(lesson1Id);
    expect(step?.track.id).toBe(trackId);
    expect(step?.reason.length).toBeGreaterThan(0);
  });

  it("getNextLearningStep sem trackId também encontra a trilha publicada (varredura determinística)", async () => {
    // Não assume que a trilha desta fixture é a ÚNICA publicada no banco —
    // conteúdo acadêmico real e permanente (docs/FASE-CONTEUDO-ACADEMICO.md)
    // coexiste no mesmo banco de dev/CI. Em vez disso, replica o próprio
    // contrato documentado da função ("trilhas publicadas, ordem crescente
    // por id, primeira com lição AVAILABLE") passando cada `trackId`
    // explicitamente — a mesma API pública, só escopada — para descobrir
    // qual resultado é o CORRETO neste banco, e confirma que a varredura
    // sem `trackId` chega exatamente a esse mesmo resultado.
    const publishedTracks = await prisma.track.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    let expected: Awaited<ReturnType<typeof getNextLearningStep>> = null;
    for (const t of publishedTracks) {
      expected = await getNextLearningStep(student(), studentId, { trackId: t.id });
      if (expected) break;
    }
    expect(expected).not.toBeNull();

    const step = await getNextLearningStep(student(), studentId);
    expect(step?.lesson.id).toBe(expected!.lesson.id);
    expect(step?.track.id).toBe(expected!.track.id);
  });

  it("getNextLearningStep devolve null quando a trilha informada não tem próximo passo", async () => {
    const otherTrack = await createFixtureTrack("next-empty");
    trackIds.push(otherTrack.id);
    // Trilha sem nenhuma área vinculada — nunca fica publicável/com sequência.
    const step = await getNextLearningStep(student(), studentId, { trackId: otherTrack.id });
    expect(step).toBeNull();
  });

  it("getStartingPoint: sem diagnóstico respondido, percentage=0 e nenhuma lição de partida", async () => {
    const session = await prisma.studySession.create({
      data: { userId: studentId, mode: "FORMACAO" },
    });
    studySessionIds.push(session.id);
    const result = await getStartingPoint(student(), session.id);
    expect(result.lesson).toBeNull();
    expect(result.reason).toContain("Nenhuma questão respondida");
  });

  it("getStartingPoint: conceito identificado como lacuna leva à lição publicada correspondente", async () => {
    const session = await prisma.studySession.create({
      data: { userId: studentId, mode: "FORMACAO" },
    });
    studySessionIds.push(session.id);
    const attempt = await submitDiagnosticAnswer(student(), {
      sessionId: session.id,
      questionId: diagnosticQuestionId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 100,
    });
    questionAttemptIds.push(attempt.attempt.id);

    const result = await getStartingPoint(student(), session.id);
    expect(result.conceptId).toBe(conceptId);
    expect(result.lesson?.id).toBe(lesson1Id);
    expect(result.pedagogy?.trackIds).toContain(trackId);
  });

  afterAll(async () => {
    await cleanupFixtures({
      questionAttemptIds,
      studySessionIds,
      questionIds,
      citationIds,
      lessonIds,
      pedagogyStageIds,
      unitIds,
      learningAreaIds,
      trackIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
