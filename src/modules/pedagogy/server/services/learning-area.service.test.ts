import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { PedagogyValidationError, ReorderError } from "./errors";
import {
  createLearningArea,
  updateLearningArea,
  publishLearningArea,
  archiveLearningArea,
  linkAreaToUnit,
  unlinkAreaFromUnit,
  reorderAreaUnits,
  getLearningArea,
} from "./learning-area.service";
import { publishUnit } from "./unit.service";
import { linkUnitToStage } from "./unit.service";
import { linkStageToLesson } from "./stage.service";
import { publishStage } from "./stage.service";
import { publishLesson } from "./lesson.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import {
  createFixtureUser,
  createFixtureLearningArea,
  createFixtureUnit,
  createFixturePedagogyStage,
  createFixtureLesson,
  createFixtureLessonBlock,
  createFixtureSource,
  cleanupFixtures,
} from "@/test/fixtures";

describe("LearningArea service", () => {
  let editorId: string;
  let adminId: string;
  const userIds: string[] = [];
  const learningAreaIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("area-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("area-admin", Role.ADMIN);
    editorId = editor.id;
    adminId = admin.id;
    userIds.push(editorId, adminId);
  });

  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("CONTENT_EDITOR cria uma LearningArea válida", async () => {
    const area = await createLearningArea(editor(), {
      slug: `test-fixture-area-create-${Date.now()}`,
      name: "TEST_FIXTURE_area_create",
    });
    learningAreaIds.push(area.id);
    expect(area.status).toBe("DRAFT");
  });

  it("atualiza uma LearningArea existente", async () => {
    const area = await createFixtureLearningArea("update");
    learningAreaIds.push(area.id);
    const updated = await updateLearningArea(editor(), area.id, {
      name: "TEST_FIXTURE_area_updated",
    });
    expect(updated.name).toBe("TEST_FIXTURE_area_updated");
  });

  it("publicação SEM Unit publicada é rejeitada", async () => {
    const area = await createFixtureLearningArea("nopub");
    learningAreaIds.push(area.id);
    await expect(publishLearningArea(admin(), area.id)).rejects.toThrow(PedagogyValidationError);
  });

  it("linkAreaToUnit vincula e reorderAreaUnits reordena com segurança", async () => {
    const area = await createFixtureLearningArea("link");
    const unit1 = await createFixtureUnit("link-1");
    const unit2 = await createFixtureUnit("link-2");
    learningAreaIds.push(area.id);
    unitIds.push(unit1.id, unit2.id);

    await linkAreaToUnit(editor(), area.id, { unitId: unit1.id });
    await linkAreaToUnit(editor(), area.id, { unitId: unit2.id });

    const full = await getLearningArea(area.id);
    expect(full?.units.map((u) => u.unitId)).toEqual([unit1.id, unit2.id]);

    await reorderAreaUnits(editor(), area.id, [unit2.id, unit1.id]);
    const reordered = await getLearningArea(area.id);
    expect(reordered?.units.map((u) => u.unitId)).toEqual([unit2.id, unit1.id]);

    await expect(reorderAreaUnits(editor(), area.id, [unit2.id])).rejects.toThrow(ReorderError);

    await unlinkAreaFromUnit(editor(), area.id, unit1.id);
    const afterUnlink = await getLearningArea(area.id);
    expect(afterUnlink?.units.map((u) => u.unitId)).toEqual([unit2.id]);
  });

  it("publica com uma Unit publicada vinculada", async () => {
    const source = await createFixtureSource("area-pub");
    const area = await createFixtureLearningArea("pub");
    const unit = await createFixtureUnit("pub");
    const stage = await createFixturePedagogyStage("pub");
    const lesson = await createFixtureLesson("pub");
    sourceIds.push(source.id);
    learningAreaIds.push(area.id);
    unitIds.push(unit.id);
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
    await linkUnitToStage(editor(), unit.id, { stageId: stage.id });
    await linkAreaToUnit(editor(), area.id, { unitId: unit.id });

    await publishLesson(admin(), lesson.id);
    await publishStage(admin(), stage.id);
    await publishUnit(admin(), unit.id);

    const published = await publishLearningArea(admin(), area.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("CONTENT_EDITOR NÃO pode publicar (só ADMIN)", async () => {
    const area = await createFixtureLearningArea("editorpub");
    learningAreaIds.push(area.id);
    await expect(publishLearningArea(editor(), area.id)).rejects.toThrow(AuthorizationError);
  });

  it("ADMIN pode arquivar uma LearningArea", async () => {
    const area = await createFixtureLearningArea("archive");
    learningAreaIds.push(area.id);
    const archived = await archiveLearningArea(admin(), area.id);
    expect(archived.status).toBe("ARCHIVED");
  });

  afterAll(async () => {
    await cleanupFixtures({
      citationIds,
      lessonIds,
      pedagogyStageIds,
      unitIds,
      learningAreaIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
