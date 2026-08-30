/**
 * Testes de integração reais de `content-linking.service.ts` (Módulo 7,
 * seção 10/33) — reaproveita `resolveEntity`/`entityExists`, mesmo
 * mecanismo polimórfico de `LessonKnowledgeTag`/`QuestionKnowledgeTag`.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import {
  linkLibraryItemToKnowledge,
  unlinkLibraryItemFromKnowledge,
  linkCurrentAffairToKnowledge,
  unlinkCurrentAffairFromKnowledge,
} from "./content-linking.service";
import { createLibraryItem } from "./library.service";
import { createCurrentAffair } from "./current-affairs.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureTheory,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Content linking service", () => {
  let studentId: string;
  let editorId: string;
  let sourceId: string;
  let conceptId: string;
  let theoryId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const theoryIds: string[] = [];
  const libraryItemIds: string[] = [];
  const currentAffairIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("link-student", Role.STUDENT);
    const editor = await createFixtureUser("link-editor", Role.CONTENT_EDITOR);
    const source = await createFixtureSource("link");
    const concept = await createFixtureConcept("link");
    const theory = await createFixtureTheory("link");

    studentId = student.id;
    editorId = editor.id;
    sourceId = source.id;
    conceptId = concept.id;
    theoryId = theory.id;

    userIds.push(studentId, editorId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    theoryIds.push(theoryId);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });

  it("linkLibraryItemToKnowledge vincula, rejeita entidade inexistente, e unlink funciona", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_link_lib",
      materialType: "LIVRO",
      sourceId,
    });
    libraryItemIds.push(item.id);

    const tag = await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    expect(tag.entityId).toBe(conceptId);

    await expect(
      linkLibraryItemToKnowledge(editor(), item.id, {
        entityType: "CONCEPT",
        entityId: "concept-fantasma",
      }),
    ).rejects.toThrow(NotFoundError);

    await expect(
      linkLibraryItemToKnowledge(editor(), "item-fantasma", {
        entityType: "CONCEPT",
        entityId: conceptId,
      }),
    ).rejects.toThrow(NotFoundError);

    await unlinkLibraryItemFromKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    const remaining = await prisma.libraryItemKnowledgeTag.count({
      where: { libraryItemId: item.id },
    });
    expect(remaining).toBe(0);
  });

  it("linkCurrentAffairToKnowledge vincula, rejeita entidade inexistente, e unlink funciona", async () => {
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_link_ca",
      summary: "x",
      eventDate: new Date(),
      sourceId,
    });
    currentAffairIds.push(affair.id);

    const tag = await linkCurrentAffairToKnowledge(editor(), affair.id, {
      entityType: "THEORY",
      entityId: theoryId,
    });
    expect(tag.entityId).toBe(theoryId);

    await expect(
      linkCurrentAffairToKnowledge(editor(), affair.id, {
        entityType: "THEORY",
        entityId: "theory-fantasma",
      }),
    ).rejects.toThrow(NotFoundError);

    await unlinkCurrentAffairFromKnowledge(editor(), affair.id, {
      entityType: "THEORY",
      entityId: theoryId,
    });
    const remaining = await prisma.currentAffairKnowledgeTag.count({
      where: { currentAffairId: affair.id },
    });
    expect(remaining).toBe(0);
  });

  it("STUDENT não pode vincular conhecimento a nenhum dos dois", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_link_auth_lib",
      materialType: "LIVRO",
      sourceId,
    });
    libraryItemIds.push(item.id);
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_link_auth_ca",
      summary: "x",
      eventDate: new Date(),
      sourceId,
    });
    currentAffairIds.push(affair.id);

    await expect(
      linkLibraryItemToKnowledge(student(), item.id, {
        entityType: "CONCEPT",
        entityId: conceptId,
      }),
    ).rejects.toThrow(AuthorizationError);
    await expect(
      linkCurrentAffairToKnowledge(student(), affair.id, {
        entityType: "CONCEPT",
        entityId: conceptId,
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it("linkLibraryItemToKnowledge é idempotente (upsert) — repetir não duplica nem falha", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_link_idempotent",
      materialType: "LIVRO",
      sourceId,
    });
    libraryItemIds.push(item.id);

    await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });

    const count = await prisma.libraryItemKnowledgeTag.count({ where: { libraryItemId: item.id } });
    expect(count).toBe(1);
  });

  afterAll(async () => {
    await cleanupFixtures({
      libraryItemIds,
      currentAffairIds,
      conceptIds,
      theoryIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
