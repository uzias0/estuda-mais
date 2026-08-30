/**
 * Testes de integração reais contra o Postgres de desenvolvimento (Módulo 4).
 * Cobre criação/atualização, publicação sem/com área publicada, arquivamento,
 * link/unlink/reorder de `TrackArea`, e segurança (STUDENT/CONTENT_EDITOR/ADMIN).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { PedagogyValidationError, ReorderError } from "./errors";
import {
  createTrack,
  updateTrack,
  publishTrack,
  archiveTrack,
  linkTrackToArea,
  unlinkTrackFromArea,
  reorderTrackAreas,
  getTrack,
} from "./track.service";
import { publishLearningArea } from "./learning-area.service";
import { linkAreaToUnit } from "./learning-area.service";
import { linkUnitToStage } from "./unit.service";
import { linkStageToLesson } from "./stage.service";
import { publishUnit } from "./unit.service";
import { publishStage } from "./stage.service";
import { publishLesson } from "./lesson.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import {
  createFixtureUser,
  createFixtureTrack,
  createFixtureLearningArea,
  createFixtureUnit,
  createFixturePedagogyStage,
  createFixtureLesson,
  createFixtureLessonBlock,
  createFixtureSource,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Track service", () => {
  let studentId: string;
  let editorId: string;
  let adminId: string;
  const userIds: string[] = [];
  const trackIds: string[] = [];
  const learningAreaIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("track-student", Role.STUDENT);
    const editor = await createFixtureUser("track-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("track-admin", Role.ADMIN);
    studentId = student.id;
    editorId = editor.id;
    adminId = admin.id;
    userIds.push(studentId, editorId, adminId);
  });

  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });
  const student = () => ({ userId: studentId, role: Role.STUDENT });

  it("CONTENT_EDITOR cria uma Track válida", async () => {
    const track = await createTrack(editor(), {
      slug: `test-fixture-track-create-${Date.now()}`,
      name: "TEST_FIXTURE_track_create",
      mode: "FORMACAO",
    });
    trackIds.push(track.id);
    expect(track.status).toBe("DRAFT");
  });

  it("STUDENT NÃO pode criar Track (segurança)", async () => {
    await expect(
      createTrack(student(), {
        slug: `test-fixture-track-student-${Date.now()}`,
        name: "TEST_FIXTURE_track_student",
        mode: "FORMACAO",
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it("CONTENT_EDITOR atualiza uma Track existente", async () => {
    const track = await createFixtureTrack("update");
    trackIds.push(track.id);

    const updated = await updateTrack(editor(), track.id, { name: "TEST_FIXTURE_track_updated" });
    expect(updated.name).toBe("TEST_FIXTURE_track_updated");
  });

  it("publicação SEM LearningArea publicada é rejeitada", async () => {
    const track = await createFixtureTrack("nopub");
    trackIds.push(track.id);

    await expect(publishTrack(admin(), track.id)).rejects.toThrow(PedagogyValidationError);
  });

  it("linkTrackToArea vincula e reorderTrackAreas reordena com segurança", async () => {
    const track = await createFixtureTrack("link");
    const area1 = await createFixtureLearningArea("link-1");
    const area2 = await createFixtureLearningArea("link-2");
    trackIds.push(track.id);
    learningAreaIds.push(area1.id, area2.id);

    await linkTrackToArea(editor(), track.id, { areaId: area1.id });
    await linkTrackToArea(editor(), track.id, { areaId: area2.id });

    const full = await getTrack(track.id);
    expect(full?.areas.map((a) => a.areaId)).toEqual([area1.id, area2.id]);

    await reorderTrackAreas(editor(), track.id, [area2.id, area1.id]);
    const reordered = await getTrack(track.id);
    expect(reordered?.areas.map((a) => a.areaId)).toEqual([area2.id, area1.id]);

    await expect(reorderTrackAreas(editor(), track.id, [area2.id])).rejects.toThrow(ReorderError);
    await expect(
      reorderTrackAreas(editor(), track.id, [area2.id, area1.id, "id-estranho"]),
    ).rejects.toThrow(ReorderError);

    await unlinkTrackFromArea(editor(), track.id, area1.id);
    const afterUnlink = await getTrack(track.id);
    expect(afterUnlink?.areas.map((a) => a.areaId)).toEqual([area2.id]);
  });

  it("publicação bottom-up completa: Lesson → Stage → Unit → Area → Track", async () => {
    const source = await createFixtureSource("track-pub-chain");
    const track = await createFixtureTrack("pubchain");
    const area = await createFixtureLearningArea("pubchain");
    const unit = await createFixtureUnit("pubchain");
    const stage = await createFixturePedagogyStage("pubchain");
    const lesson = await createFixtureLesson("pubchain");
    sourceIds.push(source.id);
    trackIds.push(track.id);
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
    await linkTrackToArea(editor(), track.id, { areaId: area.id });

    const publishedLesson = await publishLesson(admin(), lesson.id);
    expect(publishedLesson.status).toBe("PUBLISHED");

    const publishedStage = await publishStage(admin(), stage.id);
    expect(publishedStage.status).toBe("PUBLISHED");

    const publishedUnit = await publishUnit(admin(), unit.id);
    expect(publishedUnit.status).toBe("PUBLISHED");

    const publishedArea = await publishLearningArea(admin(), area.id);
    expect(publishedArea.status).toBe("PUBLISHED");

    const publishedTrack = await publishTrack(admin(), track.id);
    expect(publishedTrack.status).toBe("PUBLISHED");
  });

  it("CONTENT_EDITOR NÃO pode publicar (só ADMIN)", async () => {
    const track = await createFixtureTrack("editorpub");
    trackIds.push(track.id);
    await expect(publishTrack(editor(), track.id)).rejects.toThrow(AuthorizationError);
  });

  it("ADMIN pode arquivar uma Track", async () => {
    const track = await createFixtureTrack("archive");
    trackIds.push(track.id);
    const archived = await archiveTrack(admin(), track.id);
    expect(archived.status).toBe("ARCHIVED");
  });

  afterAll(async () => {
    await cleanupFixtures({
      citationIds,
      lessonIds,
      pedagogyStageIds,
      unitIds,
      learningAreaIds,
      trackIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
