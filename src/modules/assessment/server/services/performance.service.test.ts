/**
 * Testes de integração reais — `computePerformance` (Módulo 3, seção 20).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { computePerformance } from "./performance.service";
import { recordAttempt } from "./questionAttempt.service";
import { linkQuestionToKnowledge, publishQuestion } from "./question.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  cleanupFixtures,
} from "@/test/fixtures";

describe("computePerformance", () => {
  let studentId: string;
  let editorId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  const questionIds: string[] = [];
  const conceptIds: string[] = [];
  const sourceIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("perf-student", Role.STUDENT);
    const editor = await createFixtureUser("perf-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("perf-admin", Role.ADMIN);
    const source = await createFixtureSource("perf");
    const concept = await createFixtureConcept("perf");
    studentId = student.id;
    editorId = editor.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptId = concept.id;
    userIds.push(studentId, editorId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);

    const q1 = await createFixtureMultipleChoiceQuestion("perf-1", sourceId, {
      difficulty: "BASICO",
      correctIndex: 0,
    });
    const q2 = await createFixtureMultipleChoiceQuestion("perf-2", sourceId, {
      difficulty: "AVANCADO",
      correctIndex: 0,
    });
    questionIds.push(q1.id, q2.id);
    await linkQuestionToKnowledge({ userId: editorId, role: Role.CONTENT_EDITOR }, q1.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, q1.id);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, q2.id);

    const correctQ1 = q1.options.find((o) => o.isCorrect)!.id;
    const wrongQ1 = q1.options.find((o) => !o.isCorrect)!.id;
    const wrongQ2 = q2.options.find((o) => !o.isCorrect)!.id;

    await recordAttempt(
      { userId: studentId, role: Role.STUDENT },
      {
        questionId: q1.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctQ1 },
        timeSpentMs: 1000,
        context: "LESSON",
      },
    );
    await recordAttempt(
      { userId: studentId, role: Role.STUDENT },
      {
        questionId: q1.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongQ1 },
        timeSpentMs: 2000,
        context: "REVIEW",
      },
    );
    await recordAttempt(
      { userId: studentId, role: Role.STUDENT },
      {
        questionId: q2.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongQ2 },
        timeSpentMs: 3000,
        context: "LESSON",
      },
    );
  });

  it("calcula totais, taxa de acerto e tempo médio", async () => {
    const report = await computePerformance(studentId);
    expect(report.totalAnswered).toBe(3);
    expect(report.correctCount).toBe(1);
    expect(report.incorrectCount).toBe(2);
    expect(report.accuracyPercentage).toBeCloseTo(33.33, 1);
    expect(report.averageTimeMs).toBeCloseTo(2000, 5);
  });

  it("calcula desempenho por dificuldade e por tipo", async () => {
    const report = await computePerformance(studentId);
    expect(report.byDifficulty.BASICO.total).toBe(2);
    expect(report.byDifficulty.BASICO.correct).toBe(1);
    expect(report.byDifficulty.AVANCADO.total).toBe(1);
    expect(report.byType.MULTIPLE_CHOICE.total).toBe(3);
  });

  it("calcula desempenho por conceito", async () => {
    const report = await computePerformance(studentId);
    expect(report.byConcept[conceptId].total).toBe(2);
    expect(report.byConcept[conceptId].correct).toBe(1);
  });

  it("filtra por contexto", async () => {
    const lessonOnly = await computePerformance(studentId, { context: "LESSON" });
    expect(lessonOnly.totalAnswered).toBe(2);
  });

  afterAll(async () => {
    await cleanupFixtures({ questionIds, conceptIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
