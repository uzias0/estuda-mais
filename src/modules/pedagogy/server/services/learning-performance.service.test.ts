/**
 * Testes de integração reais da evolução do estudante (Módulo 8, seção 32) —
 * só agrega dado real (`LessonProgress` + `computePerformance`), nada
 * inventado.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { startLesson, submitLessonActivity, completeLesson } from "./lesson-execution.service";
import { getStudentLearningOverview } from "./learning-performance.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  createFixturePublishedLesson,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Learning performance service (evolução do estudante)", () => {
  let studentId: string;
  let otherStudentId: string;
  let conceptId: string;
  let questionId: string;
  let correctOptionId: string;
  let lessonId: string;
  let lessonBlockId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const lessonIds: string[] = [];
  const citationIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("perf-student", Role.STUDENT);
    const otherUser = await createFixtureUser("perf-other", Role.STUDENT);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId);

    const source = await createFixtureSource("perf");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("perf");
    conceptId = concept.id;
    conceptIds.push(conceptId);

    const question = await createFixtureMultipleChoiceQuestion("perf", source.id, {
      correctIndex: 0,
    });
    questionId = question.id;
    questionIds.push(questionId);
    correctOptionId = question.options.find((o) => o.isCorrect)!.id;
    await createFixtureQuestionKnowledgeTag(questionId, "CONCEPT", conceptId);

    const lesson = await createFixturePublishedLesson("perf", {
      blocks: [{ type: "QUESTION", questionId }],
    });
    lessonId = lesson.lesson.id;
    lessonBlockId = lesson.blocks[0].id;
    lessonIds.push(lessonId);
    sourceIds.push(lesson.source.id);
    citationIds.push(lesson.citation.id);
  });

  it("sem nenhuma lição iniciada: tudo zerado", async () => {
    const overview = await getStudentLearningOverview(
      { userId: otherStudentId, role: Role.STUDENT },
      otherStudentId,
    );
    expect(overview).toMatchObject({
      lessonsStarted: 0,
      lessonsCompleted: 0,
      lessonsMastered: 0,
      questionsAnswered: 0,
      correctCount: 0,
    });
  });

  it("após concluir uma lição com 100% de aproveitamento: contadores refletem MASTERED e o conceito forte", async () => {
    await startLesson(student(), lessonId);
    await submitLessonActivity(student(), {
      lessonId,
      blockId: lessonBlockId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 500,
    });
    await completeLesson(student(), lessonId);

    const overview = await getStudentLearningOverview(student(), studentId);
    expect(overview.lessonsStarted).toBe(1);
    expect(overview.lessonsCompleted).toBe(1);
    expect(overview.lessonsMastered).toBe(1);
    expect(overview.questionsAnswered).toBe(1);
    expect(overview.correctCount).toBe(1);
    expect(overview.accuracyPercentage).toBe(100);
    expect(overview.strongConceptIds).toContain(conceptId);
    expect(overview.weakConceptIds).not.toContain(conceptId);
  });

  it("privacidade: outro aluno não pode consultar a evolução de terceiro", async () => {
    await expect(
      getStudentLearningOverview({ userId: otherStudentId, role: Role.STUDENT }, studentId),
    ).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({
      citationIds,
      lessonIds,
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
