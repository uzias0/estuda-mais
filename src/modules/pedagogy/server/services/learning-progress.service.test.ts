/**
 * Testes de integração reais do progresso agregado por Track/Stage (Módulo
 * 8, seção 33) — 0%, parcial e 100%, e a garantia de que só lições
 * PUBLICADAS entram no denominador (seção 13: rascunho não é conteúdo de
 * estudo do aluno).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { linkTrackToArea, publishTrack } from "./track.service";
import { linkAreaToUnit, publishLearningArea } from "./learning-area.service";
import { linkUnitToStage, publishUnit } from "./unit.service";
import { linkStageToLesson, publishStage } from "./stage.service";
import { startLesson, submitLessonActivity, completeLesson } from "./lesson-execution.service";
import { getTrackProgress, getStageProgress } from "./learning-progress.service";
import {
  createFixtureUser,
  createFixtureTrack,
  createFixtureLearningArea,
  createFixtureUnit,
  createFixturePedagogyStage,
  createFixturePublishedLesson,
  createFixtureLesson,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Learning progress service (agregado)", () => {
  let studentId: string;
  let otherStudentId: string;
  let trackId: string;
  let stageId: string;
  let lesson1Id: string;
  let lesson1BlockId: string;
  let lesson2Id: string;
  const userIds: string[] = [];
  const trackIds: string[] = [];
  const learningAreaIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const otherStudent = () => ({ userId: otherStudentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("progress-student", Role.STUDENT);
    const otherUser = await createFixtureUser("progress-other", Role.STUDENT);
    const adminUser = await createFixtureUser("progress-admin", Role.ADMIN);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId, adminUser.id);
    const adminActor = { userId: adminUser.id, role: Role.ADMIN };
    const editorActor = { userId: adminUser.id, role: Role.CONTENT_EDITOR };

    const track = await createFixtureTrack("progress");
    const area = await createFixtureLearningArea("progress");
    const unit = await createFixtureUnit("progress");
    const stage = await createFixturePedagogyStage("progress");
    trackIds.push(track.id);
    learningAreaIds.push(area.id);
    unitIds.push(unit.id);
    pedagogyStageIds.push(stage.id);
    trackId = track.id;
    stageId = stage.id;

    const lesson1 = await createFixturePublishedLesson("progress-1");
    const lesson2 = await createFixturePublishedLesson("progress-2");
    const draftLesson = await createFixtureLesson("progress-draft"); // nunca publicada — não entra no denominador
    lessonIds.push(lesson1.lesson.id, lesson2.lesson.id, draftLesson.id);
    sourceIds.push(lesson1.source.id, lesson2.source.id);
    citationIds.push(lesson1.citation.id, lesson2.citation.id);
    lesson1Id = lesson1.lesson.id;
    lesson1BlockId = lesson1.blocks[0].id;
    lesson2Id = lesson2.lesson.id;

    await linkStageToLesson(editorActor, stage.id, { lessonId: lesson1Id, order: 0 });
    await linkStageToLesson(editorActor, stage.id, { lessonId: lesson2Id, order: 1 });
    await linkStageToLesson(editorActor, stage.id, { lessonId: draftLesson.id, order: 2 });
    await linkUnitToStage(editorActor, unit.id, { stageId: stage.id });
    await linkAreaToUnit(editorActor, area.id, { unitId: unit.id });
    await linkTrackToArea(editorActor, track.id, { areaId: area.id });

    await publishStage(adminActor, stage.id);
    await publishUnit(adminActor, unit.id);
    await publishLearningArea(adminActor, area.id);
    await publishTrack(adminActor, track.id);
  });

  it("0%: nenhuma lição concluída ainda", async () => {
    const progress = await getTrackProgress(otherStudent(), otherStudentId, trackId);
    expect(progress).toMatchObject({
      lessonsTotal: 2,
      lessonsCompleted: 0,
      lessonsMastered: 0,
      percentage: 0,
    });
  });

  it("draft nunca entra no denominador — lessonsTotal conta só lições publicadas", async () => {
    const progress = await getStageProgress(otherStudent(), otherStudentId, stageId);
    expect(progress.lessonsTotal).toBe(2);
  });

  it("progresso parcial: 1 de 2 lições concluída (50%)", async () => {
    await startLesson(student(), lesson1Id);
    await submitLessonActivity(student(), { lessonId: lesson1Id, blockId: lesson1BlockId });
    await completeLesson(student(), lesson1Id);

    const progress = await getTrackProgress(student(), studentId, trackId);
    expect(progress).toMatchObject({ lessonsTotal: 2, lessonsCompleted: 1, percentage: 50 });

    const stageProgress = await getStageProgress(student(), studentId, stageId);
    expect(stageProgress.percentage).toBe(50);
  });

  it("progresso total: 2 de 2 lições concluídas (100%)", async () => {
    const started = await startLesson(student(), lesson2Id);
    await submitLessonActivity(student(), {
      lessonId: lesson2Id,
      blockId: started.currentBlock!.id,
    });
    await completeLesson(student(), lesson2Id);

    const progress = await getTrackProgress(student(), studentId, trackId);
    expect(progress).toMatchObject({ lessonsTotal: 2, lessonsCompleted: 2, percentage: 100 });
  });

  it("privacidade: outro aluno não pode consultar o progresso de terceiro", async () => {
    await expect(
      getTrackProgress({ userId: otherStudentId, role: Role.STUDENT }, studentId, trackId),
    ).rejects.toThrow(AuthorizationError);
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
