/**
 * Testes de integração reais — AcademicWork: criação, autor, fonte,
 * conceitos (Módulo 2, seção 28).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { createAcademicWork, addAuthorToWork, removeAuthorFromWork } from "./academicWork.service";
import { linkConceptToWork } from "./concept.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureAcademicPerson,
  createFixtureConcept,
  cleanupFixtures,
} from "@/test/fixtures";

describe("AcademicWork service", () => {
  let editorId: string;
  let sourceId: string;
  let personId: string;
  let conceptId: string;
  const workIds: string[] = [];
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const personIds: string[] = [];
  const conceptIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("work-editor", Role.CONTENT_EDITOR);
    const source = await createFixtureSource("work");
    const person = await createFixtureAcademicPerson("work");
    const concept = await createFixtureConcept("work");
    editorId = editor.id;
    sourceId = source.id;
    personId = person.id;
    conceptId = concept.id;
    userIds.push(editorId);
    sourceIds.push(sourceId);
    personIds.push(personId);
    conceptIds.push(conceptId);
  });

  it("cria uma AcademicWork com sourceId de procedência bibliográfica", async () => {
    const work = await createAcademicWork(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { title: "TEST_FIXTURE_work_create", type: "LIVRO", sourceId },
    );
    workIds.push(work.id);
    expect(work.sourceId).toBe(sourceId);
  });

  it("rejeita sourceId inexistente", async () => {
    await expect(
      createAcademicWork(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { title: "TEST_FIXTURE_work_bad_source", type: "LIVRO", sourceId: "id-inexistente" },
      ),
    ).rejects.toThrow();
  });

  it("associa um AcademicPerson como autor", async () => {
    const work = await createAcademicWork(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { title: "TEST_FIXTURE_work_author", type: "ARTIGO" },
    );
    workIds.push(work.id);

    const link = await addAuthorToWork(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { personId, workId: work.id, role: "AUTOR" },
    );
    expect(link.personId).toBe(personId);

    const reloaded = await prisma.academicWork.findUnique({
      where: { id: work.id },
      include: { authors: true },
    });
    expect(reloaded?.authors).toHaveLength(1);

    await removeAuthorFromWork({ userId: editorId, role: Role.CONTENT_EDITOR }, personId, work.id);
    const afterRemoval = await prisma.academicWork.findUnique({
      where: { id: work.id },
      include: { authors: true },
    });
    expect(afterRemoval?.authors).toHaveLength(0);
  });

  it("relaciona a obra a um Concept (obra apresenta conceito)", async () => {
    const work = await createAcademicWork(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { title: "TEST_FIXTURE_work_concept", type: "LIVRO" },
    );
    workIds.push(work.id);

    const updated = await linkConceptToWork(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      conceptId,
      work.id,
    );
    expect(updated.works.map((w) => w.id)).toContain(work.id);
  });

  afterAll(async () => {
    await cleanupFixtures({ workIds, sourceIds, personIds, conceptIds, userIds });
    await prisma.$disconnect();
  });
});
