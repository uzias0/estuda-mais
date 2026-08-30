/**
 * Testes de integração reais das sessões de revisão (Módulo 5, seções 19,
 * 20, 21, 28). Cobre o fluxo completo Question→QuestionAttempt→Review→
 * próxima revisão, e Concept→QuestionKnowledgeTag→erro→prioridade→revisão,
 * além de segurança (não confiar em isCorrect/nextReviewAt/priority/state/
 * userId vindos do cliente) e privacidade entre alunos.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { ReviewValidationError } from "./errors";
import {
  startReviewSession,
  submitReviewAnswer,
  finishReviewSession,
  getReviewSessionSummary,
} from "./reviewSession.service";
import { ensureReviewItem } from "./reviewItem.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";

describe("Review session service", () => {
  let studentId: string;
  let otherStudentId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let questionCorrectAt0Id: string;
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
    const student = await createFixtureUser("session-student", Role.STUDENT);
    const other = await createFixtureUser("session-other", Role.STUDENT);
    const admin = await createFixtureUser("session-admin", Role.ADMIN);
    const source = await createFixtureSource("session");
    const concept = await createFixtureConcept("session");
    const question = await createFixtureMultipleChoiceQuestion("session", source.id, {
      correctIndex: 0,
    });

    studentId = student.id;
    otherStudentId = other.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptId = concept.id;
    questionCorrectAt0Id = question.id;
    correctOptionId = question.options.find((o) => o.isCorrect)!.id;
    wrongOptionId = question.options.find((o) => !o.isCorrect)!.id;

    userIds.push(studentId, otherStudentId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    questionIds.push(questionCorrectAt0Id);

    await createFixtureQuestionKnowledgeTag(questionCorrectAt0Id, "CONCEPT", conceptId);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, questionCorrectAt0Id);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  async function openSession(userId: string) {
    const s = await prisma.studySession.create({ data: { userId, mode: "REVISAO" } });
    studySessionIds.push(s.id);
    return s;
  }

  it("startReviewSession devolve itens elegíveis com visão pública (sem isCorrect/answerKey)", async () => {
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: questionCorrectAt0Id,
    });
    reviewItemIds.push(item.id);

    const { sessionId, items } = await startReviewSession(student());
    studySessionIds.push(sessionId);
    const entry = items.find((i) => i.reviewItemId === item.id);
    expect(entry).toBeDefined();
    expect(entry!.question.id).toBe(questionCorrectAt0Id);
    expect((entry!.question as unknown as Record<string, unknown>).isCorrect).toBeUndefined();
    expect((entry!.question as unknown as Record<string, unknown>).answerKey).toBeUndefined();
    expect(typeof entry!.priority).toBe("number");
    expect(entry!.reason.length).toBeGreaterThan(0);
  });

  it("integração Question → QuestionAttempt → Review → próxima revisão (acerto)", async () => {
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: questionCorrectAt0Id,
    });
    reviewItemIds.push(item.id);
    const session = await openSession(studentId);

    const result = await submitReviewAnswer(student(), {
      sessionId: session.id,
      reviewItemId: item.id,
      questionId: questionCorrectAt0Id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 1000,
    });

    expect(result.isCorrect).toBe(true);
    expect(result.previousState).toBe("NEW");
    expect(result.newState).toBe("REVIEW");
    // No 1º acerto o intervalo nasce no piso de 1 dia (mesmo valor inicial
    // do item) — o CRESCIMENTO fica evidente só a partir do 2º acerto
    // consecutivo (verificado logo abaixo, numa 2ª sessão).
    expect(result.newIntervalDays).toBeGreaterThanOrEqual(result.previousIntervalDays);

    const updated = await prisma.reviewItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.state).toBe("REVIEW");
    expect(updated.repetitions).toBe(1);
    expect(updated.lastReviewedAt).not.toBeNull();

    const attempt = await prisma.questionAttempt.findFirst({
      where: { questionId: questionCorrectAt0Id, userId: studentId, sessionId: session.id },
    });
    expect(attempt).not.toBeNull();
    expect(attempt!.context).toBe("REVIEW");
    if (attempt) questionAttemptIds.push(attempt.id);

    const log = await prisma.reviewLog.findFirst({ where: { reviewItemId: item.id } });
    expect(log).not.toBeNull();
    expect(log!.isCorrect).toBe(true);
    expect(log!.previousState).toBe("NEW");
    expect(log!.newState).toBe("REVIEW");

    // 2º acerto consecutivo — agora o crescimento do intervalo é observável.
    const session2 = await openSession(studentId);
    const result2 = await submitReviewAnswer(student(), {
      sessionId: session2.id,
      reviewItemId: item.id,
      questionId: questionCorrectAt0Id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 1000,
    });
    expect(result2.newIntervalDays).toBeGreaterThan(result.newIntervalDays);
  });

  it("erro reduz o intervalo e retorna o item ao estado LEARNING", async () => {
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: questionCorrectAt0Id,
    });
    reviewItemIds.push(item.id);
    // Avança 1 acerto para o intervalo não nascer já no piso.
    const s1 = await openSession(studentId);
    await submitReviewAnswer(student(), {
      sessionId: s1.id,
      reviewItemId: item.id,
      questionId: questionCorrectAt0Id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 500,
    });

    const s2 = await openSession(studentId);
    const result = await submitReviewAnswer(student(), {
      sessionId: s2.id,
      reviewItemId: item.id,
      questionId: questionCorrectAt0Id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 500,
    });

    expect(result.isCorrect).toBe(false);
    expect(result.newState).toBe("LEARNING");
    expect(result.newIntervalDays).toBeLessThan(result.previousIntervalDays);

    const updated = await prisma.reviewItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.repetitions).toBe(0);
  });

  it("integração Concept → QuestionKnowledgeTag → erro → prioridade → revisão", async () => {
    const item = await ensureReviewItem(student(), { scope: "CONCEPT", conceptId });
    reviewItemIds.push(item.id);
    const session = await openSession(studentId);

    await submitReviewAnswer(student(), {
      sessionId: session.id,
      reviewItemId: item.id,
      questionId: questionCorrectAt0Id, // tagueada ao conceito via QuestionKnowledgeTag
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 700,
    });

    const updated = await prisma.reviewItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.state).toBe("LEARNING");
    // O erro no histórico deste conceito aumenta a prioridade futura do item.
    const { getReviewQueue } = await import("./reviewQueue.service");
    const queue = await getReviewQueue(student(), studentId, { conceptId });
    const entry = queue.find((e) => e.reviewItem.id === item.id);
    expect(entry).toBeDefined();
    expect(entry!.reason).toContain("erro");
  });

  it("segurança: campos forjados (isCorrect, nextReviewAt, priority, state, userId) no payload são ignorados", async () => {
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: questionCorrectAt0Id,
    });
    reviewItemIds.push(item.id);
    const session = await openSession(studentId);

    const forged = {
      sessionId: session.id,
      reviewItemId: item.id,
      questionId: questionCorrectAt0Id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 100,
      // campos que NÃO deveriam existir no schema/serem lidos:
      isCorrect: true,
      nextReviewAt: new Date("2099-01-01"),
      priority: 999999,
      state: "MASTERED",
      userId: otherStudentId,
    };

    const result = await submitReviewAnswer(student(), forged as never);
    // resposta era ERRADA de verdade (wrongOptionId) — o servidor não aceitou isCorrect:true forjado.
    expect(result.isCorrect).toBe(false);
    expect(result.newState).toBe("LEARNING");

    const updated = await prisma.reviewItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.userId).toBe(studentId); // não foi sequestrado para otherStudentId
    expect(updated.dueAt.getTime()).toBeLessThan(new Date("2099-01-01").getTime());
  });

  it("rejeita questionId que não corresponde ao item (scope=QUESTION)", async () => {
    const otherQuestion = await createFixtureMultipleChoiceQuestion("session-mismatch", sourceId);
    questionIds.push(otherQuestion.id);
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: questionCorrectAt0Id,
    });
    reviewItemIds.push(item.id);
    const session = await openSession(studentId);

    await expect(
      submitReviewAnswer(student(), {
        sessionId: session.id,
        reviewItemId: item.id,
        questionId: otherQuestion.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: otherQuestion.options[0].id },
        timeSpentMs: 100,
      }),
    ).rejects.toThrow(ReviewValidationError);
  });

  it("rejeita questão não tagueada ao conceito (scope=CONCEPT)", async () => {
    const untaggedQuestion = await createFixtureMultipleChoiceQuestion(
      "session-untagged",
      sourceId,
    );
    questionIds.push(untaggedQuestion.id);
    const item = await ensureReviewItem(student(), { scope: "CONCEPT", conceptId });
    reviewItemIds.push(item.id);
    const session = await openSession(studentId);

    await expect(
      submitReviewAnswer(student(), {
        sessionId: session.id,
        reviewItemId: item.id,
        questionId: untaggedQuestion.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: untaggedQuestion.options[0].id },
        timeSpentMs: 100,
      }),
    ).rejects.toThrow(ReviewValidationError);
  });

  it("rejeita responder o mesmo item duas vezes na mesma sessão", async () => {
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: questionCorrectAt0Id,
    });
    reviewItemIds.push(item.id);
    const session = await openSession(studentId);

    await submitReviewAnswer(student(), {
      sessionId: session.id,
      reviewItemId: item.id,
      questionId: questionCorrectAt0Id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 100,
    });

    await expect(
      submitReviewAnswer(student(), {
        sessionId: session.id,
        reviewItemId: item.id,
        questionId: questionCorrectAt0Id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 100,
      }),
    ).rejects.toThrow(ReviewValidationError);
  });

  it("privacidade: outro aluno não pode responder por uma sessão/item alheio", async () => {
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: questionCorrectAt0Id,
    });
    reviewItemIds.push(item.id);
    const session = await openSession(studentId);

    await expect(
      submitReviewAnswer(other(), {
        sessionId: session.id,
        reviewItemId: item.id,
        questionId: questionCorrectAt0Id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 100,
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it("finishReviewSession encerra a sessão e devolve o resumo; submissões depois são rejeitadas", async () => {
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: questionCorrectAt0Id,
    });
    reviewItemIds.push(item.id);
    const session = await openSession(studentId);

    await submitReviewAnswer(student(), {
      sessionId: session.id,
      reviewItemId: item.id,
      questionId: questionCorrectAt0Id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 100,
    });

    const summary = await finishReviewSession(student(), session.id);
    expect(summary.itemsReviewed).toBe(1);
    expect(summary.correctCount).toBe(1);
    expect(summary.accuracyPercentage).toBe(100);

    const item2 = await ensureReviewItem(student(), { scope: "CONCEPT", conceptId });
    reviewItemIds.push(item2.id);
    await expect(
      submitReviewAnswer(student(), {
        sessionId: session.id,
        reviewItemId: item2.id,
        questionId: questionCorrectAt0Id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 100,
      }),
    ).rejects.toThrow(ReviewValidationError);
  });

  it("getReviewSessionSummary é determinístico (recalculado a partir dos ReviewLog)", async () => {
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: questionCorrectAt0Id,
    });
    reviewItemIds.push(item.id);
    const session = await openSession(studentId);

    await submitReviewAnswer(student(), {
      sessionId: session.id,
      reviewItemId: item.id,
      questionId: questionCorrectAt0Id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 100,
    });

    const summaryA = await getReviewSessionSummary(student(), session.id);
    const summaryB = await getReviewSessionSummary(student(), session.id);
    expect(summaryA).toEqual(summaryB);
    expect(summaryA.correctCount).toBe(0);
    expect(summaryA.incorrectCount).toBe(1);
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
