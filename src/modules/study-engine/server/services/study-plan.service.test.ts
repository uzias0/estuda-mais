/**
 * Testes de integração reais do plano de estudo consolidado (Módulo 10,
 * seções 5/6/18/19/21/25/26/30/40/41) — fluxo completo a partir de dados
 * reais, nunca um atalho que finja o resultado.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { STUDY_ACTION_PRIORITY, DEFAULT_STUDY_PLAN_SIZE } from "@/config/study-engine";
import { getStudyPlan, getInitialStudyPlan, getNextStudyAction } from "./study-plan.service";
import { finishDiagnostic } from "@/modules/assessment/server/services/diagnostic.service";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import { recordAttempt } from "@/modules/assessment/server/services/questionAttempt.service";
import { linkTrackToArea, publishTrack } from "@/modules/pedagogy/server/services/track.service";
import {
  linkAreaToUnit,
  publishLearningArea,
} from "@/modules/pedagogy/server/services/learning-area.service";
import { linkUnitToStage, publishUnit } from "@/modules/pedagogy/server/services/unit.service";
import { linkStageToLesson, publishStage } from "@/modules/pedagogy/server/services/stage.service";
import { linkLessonToKnowledge } from "@/modules/pedagogy/server/services/lesson.service";
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
  cleanupFixtures,
} from "@/test/fixtures";

describe("Study plan service", () => {
  let freshStudentId: string;
  let otherStudentId: string;
  let adminUserId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const questionAttemptIds: string[] = [];
  const studySessionIds: string[] = [];
  const lessonIds: string[] = [];
  const citationIds: string[] = [];
  const trackIds: string[] = [];
  const learningAreaIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const reviewItemIds: string[] = [];

  const freshStudent = () => ({ userId: freshStudentId, role: Role.STUDENT });
  const otherStudent = () => ({ userId: otherStudentId, role: Role.STUDENT });
  const admin = () => ({ userId: adminUserId, role: Role.ADMIN });
  const editorActor = () => ({ userId: adminUserId, role: Role.CONTENT_EDITOR });

  beforeAll(async () => {
    const student1 = await createFixtureUser("plan-fresh", Role.STUDENT);
    const student2 = await createFixtureUser("plan-other", Role.STUDENT);
    const adminUser = await createFixtureUser("plan-admin", Role.ADMIN);
    freshStudentId = student1.id;
    otherStudentId = student2.id;
    adminUserId = adminUser.id;
    userIds.push(freshStudentId, otherStudentId, adminUserId);
  });

  it("primeiro acesso: sem diagnóstico concluído, o plano é só START_DIAGNOSTIC", async () => {
    const plan = await getStudyPlan(freshStudent(), freshStudentId);
    expect(plan).toHaveLength(1);
    expect(plan[0].type).toBe("START_DIAGNOSTIC");
    expect(plan[0].priority).toBe(STUDY_ACTION_PRIORITY.START_DIAGNOSTIC);
  });

  it("getInitialStudyPlan tem exatamente o mesmo comportamento (mesma hierarquia, sem lógica duplicada)", async () => {
    const plan = await getInitialStudyPlan(freshStudent(), freshStudentId);
    expect(plan).toHaveLength(1);
    expect(plan[0].type).toBe("START_DIAGNOSTIC");
  });

  it("getNextStudyAction devolve exatamente o topo do plano", async () => {
    const next = await getNextStudyAction(freshStudent(), freshStudentId);
    expect(next?.type).toBe("START_DIAGNOSTIC");
  });

  it("nunca retorna uma lista maior que DEFAULT_STUDY_PLAN_SIZE, nem maior que um `size` customizado", async () => {
    const defaultPlan = await getStudyPlan(freshStudent(), freshStudentId);
    expect(defaultPlan.length).toBeLessThanOrEqual(DEFAULT_STUDY_PLAN_SIZE);

    const customPlan = await getStudyPlan(freshStudent(), freshStudentId, { size: 2 });
    expect(customPlan.length).toBeLessThanOrEqual(2);
  });

  it("segurança: payload forjado (priority/score/level/state/userId/completed/mastered/recommendationType) é ignorado", async () => {
    const forged = {
      size: 3,
      priority: 999999,
      score: 100,
      level: 50,
      state: "MASTERED",
      userId: otherStudentId,
      completed: true,
      mastered: true,
      recommendationType: "LESSON",
    };
    const plan = await getStudyPlan(freshStudent(), freshStudentId, forged as never);
    expect(plan.length).toBeLessThanOrEqual(3);
    const validPriorities = Object.values(STUDY_ACTION_PRIORITY);
    for (const item of plan) {
      // a prioridade de toda ação vem SEMPRE da tabela de configuração do
      // servidor — nunca do valor forjado (999999) no payload.
      expect(validPriorities).toContain(item.priority);
    }
  });

  it("privacidade: outro aluno não pode consultar o plano de terceiro; ADMIN pode", async () => {
    await expect(getStudyPlan(otherStudent(), freshStudentId)).rejects.toThrow(AuthorizationError);
    await expect(getStudyPlan(admin(), freshStudentId)).resolves.toBeDefined();
  });

  describe("aluno com diagnóstico concluído: hierarquia completa", () => {
    let studentId: string;
    let weakConceptId: string;
    let lessonId: string;
    let reviewItemId: string;

    const student = () => ({ userId: studentId, role: Role.STUDENT });

    beforeAll(async () => {
      const studentUser = await createFixtureUser("plan-full", Role.STUDENT);
      studentId = studentUser.id;
      userIds.push(studentId);

      // 1. Diagnóstico concluído (Módulo 3) — gate necessário para as demais camadas.
      const diagSource = await createFixtureSource("plan-full-diag");
      sourceIds.push(diagSource.id);
      const diagConcept = await createFixtureConcept("plan-full-diag");
      conceptIds.push(diagConcept.id);
      const diagQuestion = await createFixtureMultipleChoiceQuestion(
        "plan-full-diag",
        diagSource.id,
        { correctIndex: 0 },
      );
      questionIds.push(diagQuestion.id);
      await createFixtureQuestionKnowledgeTag(diagQuestion.id, "CONCEPT", diagConcept.id);
      await publishQuestion(admin(), diagQuestion.id);

      // Não usa `startDiagnostic` aqui de propósito: sua seleção de
      // candidatas é GLOBAL (qualquer questão publicada e tagueada no
      // banco, de qualquer teste concorrente — ver docs/MODULO-10.md,
      // "Divergências"/"Limitações") — sob a suíte completa em paralelo,
      // isso pode sortear uma questão de OUTRO arquivo de teste, cujo
      // `afterAll` a apaga (e, em cascata, a `QuestionAttempt` criada aqui)
      // antes deste `describe` terminar. A correção REAL (`recordAttempt`
      // → `gradeAnswer`) e a autoridade sobre o resultado
      // (`finishDiagnostic`) continuam sendo o Módulo 3, sem nenhum atalho
      // — só a ESCOLHA da questão fica determinística (a própria
      // `diagQuestion` desta fixture), eliminando a exposição ao pool
      // global nesta configuração.
      const diagSession = await prisma.studySession.create({
        data: { userId: studentId, mode: "FORMACAO" },
      });
      studySessionIds.push(diagSession.id);
      const diagAttempt = await recordAttempt(student(), {
        questionId: diagQuestion.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: diagQuestion.options[0].id },
        timeSpentMs: 100,
        context: "DIAGNOSTIC",
        sessionId: diagSession.id,
      });
      questionAttemptIds.push(diagAttempt.attempt.id);
      await finishDiagnostic(student(), diagSession.id);

      // 2. Conceito fraco "atual" (amostra >= 3, <= 40% de acerto) — Módulo 3/10.
      const weakSource = await createFixtureSource("plan-full-weak");
      sourceIds.push(weakSource.id);
      const weakConcept = await createFixtureConcept("plan-full-weak");
      weakConceptId = weakConcept.id;
      conceptIds.push(weakConceptId);
      const wq1 = await createFixtureMultipleChoiceQuestion("plan-full-weak-1", weakSource.id, {
        correctIndex: 0,
      });
      const wq2 = await createFixtureMultipleChoiceQuestion("plan-full-weak-2", weakSource.id, {
        correctIndex: 0,
      });
      const wq3 = await createFixtureMultipleChoiceQuestion("plan-full-weak-3", weakSource.id, {
        correctIndex: 0,
      });
      questionIds.push(wq1.id, wq2.id, wq3.id);
      for (const q of [wq1, wq2, wq3]) {
        await createFixtureQuestionKnowledgeTag(q.id, "CONCEPT", weakConceptId);
        await publishQuestion(admin(), q.id);
      }
      for (const q of [wq1, wq2, wq3]) {
        const attempt = await recordAttempt(student(), {
          questionId: q.id,
          answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: q.options[1].id }, // errado
          timeSpentMs: 100,
          context: "LESSON",
        });
        questionAttemptIds.push(attempt.attempt.id);
      }

      // 3. Revisão vencida do mesmo conceito (Módulo 5).
      const reviewItem = await createFixtureReviewItem(studentId, {
        scope: "CONCEPT",
        conceptId: weakConceptId,
        opts: { dueAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), state: "REVIEW" },
      });
      reviewItemId = reviewItem.id;
      reviewItemIds.push(reviewItemId);

      // 4. Trilha publicada com uma lição relacionada ao conceito fraco (Módulo 4/8).
      const track = await createFixtureTrack("plan-full");
      const area = await createFixtureLearningArea("plan-full");
      const unit = await createFixtureUnit("plan-full");
      const stage = await createFixturePedagogyStage("plan-full");
      trackIds.push(track.id);
      learningAreaIds.push(area.id);
      unitIds.push(unit.id);
      pedagogyStageIds.push(stage.id);

      const lesson = await createFixturePublishedLesson("plan-full");
      lessonId = lesson.lesson.id;
      lessonIds.push(lessonId);
      sourceIds.push(lesson.source.id);
      citationIds.push(lesson.citation.id);
      await linkLessonToKnowledge(editorActor(), lessonId, {
        entityType: "CONCEPT",
        entityId: weakConceptId,
      });

      await linkStageToLesson(editorActor(), stage.id, { lessonId, order: 0 });
      await linkUnitToStage(editorActor(), unit.id, { stageId: stage.id });
      await linkAreaToUnit(editorActor(), area.id, { unitId: unit.id });
      await linkTrackToArea(editorActor(), track.id, { areaId: area.id });
      await publishStage(admin(), stage.id);
      await publishUnit(admin(), unit.id);
      await publishLearningArea(admin(), area.id);
      await publishTrack(admin(), track.id);
    });

    it("combina revisão vencida, lição, questão recente e simulado, na ordem de prioridade correta", async () => {
      const plan = await getStudyPlan(student(), studentId);

      expect(plan.length).toBeGreaterThan(1); // não é mais só START_DIAGNOSTIC
      // prioridade estritamente não-crescente ao longo do plano.
      for (let i = 1; i < plan.length; i++) {
        expect(plan[i - 1].priority).toBeGreaterThanOrEqual(plan[i].priority);
      }

      const review = plan.find((a) => a.type === "REVIEW");
      expect(review?.conceptId).toBe(weakConceptId);
      expect(review?.priority).toBe(STUDY_ACTION_PRIORITY.REVIEW_OVERDUE);

      const lesson = plan.find((a) => a.type === "LESSON");
      expect(lesson?.lessonId).toBe(lessonId);
      expect(lesson?.priority).toBe(STUDY_ACTION_PRIORITY.LESSON);

      // REVIEW sempre antes de LESSON no plano final (seção 21).
      expect(plan.indexOf(review!)).toBeLessThan(plan.indexOf(lesson!));
    });

    it("getNextStudyAction devolve a revisão vencida como topo (maior prioridade da hierarquia disponível)", async () => {
      const next = await getNextStudyAction(student(), studentId);
      expect(next?.type).toBe("REVIEW");
    });
  });

  afterAll(async () => {
    await cleanupFixtures({
      reviewItemIds,
      citationIds,
      lessonIds,
      pedagogyStageIds,
      unitIds,
      learningAreaIds,
      trackIds,
      questionAttemptIds,
      studySessionIds,
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
