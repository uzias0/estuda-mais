/**
 * Testes de integração reais de conteúdo relacionado (Módulo 8, seções
 * 25/27/28/31) — composição pura sobre `getReviewQueue` (Módulo 5) e
 * `getComplementaryContentForConcept` (Módulo 7), sem reimplementar nada.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { linkLessonToKnowledge } from "./lesson.service";
import { getRelatedLearningContent } from "./learning-content.service";
import {
  createLibraryItem,
  publishLibraryItem,
} from "@/modules/curation/server/services/library.service";
import {
  createCurrentAffair,
  publishCurrentAffair,
} from "@/modules/curation/server/services/current-affairs.service";
import {
  linkLibraryItemToKnowledge,
  linkCurrentAffairToKnowledge,
} from "@/modules/curation/server/services/content-linking.service";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  createFixtureReviewItem,
  createFixturePublishedLesson,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Learning content service (conteúdo relacionado)", () => {
  let studentId: string;
  let conceptId: string;
  let lessonId: string;
  let publishedLibraryItemId: string;
  let unpublishedLibraryItemId: string;
  let currentAffairId: string;
  let recentQuestionId: string;
  let reviewItemId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const lessonIds: string[] = [];
  const citationIds: string[] = [];
  const libraryItemIds: string[] = [];
  const currentAffairIds: string[] = [];
  const reviewItemIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("content-student", Role.STUDENT);
    const adminUser = await createFixtureUser("content-admin", Role.ADMIN);
    studentId = studentUser.id;
    userIds.push(studentId, adminUser.id);
    const adminActor = { userId: adminUser.id, role: Role.ADMIN };
    const editorActor = { userId: adminUser.id, role: Role.CONTENT_EDITOR };

    const source = await createFixtureSource("content");
    sourceIds.push(source.id);
    await prisma.source.update({
      where: { id: source.id },
      data: { url: "https://example.invalid/content", license: "CC-BY-4.0" },
    });
    const concept = await createFixtureConcept("content");
    conceptId = concept.id;
    conceptIds.push(conceptId);

    const lesson = await createFixturePublishedLesson("content");
    lessonId = lesson.lesson.id;
    lessonIds.push(lessonId);
    sourceIds.push(lesson.source.id);
    citationIds.push(lesson.citation.id);
    await linkLessonToKnowledge(editorActor, lessonId, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });

    // Revisão pendente do mesmo conceito.
    const reviewItem = await createFixtureReviewItem(studentId, {
      scope: "CONCEPT",
      conceptId,
      opts: { dueAt: new Date(), state: "REVIEW" },
    });
    reviewItemId = reviewItem.id;
    reviewItemIds.push(reviewItemId);

    // Biblioteca: um item publicado (deve aparecer) e um em DRAFT (não deve aparecer).
    const publishedItem = await createLibraryItem(adminActor, {
      title: "TEST_FIXTURE_content_library_published",
      materialType: "EBOOK",
      sourceId: source.id,
      isFree: true,
      freeAccessReason: "PUBLIC_DOMAIN",
    });
    await linkLibraryItemToKnowledge(adminActor, publishedItem.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishLibraryItem(adminActor, publishedItem.id);
    publishedLibraryItemId = publishedItem.id;
    libraryItemIds.push(publishedLibraryItemId);

    const draftItem = await createLibraryItem(adminActor, {
      title: "TEST_FIXTURE_content_library_draft",
      materialType: "EBOOK",
      sourceId: source.id,
      isFree: true,
      freeAccessReason: "PUBLIC_DOMAIN",
    });
    await linkLibraryItemToKnowledge(adminActor, draftItem.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    unpublishedLibraryItemId = draftItem.id;
    libraryItemIds.push(unpublishedLibraryItemId);

    // Atualidade publicada do mesmo conceito.
    const currentAffair = await createCurrentAffair(adminActor, {
      title: "TEST_FIXTURE_content_affair",
      summary: "Resumo de fixture de teste.",
      eventDate: new Date(),
      sourceId: source.id,
    });
    await linkCurrentAffairToKnowledge(adminActor, currentAffair.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishCurrentAffair(adminActor, currentAffair.id);
    currentAffairId = currentAffair.id;
    currentAffairIds.push(currentAffairId);

    // Questão recente publicada do mesmo conceito.
    const question = await createFixtureMultipleChoiceQuestion("content", source.id);
    recentQuestionId = question.id;
    questionIds.push(recentQuestionId);
    await createFixtureQuestionKnowledgeTag(recentQuestionId, "CONCEPT", conceptId);
    await publishQuestion(adminActor, recentQuestionId);
  });

  it("agrega revisão pendente, biblioteca, atualidade e questões recentes do MESMO conceito ensinado pela lição", async () => {
    const content = await getRelatedLearningContent(student(), lessonId, studentId);

    expect(content.conceptIds).toContain(conceptId);

    expect(content.pendingReview.count).toBeGreaterThanOrEqual(1);
    expect(content.pendingReview.items.map((i) => i.reviewItemId)).toContain(reviewItemId);

    expect(content.complementary).toHaveLength(1);
    const [bundle] = content.complementary;
    expect(bundle.conceptId).toBe(conceptId);
    expect(bundle.libraryItems.map((i) => i.id)).toContain(publishedLibraryItemId);
    expect(bundle.libraryItems.map((i) => i.id)).not.toContain(unpublishedLibraryItemId);
    expect(bundle.currentAffairs.map((a) => a.id)).toContain(currentAffairId);
    expect(bundle.recentQuestions.map((q) => q.id)).toContain(recentQuestionId);
  });

  it("lição sem nenhum conceito ensinado: conteúdo relacionado vazio, sem erro", async () => {
    const bareLesson = await createFixturePublishedLesson("content-bare");
    lessonIds.push(bareLesson.lesson.id);
    sourceIds.push(bareLesson.source.id);
    citationIds.push(bareLesson.citation.id);

    const content = await getRelatedLearningContent(student(), bareLesson.lesson.id, studentId);
    expect(content.conceptIds).toEqual([]);
    expect(content.complementary).toEqual([]);
  });

  afterAll(async () => {
    await cleanupFixtures({
      reviewItemIds,
      libraryItemIds,
      currentAffairIds,
      citationIds,
      lessonIds,
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
