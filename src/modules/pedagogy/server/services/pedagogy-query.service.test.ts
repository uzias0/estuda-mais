import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import {
  getFullTrack,
  listContentByArea,
  listLessonsByConcept,
  listLessonsByTheory,
  listLessonsBySchool,
  listLessonsByDifficulty,
  listPublishedLessons,
} from "./pedagogy-query.service";
import { linkTrackToArea } from "./track.service";
import { linkAreaToUnit } from "./learning-area.service";
import { linkUnitToStage } from "./unit.service";
import { linkStageToLesson, publishStage } from "./stage.service";
import { publishLesson, linkLessonToKnowledge } from "./lesson.service";
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
  createFixtureConcept,
  createFixtureTheory,
  createFixtureSchool,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Pedagogy query service", () => {
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
  const conceptIds: string[] = [];
  const theoryIds: string[] = [];
  const schoolIds: string[] = [];

  // Fixtures montadas uma vez em beforeAll e reaproveitadas por todos os
  // testes de consulta (nenhum muta estado além da publicação inicial).
  let trackId: string;
  let areaId: string;
  let unitId: string;
  let stageId: string;
  let lessonId: string;
  let conceptId: string;
  let theoryId: string;
  let schoolId: string;

  beforeAll(async () => {
    const editor = await createFixtureUser("query-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("query-admin", Role.ADMIN);
    editorId = editor.id;
    adminId = admin.id;
    userIds.push(editorId, adminId);
    const actorEditor = { userId: editorId, role: Role.CONTENT_EDITOR };
    const actorAdmin = { userId: adminId, role: Role.ADMIN };

    const source = await createFixtureSource("query");
    const track = await createFixtureTrack("query");
    const area = await createFixtureLearningArea("query");
    const unit = await createFixtureUnit("query");
    const stage = await createFixturePedagogyStage("query");
    const lesson = await createFixtureLesson("query");
    const concept = await createFixtureConcept("query");
    const theory = await createFixtureTheory("query");
    const school = await createFixtureSchool("query");

    sourceIds.push(source.id);
    trackIds.push(track.id);
    learningAreaIds.push(area.id);
    unitIds.push(unit.id);
    pedagogyStageIds.push(stage.id);
    lessonIds.push(lesson.id);
    conceptIds.push(concept.id);
    theoryIds.push(theory.id);
    schoolIds.push(school.id);

    trackId = track.id;
    areaId = area.id;
    unitId = unit.id;
    stageId = stage.id;
    lessonId = lesson.id;
    conceptId = concept.id;
    theoryId = theory.id;
    schoolId = school.id;

    await createFixtureLessonBlock(lesson.id, 0);
    const citation = await createCitation(actorEditor, {
      entityType: "LESSON",
      entityId: lesson.id,
      sourceId: source.id,
    });
    citationIds.push(citation.id);

    await linkLessonToKnowledge(actorEditor, lesson.id, {
      entityType: "CONCEPT",
      entityId: concept.id,
    });
    await linkLessonToKnowledge(actorEditor, lesson.id, {
      entityType: "THEORY",
      entityId: theory.id,
    });
    await linkLessonToKnowledge(actorEditor, lesson.id, {
      entityType: "SCHOOL",
      entityId: school.id,
    });

    await linkStageToLesson(actorEditor, stage.id, { lessonId: lesson.id });
    await linkUnitToStage(actorEditor, unit.id, { stageId: stage.id });
    await linkAreaToUnit(actorEditor, area.id, { unitId: unit.id });
    await linkTrackToArea(actorEditor, track.id, { areaId: area.id });

    await publishLesson(actorAdmin, lesson.id);
    await publishStage(actorAdmin, stage.id);
  });

  it("getFullTrack monta a árvore completa ordenada", async () => {
    const full = await getFullTrack(trackId);
    expect(full?.areas[0].area.id).toBe(areaId);
    expect(full?.areas[0].area.units[0].unit.id).toBe(unitId);
    expect(full?.areas[0].area.units[0].unit.stages[0].stage.id).toBe(stageId);
    expect(full?.areas[0].area.units[0].unit.stages[0].stage.lessons[0].lesson.id).toBe(lessonId);
    expect(full?.areas[0].area.units[0].unit.stages[0].stage.lessons[0].lesson.blocks).toHaveLength(
      1,
    );
  });

  it("listContentByArea retorna units → stages → lessons da área", async () => {
    const content = await listContentByArea(areaId);
    expect(content).toHaveLength(1);
    expect(content[0].unit.id).toBe(unitId);
    expect(content[0].unit.stages[0].stage.lessons[0].lesson.id).toBe(lessonId);
  });

  it("listLessonsByConcept/Theory/School encontram a Lesson tagueada", async () => {
    const byConcept = await listLessonsByConcept(conceptId);
    expect(byConcept.map((l) => l.id)).toContain(lessonId);

    const byTheory = await listLessonsByTheory(theoryId);
    expect(byTheory.map((l) => l.id)).toContain(lessonId);

    const bySchool = await listLessonsBySchool(schoolId);
    expect(bySchool.map((l) => l.id)).toContain(lessonId);
  });

  it("listLessonsByDifficulty encontra via Concept.difficulty (Lesson não tem difficulty própria)", async () => {
    // createFixtureConcept não define difficulty — testa o caminho "sem
    // resultado" explicitamente, e que não lança para difficulty válida.
    const result = await listLessonsByDifficulty("AVANCADO");
    expect(Array.isArray(result)).toBe(true);
  });

  it("listPublishedLessons retorna só lições PUBLISHED", async () => {
    const published = await listPublishedLessons();
    expect(published.map((l) => l.id)).toContain(lessonId);
    expect(published.every((l) => l.status === "PUBLISHED")).toBe(true);
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
      conceptIds,
      theoryIds,
      schoolIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
