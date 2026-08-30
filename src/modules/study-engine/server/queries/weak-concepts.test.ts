/**
 * Testes de integração reais de conceitos fracos "atuais" (Módulo 10, seção
 * 8/40) — reaproveita `computePerformance` (Módulo 3) e o mesmo
 * `WEAK_CONCEPT_THRESHOLD`, exigindo a mesma amostra mínima do Módulo 6.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role, AttemptContext } from "@/generated/prisma/enums";
import { getCurrentWeakConcepts } from "./weak-concepts";
import { recordAttempt } from "@/modules/assessment/server/services/questionAttempt.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";

describe("weak-concepts query", () => {
  let studentId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const questionAttemptIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });

  async function answer(
    questionId: string,
    optionIndex: number,
    question: { options: { id: string }[] },
  ) {
    const result = await recordAttempt(student(), {
      questionId,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: question.options[optionIndex].id },
      timeSpentMs: 100,
      context: AttemptContext.LESSON,
    });
    questionAttemptIds.push(result.attempt.id);
    return result;
  }

  beforeAll(async () => {
    const studentUser = await createFixtureUser("weak-student", Role.STUDENT);
    studentId = studentUser.id;
    userIds.push(studentId);
  });

  it("conceito com amostra abaixo do mínimo não é considerado, mesmo com 0% de acerto", async () => {
    const source = await createFixtureSource("weak-small-sample");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("weak-small-sample");
    conceptIds.push(concept.id);
    const question = await createFixtureMultipleChoiceQuestion("weak-small-sample", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    await createFixtureQuestionKnowledgeTag(question.id, "CONCEPT", concept.id);

    await answer(question.id, 1, question); // errado — só 1 tentativa, abaixo da amostra mínima (3)

    const weak = await getCurrentWeakConcepts(studentId);
    expect(weak.find((w) => w.conceptId === concept.id)).toBeUndefined();
  });

  it("conceito com amostra suficiente e baixo desempenho é identificado como fraco", async () => {
    const source = await createFixtureSource("weak-real");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("weak-real");
    conceptIds.push(concept.id);

    const q1 = await createFixtureMultipleChoiceQuestion("weak-real-1", source.id, {
      correctIndex: 0,
    });
    const q2 = await createFixtureMultipleChoiceQuestion("weak-real-2", source.id, {
      correctIndex: 0,
    });
    const q3 = await createFixtureMultipleChoiceQuestion("weak-real-3", source.id, {
      correctIndex: 0,
    });
    questionIds.push(q1.id, q2.id, q3.id);
    for (const q of [q1, q2, q3]) {
      await createFixtureQuestionKnowledgeTag(q.id, "CONCEPT", concept.id);
    }

    // 0/3 corretas — 0% de acerto, bem abaixo do limiar (40%).
    await answer(q1.id, 1, q1);
    await answer(q2.id, 1, q2);
    await answer(q3.id, 1, q3);

    const weak = await getCurrentWeakConcepts(studentId);
    const entry = weak.find((w) => w.conceptId === concept.id);
    expect(entry).toBeDefined();
    expect(entry?.accuracyPercentage).toBe(0);
    expect(entry?.totalAnswered).toBe(3);
  });

  it("conceito com bom desempenho não é considerado fraco", async () => {
    const source = await createFixtureSource("strong");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("strong");
    conceptIds.push(concept.id);
    const q1 = await createFixtureMultipleChoiceQuestion("strong-1", source.id, {
      correctIndex: 0,
    });
    const q2 = await createFixtureMultipleChoiceQuestion("strong-2", source.id, {
      correctIndex: 0,
    });
    const q3 = await createFixtureMultipleChoiceQuestion("strong-3", source.id, {
      correctIndex: 0,
    });
    questionIds.push(q1.id, q2.id, q3.id);
    for (const q of [q1, q2, q3]) {
      await createFixtureQuestionKnowledgeTag(q.id, "CONCEPT", concept.id);
    }

    await answer(q1.id, 0, q1);
    await answer(q2.id, 0, q2);
    await answer(q3.id, 0, q3);

    const weak = await getCurrentWeakConcepts(studentId);
    expect(weak.find((w) => w.conceptId === concept.id)).toBeUndefined();
  });

  it("ordena do pior para o melhor desempenho", async () => {
    const weak = await getCurrentWeakConcepts(studentId);
    for (let i = 1; i < weak.length; i++) {
      expect(weak[i - 1].accuracyPercentage).toBeLessThanOrEqual(weak[i].accuracyPercentage);
    }
  });

  afterAll(async () => {
    await cleanupFixtures({ questionAttemptIds, questionIds, conceptIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
