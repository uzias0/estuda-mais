import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { PedagogyValidationError, ReorderError } from "./errors";
import { NotFoundError } from "./pedagogy-publication.service";
import {
  assertLessonBlockShapeValid,
  createLessonBlock,
  updateLessonBlock,
  deleteLessonBlock,
  reorderLessonBlocks,
  listLessonBlocks,
} from "./lesson-block.service";
import {
  createFixtureUser,
  createFixtureLesson,
  createFixtureSource,
  createFixtureMultipleChoiceQuestion,
  cleanupFixtures,
} from "@/test/fixtures";

describe("LessonBlock service", () => {
  let editorId: string;
  const userIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const questionIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("block-editor", Role.CONTENT_EDITOR);
    editorId = editor.id;
    userIds.push(editorId);
  });

  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });

  it("assertLessonBlockShapeValid: QUESTION exige questionId, demais exigem content", () => {
    expect(() => assertLessonBlockShapeValid("QUESTION", undefined, "q1")).not.toThrow();
    expect(() => assertLessonBlockShapeValid("QUESTION", undefined, undefined)).toThrow(
      PedagogyValidationError,
    );
    expect(() => assertLessonBlockShapeValid("CONCEPT", "algum conteúdo", undefined)).not.toThrow();
    expect(() => assertLessonBlockShapeValid("CONCEPT", undefined, undefined)).toThrow(
      PedagogyValidationError,
    );
    expect(() => assertLessonBlockShapeValid("CONCEPT", "conteúdo", "q1")).toThrow(
      PedagogyValidationError,
    );
  });

  it("STUDENT NÃO pode criar LessonBlock", async () => {
    const lesson = await createFixtureLesson("block-student");
    lessonIds.push(lesson.id);
    await expect(
      createLessonBlock({ userId: "irrelevante", role: Role.STUDENT }, lesson.id, {
        order: 0,
        type: "INTRO",
        content: "texto",
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it("cria blocos INTRO/CONCEPT/CONCLUSION com content e rejeita Lesson inexistente", async () => {
    const lesson = await createFixtureLesson("block-create");
    lessonIds.push(lesson.id);

    const intro = await createLessonBlock(editor(), lesson.id, {
      order: 0,
      type: "INTRO",
      content: "TEST_FIXTURE_intro",
    });
    expect(intro.type).toBe("INTRO");

    await expect(
      createLessonBlock(editor(), "lesson-inexistente", {
        order: 0,
        type: "INTRO",
        content: "x",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("cria bloco QUESTION vinculado a Question real e rejeita Question inexistente", async () => {
    const source = await createFixtureSource("block-question");
    const question = await createFixtureMultipleChoiceQuestion("block", source.id);
    const lesson = await createFixtureLesson("block-question");
    sourceIds.push(source.id);
    questionIds.push(question.id);
    lessonIds.push(lesson.id);

    const block = await createLessonBlock(editor(), lesson.id, {
      order: 0,
      type: "QUESTION",
      questionId: question.id,
    });
    expect(block.questionId).toBe(question.id);

    await expect(
      createLessonBlock(editor(), lesson.id, {
        order: 1,
        type: "QUESTION",
        questionId: "questao-inexistente",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("updateLessonBlock revalida a forma com o resultado final (existente + patch)", async () => {
    const lesson = await createFixtureLesson("block-update");
    lessonIds.push(lesson.id);
    const block = await createLessonBlock(editor(), lesson.id, {
      order: 0,
      type: "CONCEPT",
      content: "conteúdo original",
    });

    const updated = await updateLessonBlock(editor(), block.id, { content: "conteúdo revisado" });
    expect(updated.content).toBe("conteúdo revisado");

    // Trocar para QUESTION sem informar questionId deve ser rejeitado —
    // o conteúdo textual existente não basta para um bloco QUESTION.
    await expect(updateLessonBlock(editor(), block.id, { type: "QUESTION" })).rejects.toThrow(
      PedagogyValidationError,
    );
  });

  it("reorderLessonBlocks reordena com segurança (contorna o @@unique([lessonId, order]))", async () => {
    const lesson = await createFixtureLesson("block-reorder");
    lessonIds.push(lesson.id);
    const b0 = await createLessonBlock(editor(), lesson.id, {
      order: 0,
      type: "INTRO",
      content: "b0",
    });
    const b1 = await createLessonBlock(editor(), lesson.id, {
      order: 1,
      type: "CONCEPT",
      content: "b1",
    });

    await reorderLessonBlocks(editor(), lesson.id, [b1.id, b0.id]);
    const reordered = await listLessonBlocks(lesson.id);
    expect(reordered.map((b) => b.id)).toEqual([b1.id, b0.id]);

    await expect(reorderLessonBlocks(editor(), lesson.id, [b1.id])).rejects.toThrow(ReorderError);
  });

  it("deleteLessonBlock remove o bloco", async () => {
    const lesson = await createFixtureLesson("block-delete");
    lessonIds.push(lesson.id);
    const block = await createLessonBlock(editor(), lesson.id, {
      order: 0,
      type: "INTRO",
      content: "a apagar",
    });

    await deleteLessonBlock(editor(), block.id);
    const remaining = await listLessonBlocks(lesson.id);
    expect(remaining).toHaveLength(0);
  });

  afterAll(async () => {
    await cleanupFixtures({ lessonIds, questionIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
