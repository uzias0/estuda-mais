/**
 * Testes de integração reais — Theory: criação, relações (School/Concept),
 * publicação, procedência (Módulo 2, seção 28).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { PublicationPolicyError } from "@/modules/curation/server/services/publicationPolicy";
import {
  createTheory,
  linkTheoryToSchool,
  linkTheoryToConcept,
  publishTheory,
} from "./theory.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureSchool,
  createFixtureConcept,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Theory service", () => {
  let editorId: string;
  let adminId: string;
  let sourceId: string;
  let schoolId: string;
  let conceptId: string;
  const theoryIds: string[] = [];
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const schoolIds: string[] = [];
  const conceptIds: string[] = [];
  const citationIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("theory-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("theory-admin", Role.ADMIN);
    const source = await createFixtureSource("theory");
    const school = await createFixtureSchool("theory");
    const concept = await createFixtureConcept("theory");
    editorId = editor.id;
    adminId = admin.id;
    sourceId = source.id;
    schoolId = school.id;
    conceptId = concept.id;
    userIds.push(editorId, adminId);
    sourceIds.push(sourceId);
    schoolIds.push(schoolId);
    conceptIds.push(conceptId);
  });

  it("cria uma Theory válida", async () => {
    const theory = await createTheory(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-theory-create-${Date.now()}`, name: "TEST_FIXTURE_theory_create" },
    );
    theoryIds.push(theory.id);
    expect(theory.status).toBe("DRAFT");
  });

  it("relaciona a Theory com School e Concept (N:N preservada)", async () => {
    const theory = await createTheory(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-theory-links-${Date.now()}`, name: "TEST_FIXTURE_theory_links" },
    );
    theoryIds.push(theory.id);

    await linkTheoryToSchool({ userId: editorId, role: Role.CONTENT_EDITOR }, theory.id, schoolId);
    const withConcept = await linkTheoryToConcept(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      theory.id,
      conceptId,
    );
    expect(withConcept.concepts.map((c) => c.id)).toContain(conceptId);

    const reloaded = await prisma.theory.findUnique({
      where: { id: theory.id },
      include: { schools: true, concepts: true },
    });
    expect(reloaded?.schools.map((s) => s.id)).toContain(schoolId);
  });

  it("publicação SEM Citation é rejeitada", async () => {
    const theory = await createTheory(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-theory-nopub-${Date.now()}`, name: "TEST_FIXTURE_theory_no_citation" },
    );
    theoryIds.push(theory.id);

    await expect(publishTheory({ userId: adminId, role: Role.ADMIN }, theory.id)).rejects.toThrow(
      PublicationPolicyError,
    );
  });

  it("publicação COM Citation é permitida", async () => {
    const theory = await createTheory(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-theory-pub-${Date.now()}`, name: "TEST_FIXTURE_theory_with_citation" },
    );
    theoryIds.push(theory.id);

    const citation = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "THEORY", entityId: theory.id, sourceId },
    );
    citationIds.push(citation.id);

    const published = await publishTheory({ userId: adminId, role: Role.ADMIN }, theory.id);
    expect(published.status).toBe("PUBLISHED");
  });

  afterAll(async () => {
    await cleanupFixtures({ theoryIds, citationIds, sourceIds, schoolIds, conceptIds, userIds });
    await prisma.$disconnect();
  });
});
