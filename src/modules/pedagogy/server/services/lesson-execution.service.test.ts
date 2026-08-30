/**
 * Testes de integração reais da execução de lição (Módulo 8, seções 14-18,
 * 39-41: início/continuação/conclusão, correção real de atividades,
 * anti-fraude, idempotência).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { LessonExecutionError } from "./errors";
import { NotFoundError } from "./pedagogy-publication.service";
import {
  startLesson,
  submitLessonActivity,
  completeLesson,
  getLessonSession,
} from "./lesson-execution.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureMultipleChoiceQuestion,
  createFixtureLesson,
  createFixturePublishedLesson,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Lesson execution service", () => {
  let studentId: string;
  let otherStudentId: string;
  let adminId: string;
  const userIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];
  const questionIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("exec-student", Role.STUDENT);
    const other = await createFixtureUser("exec-other", Role.STUDENT);
    const admin = await createFixtureUser("exec-admin", Role.ADMIN);
    studentId = student.id;
    otherStudentId = other.id;
    adminId = admin.id;
    userIds.push(studentId, otherStudentId, adminId);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("startLesson rejeita lição inexistente e lição não publicada", async () => {
    await expect(startLesson(student(), "lesson-inexistente")).rejects.toThrow(NotFoundError);

    const draft = await createFixtureLesson("exec-draft");
    lessonIds.push(draft.id);
    await expect(startLesson(student(), draft.id)).rejects.toThrow(LessonExecutionError);
  });

  it("startLesson numa lição só de conteúdo (sem QUESTION): 0% -> parcial -> 100% COMPLETED", async () => {
    const { lesson, source, citation, blocks } = await createFixturePublishedLesson(
      "exec-content",
      {
        blocks: [
          { type: "INTRO", content: "b0" },
          { type: "CONCEPT", content: "b1" },
          { type: "CONCLUSION", content: "b2" },
        ],
      },
    );
    lessonIds.push(lesson.id);
    sourceIds.push(source.id);
    citationIds.push(citation.id);

    const started = await startLesson(student(), lesson.id);
    expect(started.status).toBe("NOT_STARTED");
    expect(started.blocksTotal).toBe(3);
    expect(started.blocksCompleted).toBe(0);
    expect(started.percentage).toBe(0);
    expect(started.currentBlock?.id).toBe(blocks[0].id);

    const afterOne = await submitLessonActivity(student(), {
      lessonId: lesson.id,
      blockId: blocks[0].id,
    });
    expect(afterOne.status).toBe("IN_PROGRESS");
    expect(afterOne.blocksCompleted).toBe(1);
    expect(afterOne.percentage).toBeCloseTo(33.33, 1);
    expect(afterOne.currentBlock?.id).toBe(blocks[1].id);

    await submitLessonActivity(student(), { lessonId: lesson.id, blockId: blocks[1].id });
    const afterAll3 = await submitLessonActivity(student(), {
      lessonId: lesson.id,
      blockId: blocks[2].id,
    });
    expect(afterAll3.blocksCompleted).toBe(3);
    expect(afterAll3.percentage).toBe(100);
    expect(afterAll3.currentBlock).toBeNull();
    // Sem nenhuma atividade avaliativa (QUESTION) — nunca alcança MASTERED por decreto.
    expect(afterAll3.status).toBe("COMPLETED");
    expect(afterAll3.accuracy).toBeNull();

    const completed = await completeLesson(student(), lesson.id);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
    expect(completed.masteredAt).toBeNull();
  });

  it("completeLesson rejeita quando há blocos pendentes", async () => {
    const { lesson, source, citation } = await createFixturePublishedLesson("exec-pending", {
      blocks: [
        { type: "INTRO", content: "b0" },
        { type: "CONCEPT", content: "b1" },
      ],
    });
    lessonIds.push(lesson.id);
    sourceIds.push(source.id);
    citationIds.push(citation.id);

    await startLesson(student(), lesson.id);
    await expect(completeLesson(student(), lesson.id)).rejects.toThrow(LessonExecutionError);
  });

  it("completeLesson rejeita se a lição nunca foi iniciada", async () => {
    const { lesson, source, citation } = await createFixturePublishedLesson("exec-notstarted");
    lessonIds.push(lesson.id);
    sourceIds.push(source.id);
    citationIds.push(citation.id);

    await expect(completeLesson(student(), lesson.id)).rejects.toThrow(LessonExecutionError);
  });

  it("submitLessonActivity rejeita bloco de outra lição e bloco inexistente", async () => {
    const a = await createFixturePublishedLesson("exec-blocka");
    const b = await createFixturePublishedLesson("exec-blockb");
    lessonIds.push(a.lesson.id, b.lesson.id);
    sourceIds.push(a.source.id, b.source.id);
    citationIds.push(a.citation.id, b.citation.id);

    await startLesson(student(), a.lesson.id);
    await expect(
      submitLessonActivity(student(), { lessonId: a.lesson.id, blockId: b.blocks[0].id }),
    ).rejects.toThrow(LessonExecutionError);

    await expect(
      submitLessonActivity(student(), { lessonId: a.lesson.id, blockId: "bloco-inexistente" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("submitLessonActivity rejeita atividade sem ter iniciado a lição", async () => {
    const { lesson, source, citation, blocks } = await createFixturePublishedLesson("exec-nostart");
    lessonIds.push(lesson.id);
    sourceIds.push(source.id);
    citationIds.push(citation.id);

    await expect(
      submitLessonActivity(student(), { lessonId: lesson.id, blockId: blocks[0].id }),
    ).rejects.toThrow(LessonExecutionError);
  });

  it("bloco QUESTION: correção real pelo servidor — resposta correta e errada, e aproveitamento/MASTERED", async () => {
    const source = await createFixtureSource("exec-question");
    sourceIds.push(source.id);
    const question = await createFixtureMultipleChoiceQuestion("exec-question", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    const correctOptionId = question.options.find((o) => o.isCorrect)!.id;

    const {
      lesson,
      source: lessonSource,
      citation,
      blocks,
    } = await createFixturePublishedLesson("exec-question-lesson", {
      blocks: [
        { type: "QUESTION", questionId: question.id },
        { type: "CONCEPT", content: "explicação" },
      ],
    });
    lessonIds.push(lesson.id);
    sourceIds.push(lessonSource.id);
    citationIds.push(citation.id);

    await startLesson(student(), lesson.id);

    // resposta CORRETA — o servidor decide, não o cliente.
    const afterCorrect = await submitLessonActivity(student(), {
      lessonId: lesson.id,
      blockId: blocks[0].id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 1000,
    });
    expect(afterCorrect.isCorrect).toBe(true);
    expect(afterCorrect.totalActivities).toBe(1);
    expect(afterCorrect.correctActivities).toBe(1);
    expect(afterCorrect.accuracy).toBe(100);

    const final = await submitLessonActivity(student(), {
      lessonId: lesson.id,
      blockId: blocks[1].id,
    });
    expect(final.blocksCompleted).toBe(2);
    expect(final.accuracy).toBe(100);
    // Todos os blocos concluídos + 100% de aproveitamento (>= LESSON_MASTERY_THRESHOLD) => MASTERED.
    expect(final.status).toBe("MASTERED");

    const attempt = await prisma.questionAttempt.findFirst({
      where: { userId: studentId, questionId: question.id },
    });
    expect(attempt?.context).toBe("LESSON");
    expect(attempt?.isCorrect).toBe(true);
  });

  it("bloco QUESTION exige answerData e timeSpentMs", async () => {
    const source = await createFixtureSource("exec-question-missing");
    sourceIds.push(source.id);
    const question = await createFixtureMultipleChoiceQuestion("exec-question-missing", source.id);
    questionIds.push(question.id);

    const {
      lesson,
      source: lessonSource,
      citation,
      blocks,
    } = await createFixturePublishedLesson("exec-question-missing-lesson", {
      blocks: [{ type: "QUESTION", questionId: question.id }],
    });
    lessonIds.push(lesson.id);
    sourceIds.push(lessonSource.id);
    citationIds.push(citation.id);

    await startLesson(student(), lesson.id);
    await expect(
      submitLessonActivity(student(), { lessonId: lesson.id, blockId: blocks[0].id }),
    ).rejects.toThrow(LessonExecutionError);
  });

  it("anti-fraude: payload não pode informar isCorrect/score/completed/mastered/userId — são ignorados/inexistentes no schema de entrada", async () => {
    const source = await createFixtureSource("exec-forge");
    sourceIds.push(source.id);
    const question = await createFixtureMultipleChoiceQuestion("exec-forge", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    const wrongOptionId = question.options.find((o) => !o.isCorrect)!.id;

    const {
      lesson,
      source: lessonSource,
      citation,
      blocks,
    } = await createFixturePublishedLesson("exec-forge-lesson", {
      blocks: [{ type: "QUESTION", questionId: question.id }],
    });
    lessonIds.push(lesson.id);
    sourceIds.push(lessonSource.id);
    citationIds.push(citation.id);

    await startLesson(student(), lesson.id);

    const forged = {
      lessonId: lesson.id,
      blockId: blocks[0].id,
      answerData: { type: "MULTIPLE_CHOICE" as const, selectedOptionId: wrongOptionId },
      timeSpentMs: 500,
      // campos forjados — não fazem parte do schema de entrada, e mesmo que
      // presentes no objeto JS, são descartados pelo `.parse()` do Zod.
      isCorrect: true,
      score: 100,
      completed: true,
      mastered: true,
      userId: otherStudentId,
    };

    const result = await submitLessonActivity(student(), forged as never);
    // Resposta era ERRADA de verdade — o servidor corrigiu de novo, ignorando o `isCorrect: true` forjado.
    expect(result.isCorrect).toBe(false);

    const attempt = await prisma.questionAttempt.findFirst({
      where: { questionId: question.id, userId: studentId },
    });
    expect(attempt?.userId).toBe(studentId); // nunca o `userId` forjado no payload.
    expect(attempt?.isCorrect).toBe(false);
  });

  it("completeLesson é idempotente: chamar duas vezes não duplica nem sobrescreve completedAt", async () => {
    const { lesson, source, citation, blocks } =
      await createFixturePublishedLesson("exec-idempotent");
    lessonIds.push(lesson.id);
    sourceIds.push(source.id);
    citationIds.push(citation.id);

    await startLesson(student(), lesson.id);
    await submitLessonActivity(student(), { lessonId: lesson.id, blockId: blocks[0].id });
    const first = await completeLesson(student(), lesson.id);
    const second = await completeLesson(student(), lesson.id);

    expect(second.completedAt?.getTime()).toBe(first.completedAt?.getTime());

    const completions = await prisma.lessonBlockCompletion.count({
      where: { lessonProgress: { userId: studentId, lessonId: lesson.id } },
    });
    expect(completions).toBe(1);
  });

  it("submitLessonActivity é idempotente: reenviar o mesmo bloco QUESTION não gera uma segunda QuestionAttempt", async () => {
    const source = await createFixtureSource("exec-resubmit");
    sourceIds.push(source.id);
    const question = await createFixtureMultipleChoiceQuestion("exec-resubmit", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    const correctOptionId = question.options.find((o) => o.isCorrect)!.id;

    const {
      lesson,
      source: lessonSource,
      citation,
      blocks,
    } = await createFixturePublishedLesson("exec-resubmit-lesson", {
      blocks: [{ type: "QUESTION", questionId: question.id }],
    });
    lessonIds.push(lesson.id);
    sourceIds.push(lessonSource.id);
    citationIds.push(citation.id);

    await startLesson(student(), lesson.id);
    await submitLessonActivity(student(), {
      lessonId: lesson.id,
      blockId: blocks[0].id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
      timeSpentMs: 100,
    });
    // reenvio — mesmo bloco, sem answerData (não deveria precisar corrigir de novo)
    const second = await submitLessonActivity(student(), {
      lessonId: lesson.id,
      blockId: blocks[0].id,
    });
    expect(second.isCorrect).toBe(true);

    const attemptCount = await prisma.questionAttempt.count({
      where: { userId: studentId, questionId: question.id },
    });
    expect(attemptCount).toBe(1);
  });

  it("continuação: retomar a lição depois de responder parte dos blocos parte do bloco correto", async () => {
    const { lesson, source, citation, blocks } = await createFixturePublishedLesson("exec-resume", {
      blocks: [
        { type: "INTRO", content: "b0" },
        { type: "CONCEPT", content: "b1" },
        { type: "CONCLUSION", content: "b2" },
      ],
    });
    lessonIds.push(lesson.id);
    sourceIds.push(source.id);
    citationIds.push(citation.id);

    await startLesson(student(), lesson.id);
    await submitLessonActivity(student(), { lessonId: lesson.id, blockId: blocks[0].id });
    await submitLessonActivity(student(), { lessonId: lesson.id, blockId: blocks[1].id });

    // "Saiu" e retomou — startLesson de novo não reinicia nada.
    const resumed = await startLesson(student(), lesson.id);
    expect(resumed.blocksCompleted).toBe(2);
    expect(resumed.currentBlock?.id).toBe(blocks[2].id);
  });

  it("getLessonSession: sem progresso ainda devolve NOT_STARTED sem gravar nada; com progresso reflete o estado real", async () => {
    const { lesson, source, citation, blocks } = await createFixturePublishedLesson("exec-session");
    lessonIds.push(lesson.id);
    sourceIds.push(source.id);
    citationIds.push(citation.id);

    const before = await getLessonSession(student(), lesson.id);
    expect(before.lessonProgressId).toBeNull();
    expect(before.status).toBe("NOT_STARTED");

    const progressRowsBefore = await prisma.lessonProgress.count({
      where: { userId: studentId, lessonId: lesson.id },
    });
    expect(progressRowsBefore).toBe(0);

    await startLesson(student(), lesson.id);
    await submitLessonActivity(student(), { lessonId: lesson.id, blockId: blocks[0].id });

    const after = await getLessonSession(student(), lesson.id);
    expect(after.lessonProgressId).not.toBeNull();
    expect(after.blocksCompleted).toBe(1);
  });

  it("privacidade: outro aluno não pode consultar getLessonSession de terceiro; ADMIN pode", async () => {
    const { lesson, source, citation } = await createFixturePublishedLesson("exec-privacy");
    lessonIds.push(lesson.id);
    sourceIds.push(source.id);
    citationIds.push(citation.id);

    await startLesson(student(), lesson.id);

    await expect(getLessonSession(other(), lesson.id, studentId)).rejects.toThrow(
      AuthorizationError,
    );
    const adminView = await getLessonSession(admin(), lesson.id, studentId);
    expect(adminView.lessonProgressId).not.toBeNull();
  });

  afterAll(async () => {
    await cleanupFixtures({ citationIds, lessonIds, sourceIds, questionIds, userIds });
    await prisma.$disconnect();
  });
});
