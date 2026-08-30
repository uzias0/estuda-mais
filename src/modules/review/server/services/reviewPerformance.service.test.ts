/**
 * Testes de integração reais de `getReviewPerformance` (Módulo 5, seção 23).
 * Só camada de domínio/consulta — sem dashboard.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { getReviewPerformance } from "./reviewPerformance.service";
import { ensureReviewItem } from "./reviewItem.service";
import { submitReviewAnswer } from "./reviewSession.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";

describe("Review performance service", () => {
  let studentId: string;
  let otherStudentId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let questionId: string;
  let correctOptionId: string;
  let wrongOptionId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const reviewItemIds: string[] = [];
  const studySessionIds: string[] = [];
  const questionAttemptIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("perf-student", Role.STUDENT);
    const other = await createFixtureUser("perf-other", Role.STUDENT);
    const admin = await createFixtureUser("perf-admin", Role.ADMIN);
    const source = await createFixtureSource("perf");
    const concept = await createFixtureConcept("perf");
    const question = await createFixtureMultipleChoiceQuestion("perf", source.id, {
      correctIndex: 0,
    });

    studentId = student.id;
    otherStudentId = other.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptId = concept.id;
    questionId = question.id;
    correctOptionId = question.options.find((o) => o.isCorrect)!.id;
    wrongOptionId = question.options.find((o) => !o.isCorrect)!.id;

    userIds.push(studentId, otherStudentId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    questionIds.push(questionId);

    await createFixtureQuestionKnowledgeTag(questionId, "CONCEPT", conceptId);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, questionId);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("consolida acertos/erros a partir do histórico real de ReviewLog", async () => {
    const itemQuestion = await ensureReviewItem(student(), { scope: "QUESTION", questionId });
    reviewItemIds.push(itemQuestion.id);
    const itemConcept = await ensureReviewItem(student(), { scope: "CONCEPT", conceptId });
    reviewItemIds.push(itemConcept.id);

    const s1 = await prisma.studySession.create({ data: { userId: studentId, mode: "REVISAO" } });
    studySessionIds.push(s1.id);
    await submitReviewAnswer(student(), {
      sessionId: s1.id,
      reviewItemId: itemQuestion.id,
      questionId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 100,
    });

    const s2 = await prisma.studySession.create({ data: { userId: studentId, mode: "REVISAO" } });
    studySessionIds.push(s2.id);
    await submitReviewAnswer(student(), {
      sessionId: s2.id,
      reviewItemId: itemConcept.id,
      questionId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 100,
    });

    const attempts = await prisma.questionAttempt.findMany({
      where: { userId: studentId, context: "REVIEW" },
    });
    questionAttemptIds.push(...attempts.map((a) => a.id));

    const report = await getReviewPerformance(student());
    expect(report.totalReviews).toBe(2);
    expect(report.correctCount).toBe(1);
    expect(report.incorrectCount).toBe(1);
    expect(report.accuracyPercentage).toBe(50);
    expect(report.pendingCount).toBeGreaterThan(0);
    expect(report.weakestConcepts.some((c) => c.conceptId === conceptId)).toBe(true);
  });

  it("privacidade: outro aluno não pode consultar o desempenho alheio", async () => {
    await expect(getReviewPerformance(other(), studentId)).rejects.toThrow(AuthorizationError);
  });

  it("ADMIN pode consultar o desempenho de qualquer aluno", async () => {
    const report = await getReviewPerformance(admin(), studentId);
    expect(report.totalReviews).toBeGreaterThanOrEqual(0);
  });

  it("aluno sem nenhum histórico tem relatório zerado, sem erro", async () => {
    const report = await getReviewPerformance(other());
    expect(report.totalReviews).toBe(0);
    expect(report.accuracyPercentage).toBe(0);
    expect(report.weakestConcepts).toEqual([]);
  });

  afterAll(async () => {
    await cleanupFixtures({
      reviewItemIds,
      studySessionIds,
      questionAttemptIds,
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
