import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { PedagogyValidationError, ReorderError } from "./errors";
import {
  createStage,
  updateStage,
  publishStage,
  archiveStage,
  linkStageToLesson,
  unlinkStageFromLesson,
  reorderStageLessons,
  getStage,
} from "./stage.service";
import { publishLesson } from "./lesson.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import {
  createFixtureUser,
  createFixturePedagogyStage,
  createFixtureLesson,
  createFixtureLessonBlock,
  createFixtureSource,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Stage service", () => {
  let editorId: string;
  let adminId: string;
  const userIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("stage-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("stage-admin", Role.ADMIN);
    editorId = editor.id;
    adminId = admin.id;
    userIds.push(editorId, adminId);
  });

  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("cria uma Stage com defaults (type=LESSON, xpReward=10)", async () => {
    const stage = await createStage(editor(), { name: "TEST_FIXTURE_stage_create" });
    pedagogyStageIds.push(stage.id);
    expect(stage.type).toBe("LESSON");
    expect(stage.xpReward).toBe(10);
    expect(stage.status).toBe("DRAFT");
  });

  it("cria uma Stage com type/xpReward explícitos", async () => {
    const stage = await createStage(editor(), {
      name: "TEST_FIXTURE_stage_checkpoint",
      type: "CHECKPOINT",
      xpReward: 50,
    });
    pedagogyStageIds.push(stage.id);
    expect(stage.type).toBe("CHECKPOINT");
    expect(stage.xpReward).toBe(50);
  });

  it("STUDENT NÃO pode criar Stage", async () => {
    await expect(
      createStage(
        { userId: "irrelevante", role: Role.STUDENT },
        { name: "TEST_FIXTURE_stage_student" },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it("atualiza uma Stage existente", async () => {
    const stage = await createFixturePedagogyStage("update");
    pedagogyStageIds.push(stage.id);
    const updated = await updateStage(editor(), stage.id, { name: "TEST_FIXTURE_stage_updated" });
    expect(updated.name).toBe("TEST_FIXTURE_stage_updated");
  });

  it("publicação SEM Lesson publicada é rejeitada", async () => {
    const stage = await createFixturePedagogyStage("nopub");
    pedagogyStageIds.push(stage.id);
    await expect(publishStage(admin(), stage.id)).rejects.toThrow(PedagogyValidationError);
  });

  it("linkStageToLesson vincula (reuso — mesma Lesson em 2 Stages) e reorderStageLessons reordena", async () => {
    const stage1 = await createFixturePedagogyStage("link-1");
    const stage2 = await createFixturePedagogyStage("link-2");
    const lesson1 = await createFixtureLesson("link-1");
    const lesson2 = await createFixtureLesson("link-2");
    pedagogyStageIds.push(stage1.id, stage2.id);
    lessonIds.push(lesson1.id, lesson2.id);

    await linkStageToLesson(editor(), stage1.id, { lessonId: lesson1.id });
    await linkStageToLesson(editor(), stage1.id, { lessonId: lesson2.id });
    // Mesma Lesson reaproveitada numa segunda Stage — a garantia central do
    // Módulo 4 (StageLesson N:N corrige a v1, docs/ARQUITETURA.md, seção 3).
    await linkStageToLesson(editor(), stage2.id, { lessonId: lesson1.id });

    const full = await getStage(stage1.id);
    expect(full?.lessons.map((l) => l.lessonId)).toEqual([lesson1.id, lesson2.id]);

    await reorderStageLessons(editor(), stage1.id, [lesson2.id, lesson1.id]);
    const reordered = await getStage(stage1.id);
    expect(reordered?.lessons.map((l) => l.lessonId)).toEqual([lesson2.id, lesson1.id]);

    await expect(reorderStageLessons(editor(), stage1.id, [lesson2.id])).rejects.toThrow(
      ReorderError,
    );

    await unlinkStageFromLesson(editor(), stage1.id, lesson2.id);
    const afterUnlink = await getStage(stage1.id);
    expect(afterUnlink?.lessons.map((l) => l.lessonId)).toEqual([lesson1.id]);

    // stage2 continua com lesson1 vinculada — unlink em stage1 não afetou stage2.
    const stage2Full = await getStage(stage2.id);
    expect(stage2Full?.lessons.map((l) => l.lessonId)).toEqual([lesson1.id]);
  });

  it("publica com uma Lesson publicada vinculada", async () => {
    const source = await createFixtureSource("stage-pub");
    const stage = await createFixturePedagogyStage("pub");
    const lesson = await createFixtureLesson("pub");
    sourceIds.push(source.id);
    pedagogyStageIds.push(stage.id);
    lessonIds.push(lesson.id);

    await createFixtureLessonBlock(lesson.id, 0);
    const citation = await createCitation(editor(), {
      entityType: "LESSON",
      entityId: lesson.id,
      sourceId: source.id,
    });
    citationIds.push(citation.id);

    await linkStageToLesson(editor(), stage.id, { lessonId: lesson.id });
    await publishLesson(admin(), lesson.id);

    const published = await publishStage(admin(), stage.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("CONTENT_EDITOR NÃO pode publicar (só ADMIN)", async () => {
    const stage = await createFixturePedagogyStage("editorpub");
    pedagogyStageIds.push(stage.id);
    await expect(publishStage(editor(), stage.id)).rejects.toThrow(AuthorizationError);
  });

  it("ADMIN pode arquivar uma Stage", async () => {
    const stage = await createFixturePedagogyStage("archive");
    pedagogyStageIds.push(stage.id);
    const archived = await archiveStage(admin(), stage.id);
    expect(archived.status).toBe("ARCHIVED");
  });

  afterAll(async () => {
    await cleanupFixtures({
      citationIds,
      lessonIds,
      pedagogyStageIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
