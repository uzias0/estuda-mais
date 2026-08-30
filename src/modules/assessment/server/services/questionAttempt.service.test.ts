/**
 * Testes de integração reais — QuestionAttempt: correção pelo servidor
 * (correta/incorreta), tempo, contexto, usuário correto, segurança
 * (Módulo 3, seção 45).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AttemptValidationError } from "./errors";
import { recordAttempt, getAttempt } from "./questionAttempt.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureMultipleChoiceQuestion,
  cleanupFixtures,
} from "@/test/fixtures";

describe("QuestionAttempt service", () => {
  let studentId: string;
  let otherStudentId: string;
  let sourceId: string;
  let questionId: string;
  let correctOptionId: string;
  let incorrectOptionId: string;
  const questionIds: string[] = [];
  const sourceIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("attempt-student", Role.STUDENT);
    const other = await createFixtureUser("attempt-other-student", Role.STUDENT);
    const source = await createFixtureSource("attempt");
    studentId = student.id;
    otherStudentId = other.id;
    sourceId = source.id;
    userIds.push(studentId, otherStudentId);
    sourceIds.push(sourceId);

    const question = await createFixtureMultipleChoiceQuestion("attempt", sourceId, {
      correctIndex: 1,
    });
    questionIds.push(question.id);
    questionId = question.id;
    correctOptionId = question.options.find((o) => o.isCorrect)!.id;
    incorrectOptionId = question.options.find((o) => !o.isCorrect)!.id;
  });

  it("calcula isCorrect=true no servidor quando a alternativa correta é enviada", async () => {
    const { attempt, isCorrect } = await recordAttempt(
      { userId: studentId, role: Role.STUDENT },
      {
        questionId,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 4200,
        context: "LESSON",
      },
    );
    expect(isCorrect).toBe(true);
    expect(attempt.isCorrect).toBe(true);
    expect(attempt.userId).toBe(studentId);
    expect(attempt.timeSpentMs).toBe(4200);
    expect(attempt.context).toBe("LESSON");
  });

  it("calcula isCorrect=false quando a alternativa incorreta é enviada — mesmo se o payload tentar forjar outros campos", async () => {
    const { attempt, isCorrect } = await recordAttempt(
      { userId: studentId, role: Role.STUDENT },
      {
        questionId,
        // @ts-expect-error — campos extras propositalmente enviados para provar que são ignorados
        isCorrect: true,
        score: 100,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: incorrectOptionId },
        timeSpentMs: 1000,
        context: "REVIEW",
      },
    );
    expect(isCorrect).toBe(false);
    expect(attempt.isCorrect).toBe(false);
  });

  it("rejeita selectedOptionId que não pertence à questão", async () => {
    await expect(
      recordAttempt(
        { userId: studentId, role: Role.STUDENT },
        {
          questionId,
          answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: "id-fantasma" },
          timeSpentMs: 100,
          context: "LESSON",
        },
      ),
    ).rejects.toThrow(AttemptValidationError);
  });

  it("atualiza answerCount/correctRate da Question (estatística agregada)", async () => {
    const question = await createFixtureMultipleChoiceQuestion("attempt-stats", sourceId, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    const correctId = question.options.find((o) => o.isCorrect)!.id;
    const wrongId = question.options.find((o) => !o.isCorrect)!.id;

    await recordAttempt(
      { userId: studentId, role: Role.STUDENT },
      {
        questionId: question.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctId },
        timeSpentMs: 1,
        context: "LESSON",
      },
    );
    await recordAttempt(
      { userId: otherStudentId, role: Role.STUDENT },
      {
        questionId: question.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongId },
        timeSpentMs: 1,
        context: "LESSON",
      },
    );

    const reloaded = await prisma.question.findUnique({ where: { id: question.id } });
    expect(reloaded?.answerCount).toBe(2);
    expect(reloaded?.correctRate).toBeCloseTo(0.5, 5);
  });

  it("aluno não consegue ler a tentativa de outro usuário (segurança)", async () => {
    const { attempt } = await recordAttempt(
      { userId: studentId, role: Role.STUDENT },
      {
        questionId,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 500,
        context: "CHALLENGE",
      },
    );

    await expect(
      getAttempt({ userId: otherStudentId, role: Role.STUDENT }, attempt.id),
    ).rejects.toThrow(AttemptValidationError);
    const ownView = await getAttempt({ userId: studentId, role: Role.STUDENT }, attempt.id);
    expect(ownView.id).toBe(attempt.id);
  });

  afterAll(async () => {
    await cleanupFixtures({ questionIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
