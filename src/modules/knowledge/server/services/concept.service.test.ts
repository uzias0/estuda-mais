/**
 * Testes de integração reais contra o Postgres de desenvolvimento.
 * Cobre a matriz da seção 28 do Módulo 2 para Concept: criação, atualização,
 * publicação sem citation (rejeitada), publicação com citation (permitida),
 * e a camada de segurança (STUDENT/CONTENT_EDITOR/ADMIN).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { PublicationPolicyError } from "@/modules/curation/server/services/publicationPolicy";
import { createConcept, updateConcept, publishConcept, archiveConcept } from "./concept.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import { createFixtureUser, createFixtureSource, cleanupFixtures } from "@/test/fixtures";

describe("Concept service", () => {
  let studentId: string;
  let editorId: string;
  let adminId: string;
  let sourceId: string;
  const conceptIds: string[] = [];
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("concept-student", Role.STUDENT);
    const editor = await createFixtureUser("concept-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("concept-admin", Role.ADMIN);
    const source = await createFixtureSource("concept");
    studentId = student.id;
    editorId = editor.id;
    adminId = admin.id;
    sourceId = source.id;
    userIds.push(studentId, editorId, adminId);
    sourceIds.push(sourceId);
  });

  it("CONTENT_EDITOR cria um Concept válido", async () => {
    const concept = await createConcept(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-create-${Date.now()}`,
        name: "TEST_FIXTURE_concept_create",
        definition: "Definição de teste, não é conteúdo real.",
      },
    );
    conceptIds.push(concept.id);
    expect(concept.status).toBe("DRAFT");
  });

  it("STUDENT NÃO pode criar Concept (segurança)", async () => {
    await expect(
      createConcept(
        { userId: studentId, role: Role.STUDENT },
        {
          slug: `test-fixture-concept-student-${Date.now()}`,
          name: "TEST_FIXTURE_concept_student",
          definition: "Não deveria ser criado.",
        },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it("CONTENT_EDITOR atualiza um Concept existente", async () => {
    const concept = await createConcept(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-update-${Date.now()}`,
        name: "TEST_FIXTURE_concept_update_v1",
        definition: "Definição original.",
      },
    );
    conceptIds.push(concept.id);

    const updated = await updateConcept(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      concept.id,
      { name: "TEST_FIXTURE_concept_update_v2" },
    );
    expect(updated.name).toBe("TEST_FIXTURE_concept_update_v2");
  });

  it("publicação SEM Citation é rejeitada", async () => {
    const concept = await createConcept(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-nopub-${Date.now()}`,
        name: "TEST_FIXTURE_concept_no_citation",
        definition: "Sem citação — não pode publicar.",
      },
    );
    conceptIds.push(concept.id);

    await expect(publishConcept({ userId: adminId, role: Role.ADMIN }, concept.id)).rejects.toThrow(
      PublicationPolicyError,
    );
  });

  it("publicação COM Citation é permitida", async () => {
    const concept = await createConcept(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-pub-${Date.now()}`,
        name: "TEST_FIXTURE_concept_with_citation",
        definition: "Com citação — pode publicar.",
      },
    );
    conceptIds.push(concept.id);

    const citation = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "CONCEPT", entityId: concept.id, sourceId },
    );
    citationIds.push(citation.id);

    const published = await publishConcept({ userId: adminId, role: Role.ADMIN }, concept.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("CONTENT_EDITOR NÃO pode publicar (só ADMIN pode)", async () => {
    const concept = await createConcept(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-editorpub-${Date.now()}`,
        name: "TEST_FIXTURE_concept_editor_publish",
        definition: "Editor não pode publicar.",
      },
    );
    conceptIds.push(concept.id);

    await expect(
      publishConcept({ userId: editorId, role: Role.CONTENT_EDITOR }, concept.id),
    ).rejects.toThrow(AuthorizationError);
  });

  it("ADMIN pode arquivar um Concept", async () => {
    const concept = await createConcept(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-archive-${Date.now()}`,
        name: "TEST_FIXTURE_concept_archive",
        definition: "Para arquivar.",
      },
    );
    conceptIds.push(concept.id);

    const archived = await archiveConcept({ userId: adminId, role: Role.ADMIN }, concept.id);
    expect(archived.status).toBe("ARCHIVED");
  });

  afterAll(async () => {
    await cleanupFixtures({ conceptIds, citationIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
