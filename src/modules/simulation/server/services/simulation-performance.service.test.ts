/**
 * Testes de integração reais de desempenho detalhado e evolução (Módulo 6,
 * seções 13-17, 34): disciplina/conceito/dificuldade/tipo/prova/área
 * pedagógica, e evolução (primeiro/último/melhor/média/tendência).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import {
  getSimulationPerformanceBreakdown,
  getSimulationEvolution,
} from "./simulation-performance.service";
import { createSimulationFromQuestionIds, publishSimulation } from "./simulation.service";
import {
  startSimulation,
  submitSimulationAnswer,
  finishSimulation,
} from "./simulation-attempt.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureDiscipline,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  createFixtureExam,
  createFixtureExamEdition,
  createFixtureTrack,
  createFixtureLearningArea,
  createFixtureUnit,
  createFixturePedagogyStage,
  createFixtureLesson,
  cleanupFixtures,
} from "@/test/fixtures";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import { linkTrackToArea } from "@/modules/pedagogy/server/services/track.service";
import { linkAreaToUnit } from "@/modules/pedagogy/server/services/learning-area.service";
import { linkUnitToStage } from "@/modules/pedagogy/server/services/unit.service";
import { linkStageToLesson } from "@/modules/pedagogy/server/services/stage.service";
import { linkLessonToKnowledge } from "@/modules/pedagogy/server/services/lesson.service";

describe("Simulation performance service", () => {
  let studentId: string;
  let otherStudentId: string;
  let adminId: string;
  let sourceId: string;
  let conceptAId: string;
  let conceptBId: string;
  let disciplineAId: string;
  let disciplineBId: string;
  let questionAId: string;
  let questionBId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const disciplineIds: string[] = [];
  const questionIds: string[] = [];
  const simulationIds: string[] = [];
  const examIds: string[] = [];
  const examEditionIds: string[] = [];
  const trackIds: string[] = [];
  const learningAreaIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const lessonIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("perf-sim-student", Role.STUDENT);
    const other = await createFixtureUser("perf-sim-other", Role.STUDENT);
    const admin = await createFixtureUser("perf-sim-admin", Role.ADMIN);
    const source = await createFixtureSource("perf-sim");
    const conceptA = await createFixtureConcept("perf-sim-a");
    const conceptB = await createFixtureConcept("perf-sim-b");
    const disciplineA = await createFixtureDiscipline("perf-sim-a");
    const disciplineB = await createFixtureDiscipline("perf-sim-b");
    const exam = await createFixtureExam("perf-sim");
    const edition = await createFixtureExamEdition("perf-sim", exam.id);

    const qA = await createFixtureMultipleChoiceQuestion("perf-sim-a", source.id, {
      correctIndex: 0,
      difficulty: "INICIANTE",
      examEditionId: edition.id,
    });
    const qB = await createFixtureMultipleChoiceQuestion("perf-sim-b", source.id, {
      correctIndex: 0,
      difficulty: "AVANCADO",
    });

    studentId = student.id;
    otherStudentId = other.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptAId = conceptA.id;
    conceptBId = conceptB.id;
    disciplineAId = disciplineA.id;
    disciplineBId = disciplineB.id;
    questionAId = qA.id;
    questionBId = qB.id;

    userIds.push(studentId, otherStudentId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptAId, conceptBId);
    disciplineIds.push(disciplineAId, disciplineBId);
    examIds.push(exam.id);
    examEditionIds.push(edition.id);
    questionIds.push(questionAId, questionBId);

    await createFixtureQuestionKnowledgeTag(questionAId, "CONCEPT", conceptAId);
    await createFixtureQuestionKnowledgeTag(questionAId, "DISCIPLINE", disciplineAId);
    await createFixtureQuestionKnowledgeTag(questionBId, "CONCEPT", conceptBId);
    await createFixtureQuestionKnowledgeTag(questionBId, "DISCIPLINE", disciplineBId);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, questionAId);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, questionBId);

    // Cadeia pedagógica completa até conceptA, para o bucket "byPedagogyTrack".
    const track = await createFixtureTrack("perf-sim");
    const area = await createFixtureLearningArea("perf-sim");
    const unit = await createFixtureUnit("perf-sim");
    const stage = await createFixturePedagogyStage("perf-sim");
    const lesson = await createFixtureLesson("perf-sim");
    trackIds.push(track.id);
    learningAreaIds.push(area.id);
    unitIds.push(unit.id);
    pedagogyStageIds.push(stage.id);
    lessonIds.push(lesson.id);

    const editorActor = { userId: adminId, role: Role.ADMIN };
    await linkLessonToKnowledge(editorActor, lesson.id, {
      entityType: "CONCEPT",
      entityId: conceptAId,
    });
    await linkStageToLesson(editorActor, stage.id, { lessonId: lesson.id });
    await linkUnitToStage(editorActor, unit.id, { stageId: stage.id });
    await linkAreaToUnit(editorActor, area.id, { unitId: unit.id });
    await linkTrackToArea(editorActor, track.id, { areaId: area.id });
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  async function runSimulation(title: string, correctA: boolean, correctB: boolean) {
    const simulation = await createSimulationFromQuestionIds(
      { userId: adminId, role: Role.ADMIN },
      { title, questionIds: [questionAId, questionBId] },
    );
    simulationIds.push(simulation.id);
    await publishSimulation({ userId: adminId, role: Role.ADMIN }, simulation.id);
    const { attemptId } = await startSimulation(student(), simulation.id);

    const optionA = await prisma.questionOption.findFirstOrThrow({
      where: { questionId: questionAId, isCorrect: correctA },
    });
    const optionB = await prisma.questionOption.findFirstOrThrow({
      where: { questionId: questionBId, isCorrect: correctB },
    });
    await submitSimulationAnswer(student(), {
      attemptId,
      questionId: questionAId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: optionA.id },
      timeSpentMs: 100,
    });
    await submitSimulationAnswer(student(), {
      attemptId,
      questionId: questionBId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: optionB.id },
      timeSpentMs: 100,
    });
    return finishSimulation(student(), attemptId).then(() => attemptId);
  }

  it("breakdown por disciplina/conceito/dificuldade/tipo/prova/área pedagógica", async () => {
    const attemptId = await runSimulation("TEST_FIXTURE_sim_perf_breakdown", true, false);

    const breakdown = await getSimulationPerformanceBreakdown(student(), attemptId);
    expect(breakdown.totalAnswered).toBe(2);
    expect(breakdown.correctCount).toBe(1);
    expect(breakdown.byConcept[conceptAId].accuracyPercentage).toBe(100);
    expect(breakdown.byConcept[conceptBId].accuracyPercentage).toBe(0);
    expect(breakdown.byDiscipline[disciplineAId].correct).toBe(1);
    expect(breakdown.byDiscipline[disciplineBId].correct).toBe(0);
    expect(breakdown.byDifficulty.INICIANTE.correct).toBe(1);
    expect(breakdown.byDifficulty.AVANCADO.correct).toBe(0);
    expect(breakdown.byType.MULTIPLE_CHOICE.total).toBe(2);

    const examEditionKeys = Object.keys(breakdown.byExamEdition);
    expect(examEditionKeys.length).toBeGreaterThan(0); // Q1 tem prova, Q2 não ("SEM_PROVA")
    expect(breakdown.byExamEdition.SEM_PROVA).toBeDefined();

    expect(breakdown.byPedagogyTrack[trackIds[0]]).toBeDefined();
    expect(breakdown.byPedagogyTrack[trackIds[0]].total).toBe(1); // só a questão A alcança essa trilha
  });

  it("privacidade: outro aluno não pode ver o breakdown alheio", async () => {
    const attemptId = await runSimulation("TEST_FIXTURE_sim_perf_privacy", true, true);
    await expect(getSimulationPerformanceBreakdown(other(), attemptId)).rejects.toThrow(
      AuthorizationError,
    );
  });

  it("evolução: primeiro/último/melhor/média/tendência a partir de múltiplos simulados finalizados", async () => {
    // três simulados em sequência: 0% -> 50% -> 100% (tendência de melhora clara)
    await runSimulation("TEST_FIXTURE_sim_evo_1", false, false);
    await runSimulation("TEST_FIXTURE_sim_evo_2", true, false);
    await runSimulation("TEST_FIXTURE_sim_evo_3", true, true);

    const evolution = await getSimulationEvolution(student());
    expect(evolution.history.length).toBeGreaterThanOrEqual(3);
    expect(evolution.first).toBe(evolution.history[0].percentage);
    expect(evolution.last).toBe(evolution.history[evolution.history.length - 1].percentage);
    expect(evolution.best).toBe(Math.max(...evolution.history.map((h) => h.percentage)));
    expect(evolution.average).toBeGreaterThanOrEqual(0);
    expect(evolution.trend).toBe("MELHORANDO");
  });

  it("evolução: sem nenhum simulado finalizado, devolve SEM_DADOS sem erro", async () => {
    const evolution = await getSimulationEvolution(other());
    expect(evolution.history).toEqual([]);
    expect(evolution.trend).toBe("SEM_DADOS");
    expect(evolution.first).toBeNull();
  });

  afterAll(async () => {
    // `finishSimulation` alimenta o Módulo 5 (`ensureReviewItem`) para
    // questões erradas — os ReviewItem resultantes nascem dinamicamente
    // (não rastreados 1 a 1 pelo teste), então são coletados aqui antes da
    // limpeza para não deixar linha órfã referenciando as Questions apagadas.
    const dynamicReviewItems = await prisma.reviewItem.findMany({
      where: { userId: { in: [studentId, otherStudentId] } },
      select: { id: true },
    });
    await cleanupFixtures({
      simulationIds,
      reviewItemIds: dynamicReviewItems.map((r) => r.id),
      lessonIds,
      pedagogyStageIds,
      unitIds,
      learningAreaIds,
      trackIds,
      examEditionIds,
      examIds,
      questionIds,
      conceptIds,
      disciplineIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
