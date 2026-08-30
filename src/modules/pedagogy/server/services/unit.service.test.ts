import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { PedagogyValidationError, ReorderError } from "./errors";
import { NotFoundError } from "./pedagogy-publication.service";
import {
  createUnit,
  updateUnit,
  publishUnit,
  archiveUnit,
  linkUnitToStage,
  unlinkUnitFromStage,
  reorderUnitStages,
  getUnit,
} from "./unit.service";
import { linkStageToLesson, publishStage } from "./stage.service";
import { publishLesson } from "./lesson.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import {
  createFixtureUser,
  createFixtureUnit,
  createFixturePedagogyStage,
  createFixtureLesson,
  createFixtureLessonBlock,
  createFixtureSource,
  createFixtureDiscipline,
  createFixtureSchool,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Unit service", () => {
  let editorId: string;
  let adminId: string;
  const userIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];
  const disciplineIds: string[] = [];
  const schoolIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("unit-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("unit-admin", Role.ADMIN);
    editorId = editor.id;
    adminId = admin.id;
    userIds.push(editorId, adminId);
  });

  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("cria uma Unit válida, sem âncora acadêmica", async () => {
    const unit = await createUnit(editor(), { name: "TEST_FIXTURE_unit_create" });
    unitIds.push(unit.id);
    expect(unit.status).toBe("DRAFT");
    expect(unit.primaryDisciplineId).toBeNull();
  });

  it("cria uma Unit com âncora acadêmica válida (Discipline/School)", async () => {
    const discipline = await createFixtureDiscipline("unit-anchor");
    const school = await createFixtureSchool("unit-anchor");
    disciplineIds.push(discipline.id);
    schoolIds.push(school.id);

    const unit = await createUnit(editor(), {
      name: "TEST_FIXTURE_unit_anchor",
      primaryDisciplineId: discipline.id,
      primarySchoolId: school.id,
    });
    unitIds.push(unit.id);
    expect(unit.primaryDisciplineId).toBe(discipline.id);
    expect(unit.primarySchoolId).toBe(school.id);
  });

  it("rejeita âncora acadêmica inexistente", async () => {
    await expect(
      createUnit(editor(), {
        name: "TEST_FIXTURE_unit_bad_anchor",
        primaryDisciplineId: "id-inexistente",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("STUDENT NÃO pode criar Unit", async () => {
    await expect(
      createUnit(
        { userId: "irrelevante", role: Role.STUDENT },
        { name: "TEST_FIXTURE_unit_student" },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it("atualiza uma Unit existente", async () => {
    const unit = await createFixtureUnit("update");
    unitIds.push(unit.id);
    const updated = await updateUnit(editor(), unit.id, { name: "TEST_FIXTURE_unit_updated" });
    expect(updated.name).toBe("TEST_FIXTURE_unit_updated");
  });

  it("publicação SEM Stage publicada é rejeitada", async () => {
    const unit = await createFixtureUnit("nopub");
    unitIds.push(unit.id);
    await expect(publishUnit(admin(), unit.id)).rejects.toThrow(PedagogyValidationError);
  });

  it("linkUnitToStage vincula e reorderUnitStages reordena com segurança", async () => {
    const unit = await createFixtureUnit("link");
    const stage1 = await createFixturePedagogyStage("link-1");
    const stage2 = await createFixturePedagogyStage("link-2");
    unitIds.push(unit.id);
    pedagogyStageIds.push(stage1.id, stage2.id);

    await linkUnitToStage(editor(), unit.id, { stageId: stage1.id });
    await linkUnitToStage(editor(), unit.id, { stageId: stage2.id });

    const full = await getUnit(unit.id);
    expect(full?.stages.map((s) => s.stageId)).toEqual([stage1.id, stage2.id]);

    await reorderUnitStages(editor(), unit.id, [stage2.id, stage1.id]);
    const reordered = await getUnit(unit.id);
    expect(reordered?.stages.map((s) => s.stageId)).toEqual([stage2.id, stage1.id]);

    await expect(reorderUnitStages(editor(), unit.id, [stage2.id])).rejects.toThrow(ReorderError);

    await unlinkUnitFromStage(editor(), unit.id, stage1.id);
    const afterUnlink = await getUnit(unit.id);
    expect(afterUnlink?.stages.map((s) => s.stageId)).toEqual([stage2.id]);
  });

  it("publica com uma Stage publicada vinculada", async () => {
    const source = await createFixtureSource("unit-pub");
    const unit = await createFixtureUnit("pub");
    const stage = await createFixturePedagogyStage("pub");
    const lesson = await createFixtureLesson("pub");
    sourceIds.push(source.id);
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

    await publishLesson(admin(), lesson.id);
    await publishStage(admin(), stage.id);

    const published = await publishUnit(admin(), unit.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("ADMIN pode arquivar uma Unit", async () => {
    const unit = await createFixtureUnit("archive");
    unitIds.push(unit.id);
    const archived = await archiveUnit(admin(), unit.id);
    expect(archived.status).toBe("ARCHIVED");
  });

  afterAll(async () => {
    await cleanupFixtures({
      citationIds,
      lessonIds,
      pedagogyStageIds,
      unitIds,
      sourceIds,
      disciplineIds,
      schoolIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
