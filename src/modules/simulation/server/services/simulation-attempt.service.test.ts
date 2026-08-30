/**
 * Testes de integração reais da execução do simulado (Módulo 6, seções 11,
 * 30, 32, 33, 34): iniciar, responder, responder de novo, questão
 * inexistente/de outro simulado, usuário errado, campos forjados
 * (isCorrect/score/percentage/userId), idempotência de finalização, e
 * integração com o Módulo 5 (erro → ReviewItem).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { SimulationValidationError } from "./errors";
import { buildSimulation } from "./simulation-builder.service";
import {
  startSimulation,
  submitSimulationAnswer,
  finishSimulation,
} from "./simulation-attempt.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";

describe("Simulation attempt service", () => {
  let studentId: string;
  let otherStudentId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let correctOptionId: string;
  let wrongOptionId: string;
  let questionAId: string;
  let questionBId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const simulationIds: string[] = [];
  const reviewItemIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("attempt-student", Role.STUDENT);
    const other = await createFixtureUser("attempt-other", Role.STUDENT);
    const admin = await createFixtureUser("attempt-admin", Role.ADMIN);
    const source = await createFixtureSource("attempt");
    const concept = await createFixtureConcept("attempt");
    const qA = await createFixtureMultipleChoiceQuestion("attempt-a", source.id, {
      correctIndex: 0,
    });
    const qB = await createFixtureMultipleChoiceQuestion("attempt-b", source.id, {
      correctIndex: 0,
    });

    studentId = student.id;
    otherStudentId = other.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptId = concept.id;
    questionAId = qA.id;
    questionBId = qB.id;
    correctOptionId = qA.options.find((o) => o.isCorrect)!.id;
    wrongOptionId = qA.options.find((o) => !o.isCorrect)!.id;

    userIds.push(studentId, otherStudentId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    questionIds.push(questionAId, questionBId);

    await createFixtureQuestionKnowledgeTag(questionAId, "CONCEPT", conceptId);
    await createFixtureQuestionKnowledgeTag(questionBId, "CONCEPT", conceptId);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, questionAId);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, questionBId);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  async function makeSimulation(count = 2) {
    const { simulation } = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_attempt",
      filters: { count, conceptId },
    });
    simulationIds.push(simulation.id);
    return simulation;
  }

  it("startSimulation devolve a composição pública, sem gabarito", async () => {
    const simulation = await makeSimulation();
    const { attemptId, questions } = await startSimulation(student(), simulation.id);
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect((q as unknown as Record<string, unknown>).isCorrect).toBeUndefined();
      expect((q as unknown as Record<string, unknown>).answerKey).toBeUndefined();
    }
    // attempt criada pertence ao aluno
    const attempt = await prisma.simulationAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(attempt.userId).toBe(studentId);
    expect(attempt.totalCount).toBe(questions.length);
  });

  it("submitSimulationAnswer corrige no servidor (acerto e erro)", async () => {
    const simulation = await makeSimulation();
    const { attemptId } = await startSimulation(student(), simulation.id);

    const correct = await submitSimulationAnswer(student(), {
      attemptId,
      questionId: questionAId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 100,
    });
    expect(correct.isCorrect).toBe(true);

    const wrongOptionForB = await prisma.questionOption.findFirstOrThrow({
      where: { questionId: questionBId, isCorrect: false },
    });
    const wrong = await submitSimulationAnswer(student(), {
      attemptId,
      questionId: questionBId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionForB.id },
      timeSpentMs: 100,
    });
    expect(wrong.isCorrect).toBe(false);
  });

  it("rejeita responder a mesma questão duas vezes na mesma tentativa", async () => {
    const simulation = await makeSimulation();
    const { attemptId } = await startSimulation(student(), simulation.id);

    await submitSimulationAnswer(student(), {
      attemptId,
      questionId: questionAId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 100,
    });

    await expect(
      submitSimulationAnswer(student(), {
        attemptId,
        questionId: questionAId,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 100,
      }),
    ).rejects.toThrow(SimulationValidationError);
  });

  it("rejeita questão que não pertence a este simulado", async () => {
    const outsider = await createFixtureMultipleChoiceQuestion("attempt-outsider", sourceId);
    questionIds.push(outsider.id);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, outsider.id);

    const simulation = await makeSimulation();
    const { attemptId } = await startSimulation(student(), simulation.id);

    await expect(
      submitSimulationAnswer(student(), {
        attemptId,
        questionId: outsider.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: outsider.options[0].id },
        timeSpentMs: 100,
      }),
    ).rejects.toThrow(SimulationValidationError);
  });

  it("privacidade: outro aluno não pode responder/finalizar uma tentativa alheia", async () => {
    const simulation = await makeSimulation();
    const { attemptId } = await startSimulation(student(), simulation.id);

    await expect(
      submitSimulationAnswer(other(), {
        attemptId,
        questionId: questionAId,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 100,
      }),
    ).rejects.toThrow(AuthorizationError);

    await expect(finishSimulation(other(), attemptId)).rejects.toThrow(AuthorizationError);
  });

  it("segurança: isCorrect/score/percentage/userId forjados no payload são ignorados", async () => {
    const simulation = await makeSimulation();
    const { attemptId } = await startSimulation(student(), simulation.id);

    const forged = {
      attemptId,
      questionId: questionAId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 100,
      isCorrect: true,
      score: 100,
      percentage: 100,
      finalResult: "PASSED",
      userId: otherStudentId,
    };

    const result = await submitSimulationAnswer(student(), forged as never);
    expect(result.isCorrect).toBe(false); // resposta era errada de verdade

    const attempt = await prisma.simulationAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(attempt.userId).toBe(studentId); // não sequestrado

    const finished = await finishSimulation(student(), attemptId);
    expect(finished.percentage).toBeLessThan(100); // não aceitou o score:100 forjado
  });

  it("finishSimulation é idempotente e integra com a revisão espaçada (erro → ReviewItem)", async () => {
    const simulation = await makeSimulation();
    const { attemptId } = await startSimulation(student(), simulation.id);

    await submitSimulationAnswer(student(), {
      attemptId,
      questionId: questionAId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 100,
    });

    const first = await finishSimulation(student(), attemptId);
    const second = await finishSimulation(student(), attemptId);
    expect(second).toEqual(first);

    const reviewItem = await prisma.reviewItem.findFirst({
      where: { userId: studentId, scope: "QUESTION", questionId: questionAId },
    });
    expect(reviewItem).not.toBeNull();
    if (reviewItem) reviewItemIds.push(reviewItem.id);

    // idempotente: não duplica o ReviewItem numa segunda finalização
    const count = await prisma.reviewItem.count({
      where: { userId: studentId, scope: "QUESTION", questionId: questionAId },
    });
    expect(count).toBe(1);
  });

  it("resultado 0% e 100%", async () => {
    // count=1 seleciona (deterministicamente) UMA das duas questões do pool
    // — não se assume qual; a resposta usa sempre a questão que `startSimulation`
    // efetivamente devolveu, nunca `questionAId` fixo.
    const allWrong = await makeSimulation(1);
    const { attemptId: attemptWrong, questions: wrongQuestions } = await startSimulation(
      student(),
      allWrong.id,
    );
    const wrongTarget = wrongQuestions[0];
    const wrongOption = await prisma.questionOption.findFirstOrThrow({
      where: { questionId: wrongTarget.id, isCorrect: false },
    });
    await submitSimulationAnswer(student(), {
      attemptId: attemptWrong,
      questionId: wrongTarget.id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOption.id },
      timeSpentMs: 100,
    });
    const zeroResult = await finishSimulation(student(), attemptWrong);
    expect(zeroResult.percentage).toBe(0);

    const allRight = await makeSimulation(1);
    const { attemptId: attemptRight, questions: rightQuestions } = await startSimulation(
      student(),
      allRight.id,
    );
    const rightTarget = rightQuestions[0];
    const rightOption = await prisma.questionOption.findFirstOrThrow({
      where: { questionId: rightTarget.id, isCorrect: true },
    });
    await submitSimulationAnswer(student(), {
      attemptId: attemptRight,
      questionId: rightTarget.id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: rightOption.id },
      timeSpentMs: 100,
    });
    const fullResult = await finishSimulation(student(), attemptRight);
    expect(fullResult.percentage).toBe(100);
  });

  afterAll(async () => {
    // Vários testes acima respondem errado e chamam `finishSimulation`, que
    // alimenta o Módulo 5 (`ensureReviewItem`) — coleta TODOS os ReviewItem
    // do aluno aqui (em vez de confiar só em `reviewItemIds` rastreado
    // manualmente) para nunca deixar linha órfã na limpeza.
    const dynamicReviewItems = await prisma.reviewItem.findMany({
      where: { userId: { in: [studentId, otherStudentId] } },
      select: { id: true },
    });
    await cleanupFixtures({
      simulationIds,
      reviewItemIds: [...new Set([...reviewItemIds, ...dynamicReviewItems.map((r) => r.id)])],
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
