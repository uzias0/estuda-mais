import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { PedagogyValidationError } from "./errors";
import { NotFoundError } from "./pedagogy-publication.service";
import {
  createLesson,
  updateLesson,
  publishLesson,
  archiveLesson,
  linkLessonToKnowledge,
  unlinkLessonFromKnowledge,
  getLesson,
} from "./lesson.service";
import { createLessonBlock } from "./lesson-block.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import {
  createFixtureUser,
  createFixtureLesson,
  createFixtureLessonBlock,
  createFixtureSource,
  createFixtureConcept,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Lesson service", () => {
  let editorId: string;
  let adminId: string;
  const userIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];
  const conceptIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("lesson-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("lesson-admin", Role.ADMIN);
    editorId = editor.id;
    adminId = admin.id;
    userIds.push(editorId, adminId);
  });

  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("cria uma Lesson válida (só título)", async () => {
    const lesson = await createLesson(editor(), { title: "TEST_FIXTURE_lesson_create" });
    lessonIds.push(lesson.id);
    expect(lesson.status).toBe("DRAFT");
  });

  it("STUDENT NÃO pode criar Lesson", async () => {
    await expect(
      createLesson(
        { userId: "irrelevante", role: Role.STUDENT },
        { title: "TEST_FIXTURE_lesson_student" },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it("atualiza uma Lesson existente", async () => {
    const lesson = await createFixtureLesson("update");
    lessonIds.push(lesson.id);
    const updated = await updateLesson(editor(), lesson.id, { title: "TEST_FIXTURE_lesson_v2" });
    expect(updated.title).toBe("TEST_FIXTURE_lesson_v2");
  });

  it("publicação SEM LessonBlock é rejeitada mesmo com Citation", async () => {
    const source = await createFixtureSource("lesson-noblock");
    const lesson = await createFixtureLesson("noblock");
    sourceIds.push(source.id);
    lessonIds.push(lesson.id);

    const citation = await createCitation(editor(), {
      entityType: "LESSON",
      entityId: lesson.id,
      sourceId: source.id,
    });
    citationIds.push(citation.id);

    await expect(publishLesson(admin(), lesson.id)).rejects.toThrow(PedagogyValidationError);
  });

  it("publicação SEM Citation é rejeitada mesmo com LessonBlock", async () => {
    const lesson = await createFixtureLesson("nocitation");
    lessonIds.push(lesson.id);
    await createFixtureLessonBlock(lesson.id, 0);

    await expect(publishLesson(admin(), lesson.id)).rejects.toThrow();
  });

  it("publicação COM Citation e LessonBlock é permitida", async () => {
    const source = await createFixtureSource("lesson-pub");
    const lesson = await createFixtureLesson("pub");
    sourceIds.push(source.id);
    lessonIds.push(lesson.id);

    await createLessonBlock(editor(), lesson.id, {
      order: 0,
      type: "INTRO",
      content: "TEST_FIXTURE_intro_content",
    });
    const citation = await createCitation(editor(), {
      entityType: "LESSON",
      entityId: lesson.id,
      sourceId: source.id,
    });
    citationIds.push(citation.id);

    const published = await publishLesson(admin(), lesson.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("linkLessonToKnowledge vincula a um Concept e rejeita entidade inexistente", async () => {
    const lesson = await createFixtureLesson("knowledge");
    const concept = await createFixtureConcept("lesson-tag");
    lessonIds.push(lesson.id);
    conceptIds.push(concept.id);

    const tag = await linkLessonToKnowledge(editor(), lesson.id, {
      entityType: "CONCEPT",
      entityId: concept.id,
    });
    expect(tag.entityId).toBe(concept.id);

    const full = await getLesson(lesson.id);
    expect(full?.knowledgeTags).toHaveLength(1);

    await expect(
      linkLessonToKnowledge(editor(), lesson.id, {
        entityType: "CONCEPT",
        entityId: "id-inexistente",
      }),
    ).rejects.toThrow(NotFoundError);

    await unlinkLessonFromKnowledge(editor(), lesson.id, {
      entityType: "CONCEPT",
      entityId: concept.id,
    });
    const afterUnlink = await getLesson(lesson.id);
    expect(afterUnlink?.knowledgeTags).toHaveLength(0);
  });

  it("CONTENT_EDITOR NÃO pode publicar (só ADMIN)", async () => {
    const lesson = await createFixtureLesson("editorpub");
    lessonIds.push(lesson.id);
    await expect(publishLesson(editor(), lesson.id)).rejects.toThrow(AuthorizationError);
  });

  it("ADMIN pode arquivar uma Lesson", async () => {
    const lesson = await createFixtureLesson("archive");
    lessonIds.push(lesson.id);
    const archived = await archiveLesson(admin(), lesson.id);
    expect(archived.status).toBe("ARCHIVED");
  });

  afterAll(async () => {
    await cleanupFixtures({ citationIds, lessonIds, sourceIds, conceptIds, userIds });
    await prisma.$disconnect();
  });
});
