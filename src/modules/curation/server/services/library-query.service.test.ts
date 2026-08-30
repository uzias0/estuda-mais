/**
 * Testes de integração reais de `library-query.service.ts` (Módulo 7,
 * seção 9/31/32) — só consultas PUBLISHED por padrão, busca textual,
 * livros gratuitos, relação por conceito/disciplina/teoria, e descoberta
 * pedagógica derivada (sem FK direta à árvore pedagógica).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import {
  listPublishedLibraryItems,
  searchLibrary,
  listFreeBooks,
  listLibraryByConcept,
  listLibraryByDiscipline,
  listLibraryByTheory,
  getLibraryItemPedagogicalContext,
} from "./library-query.service";
import { createLibraryItem, publishLibraryItem } from "./library.service";
import { linkLibraryItemToKnowledge } from "./content-linking.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureDiscipline,
  createFixtureTheory,
  createFixtureTrack,
  createFixtureLearningArea,
  createFixtureUnit,
  createFixturePedagogyStage,
  createFixtureLesson,
  cleanupFixtures,
} from "@/test/fixtures";
import { linkTrackToArea } from "@/modules/pedagogy/server/services/track.service";
import { linkAreaToUnit } from "@/modules/pedagogy/server/services/learning-area.service";
import { linkUnitToStage } from "@/modules/pedagogy/server/services/unit.service";
import { linkStageToLesson } from "@/modules/pedagogy/server/services/stage.service";
import { linkLessonToKnowledge } from "@/modules/pedagogy/server/services/lesson.service";

describe("Library query service", () => {
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let disciplineId: string;
  let theoryId: string;
  let publishedFreeBookId: string;
  let publishedNonFreeId: string;
  let draftId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const disciplineIds: string[] = [];
  const theoryIds: string[] = [];
  const libraryItemIds: string[] = [];
  const trackIds: string[] = [];
  const learningAreaIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const lessonIds: string[] = [];

  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  beforeAll(async () => {
    const adminUser = await createFixtureUser("libq-admin", Role.ADMIN);
    const source = await createFixtureSource("libq");
    const concept = await createFixtureConcept("libq");
    const discipline = await createFixtureDiscipline("libq");
    const theory = await createFixtureTheory("libq");

    adminId = adminUser.id;
    sourceId = source.id;
    conceptId = concept.id;
    disciplineId = discipline.id;
    theoryId = theory.id;

    userIds.push(adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    disciplineIds.push(disciplineId);
    theoryIds.push(theoryId);

    await prisma.source.update({
      where: { id: sourceId },
      data: { url: "https://example.invalid/libq", license: "CC-BY-4.0" },
    });

    const freeBook = await createLibraryItem(admin(), {
      title: "TEST_FIXTURE_libq_free_searchable_term",
      materialType: "EBOOK",
      sourceId,
      isFree: true,
      freeAccessReason: "PUBLIC_DOMAIN",
    });
    await linkLibraryItemToKnowledge(admin(), freeBook.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await linkLibraryItemToKnowledge(admin(), freeBook.id, {
      entityType: "DISCIPLINE",
      entityId: disciplineId,
    });
    await linkLibraryItemToKnowledge(admin(), freeBook.id, {
      entityType: "THEORY",
      entityId: theoryId,
    });
    await publishLibraryItem(admin(), freeBook.id);
    publishedFreeBookId = freeBook.id;

    const nonFree = await createLibraryItem(admin(), {
      title: "TEST_FIXTURE_libq_nonfree",
      materialType: "ARTIGO",
      sourceId,
    });
    await linkLibraryItemToKnowledge(admin(), nonFree.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishLibraryItem(admin(), nonFree.id);
    publishedNonFreeId = nonFree.id;

    const draft = await createLibraryItem(admin(), {
      title: "TEST_FIXTURE_libq_draft",
      materialType: "LIVRO",
      sourceId,
    });
    draftId = draft.id;

    libraryItemIds.push(publishedFreeBookId, publishedNonFreeId, draftId);

    // Cadeia pedagógica até o conceito, para testar a descoberta derivada.
    const track = await createFixtureTrack("libq");
    const area = await createFixtureLearningArea("libq");
    const unit = await createFixtureUnit("libq");
    const stage = await createFixturePedagogyStage("libq");
    const lesson = await createFixtureLesson("libq");
    trackIds.push(track.id);
    learningAreaIds.push(area.id);
    unitIds.push(unit.id);
    pedagogyStageIds.push(stage.id);
    lessonIds.push(lesson.id);

    await linkLessonToKnowledge(admin(), lesson.id, { entityType: "CONCEPT", entityId: conceptId });
    await linkStageToLesson(admin(), stage.id, { lessonId: lesson.id });
    await linkUnitToStage(admin(), unit.id, { stageId: stage.id });
    await linkAreaToUnit(admin(), area.id, { unitId: unit.id });
    await linkTrackToArea(admin(), track.id, { areaId: area.id });
  });

  it("listPublishedLibraryItems só retorna PUBLISHED", async () => {
    const list = await listPublishedLibraryItems();
    const ids = list.map((i) => i.id);
    expect(ids).toContain(publishedFreeBookId);
    expect(ids).toContain(publishedNonFreeId);
    expect(ids).not.toContain(draftId);
  });

  it("searchLibrary busca por título (case-insensitive)", async () => {
    const results = await searchLibrary("searchable_term");
    expect(results.map((r) => r.id)).toContain(publishedFreeBookId);
  });

  it("listFreeBooks só retorna isFree=true e publicados", async () => {
    const results = await listFreeBooks();
    const ids = results.map((r) => r.id);
    expect(ids).toContain(publishedFreeBookId);
    expect(ids).not.toContain(publishedNonFreeId);
    expect(ids).not.toContain(draftId);
  });

  it("listLibraryByConcept/Discipline/Theory encontram o item tagueado", async () => {
    expect((await listLibraryByConcept(conceptId)).map((i) => i.id)).toContain(publishedFreeBookId);
    expect((await listLibraryByDiscipline(disciplineId)).map((i) => i.id)).toContain(
      publishedFreeBookId,
    );
    expect((await listLibraryByTheory(theoryId)).map((i) => i.id)).toContain(publishedFreeBookId);
  });

  it("getLibraryItemPedagogicalContext descobre a trilha via o conceito tagueado, sem FK direta", async () => {
    const context = await getLibraryItemPedagogicalContext(publishedFreeBookId);
    expect(context.trackIds).toContain(trackIds[0]);
    expect(context.lessonIds).toContain(lessonIds[0]);
  });

  afterAll(async () => {
    await cleanupFixtures({
      libraryItemIds,
      lessonIds,
      pedagogyStageIds,
      unitIds,
      learningAreaIds,
      trackIds,
      conceptIds,
      disciplineIds,
      theoryIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
