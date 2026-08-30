/**
 * Testes de integração reais — AcademicPerson: criação, atualização,
 * publicação sem/com citation (Módulo 2, seção 28).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { PublicationPolicyError } from "@/modules/curation/server/services/publicationPolicy";
import {
  createAcademicPerson,
  updateAcademicPerson,
  publishAcademicPerson,
} from "./academicPerson.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import { createFixtureUser, createFixtureSource, cleanupFixtures } from "@/test/fixtures";

describe("AcademicPerson service", () => {
  let editorId: string;
  let adminId: string;
  let sourceId: string;
  const personIds: string[] = [];
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("person-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("person-admin", Role.ADMIN);
    const source = await createFixtureSource("person");
    editorId = editor.id;
    adminId = admin.id;
    sourceId = source.id;
    userIds.push(editorId, adminId);
    sourceIds.push(sourceId);
  });

  it("cria uma AcademicPerson válida", async () => {
    const person = await createAcademicPerson(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-person-create-${Date.now()}`, name: "TEST_FIXTURE_person_create" },
    );
    personIds.push(person.id);
    expect(person.status).toBe("DRAFT");
  });

  it("rejeita deathDate anterior a birthDate", async () => {
    await expect(
      createAcademicPerson(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          slug: `test-fixture-person-dates-${Date.now()}`,
          name: "TEST_FIXTURE_person_dates",
          birthDate: new Date("1950-01-01"),
          deathDate: new Date("1900-01-01"),
        },
      ),
    ).rejects.toThrow();
  });

  it("atualiza uma AcademicPerson existente", async () => {
    const person = await createAcademicPerson(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-person-update-${Date.now()}`, name: "TEST_FIXTURE_person_update_v1" },
    );
    personIds.push(person.id);

    const updated = await updateAcademicPerson(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      person.id,
      { bio: "Biografia de teste." },
    );
    expect(updated.bio).toBe("Biografia de teste.");
  });

  it("publicação SEM Citation é rejeitada", async () => {
    const person = await createAcademicPerson(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-person-nopub-${Date.now()}`, name: "TEST_FIXTURE_person_no_citation" },
    );
    personIds.push(person.id);

    await expect(
      publishAcademicPerson({ userId: adminId, role: Role.ADMIN }, person.id),
    ).rejects.toThrow(PublicationPolicyError);
  });

  it("publicação COM Citation é permitida", async () => {
    const person = await createAcademicPerson(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-person-pub-${Date.now()}`, name: "TEST_FIXTURE_person_with_citation" },
    );
    personIds.push(person.id);

    const citation = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "PERSON", entityId: person.id, sourceId },
    );
    citationIds.push(citation.id);

    const published = await publishAcademicPerson({ userId: adminId, role: Role.ADMIN }, person.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("STUDENT não pode criar AcademicPerson (segurança)", async () => {
    const student = await createFixtureUser("person-student-inline", Role.STUDENT);
    userIds.push(student.id);
    await expect(
      createAcademicPerson(
        { userId: student.id, role: Role.STUDENT },
        { slug: `test-fixture-person-student-${Date.now()}`, name: "TEST_FIXTURE_person_student" },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ personIds, citationIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
