/**
 * Testes de integração reais — AcademicRelation: relação válida, source/target
 * inexistente, relationType inválido, duplicata, publicação com nós não
 * aprovados, publicação com evidência válida (Módulo 2, seção 28).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import {
  PublicationPolicyError,
  NotFoundError,
} from "@/modules/curation/server/services/publicationPolicy";
import { createAcademicRelation, publishAcademicRelation } from "./academicRelation.service";
import { publishAcademicPerson } from "./academicPerson.service";
import { publishTheory } from "./theory.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureAcademicPerson,
  createFixtureTheory,
  cleanupFixtures,
} from "@/test/fixtures";

describe("AcademicRelation service", () => {
  let editorId: string;
  let adminId: string;
  let sourceId: string;
  let personAId: string;
  let personBId: string;
  let theoryId: string;
  const relationIds: string[] = [];
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const personIds: string[] = [];
  const theoryIds: string[] = [];
  const citationIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("relation-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("relation-admin", Role.ADMIN);
    const source = await createFixtureSource("relation");
    const personA = await createFixtureAcademicPerson("relation-a");
    const personB = await createFixtureAcademicPerson("relation-b");
    const theory = await createFixtureTheory("relation");
    editorId = editor.id;
    adminId = admin.id;
    sourceId = source.id;
    personAId = personA.id;
    personBId = personB.id;
    theoryId = theory.id;
    userIds.push(editorId, adminId);
    sourceIds.push(sourceId);
    personIds.push(personAId, personBId);
    theoryIds.push(theoryId);
  });

  it("cria uma relação válida (Person INFLUENCIOU Person)", async () => {
    const relation = await createAcademicRelation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        sourceType: "PERSON",
        sourceId: personAId,
        relationType: "INFLUENCIOU",
        targetType: "PERSON",
        targetId: personBId,
      },
    );
    relationIds.push(relation.id);
    expect(relation.status).toBe("DRAFT");
  });

  it("rejeita quando o nó de origem (sourceId) não existe", async () => {
    await expect(
      createAcademicRelation(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          sourceType: "PERSON",
          sourceId: "id-inexistente",
          relationType: "INFLUENCIOU",
          targetType: "PERSON",
          targetId: personBId,
        },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejeita quando o nó de destino (targetId) não existe", async () => {
    await expect(
      createAcademicRelation(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          sourceType: "PERSON",
          sourceId: personAId,
          relationType: "INFLUENCIOU",
          targetType: "PERSON",
          targetId: "id-inexistente",
        },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejeita relationType fora da allow-list", async () => {
    await expect(
      createAcademicRelation(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          sourceType: "PERSON",
          sourceId: personAId,
          relationType: "TIPO_INVENTADO_AGORA",
          targetType: "PERSON",
          targetId: personBId,
        },
      ),
    ).rejects.toThrow();
  });

  it("rejeita duplicata (mesma origem, tipo e destino já existentes)", async () => {
    const relation = await createAcademicRelation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        sourceType: "PERSON",
        sourceId: personAId,
        relationType: "DESENVOLVEU",
        targetType: "THEORY",
        targetId: theoryId,
      },
    );
    relationIds.push(relation.id);

    await expect(
      createAcademicRelation(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          sourceType: "PERSON",
          sourceId: personAId,
          relationType: "DESENVOLVEU",
          targetType: "THEORY",
          targetId: theoryId,
        },
      ),
    ).rejects.toThrow();
  });

  it("publicação é rejeitada quando os nós envolvidos não estão aprovados", async () => {
    const relation = await createAcademicRelation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        sourceType: "PERSON",
        sourceId: personAId,
        relationType: "COLABOROU_COM",
        targetType: "PERSON",
        targetId: personBId,
      },
    );
    relationIds.push(relation.id);

    const citation = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "ACADEMIC_RELATION", entityId: relation.id, sourceId },
    );
    citationIds.push(citation.id);

    // Os dois AcademicPerson envolvidos continuam DRAFT (nunca publicados) —
    // mesmo com evidência, a relação não pode ser publicada.
    await expect(
      publishAcademicRelation({ userId: adminId, role: Role.ADMIN }, relation.id),
    ).rejects.toThrow(PublicationPolicyError);
  });

  it("publicação é permitida com evidência válida e nós aprovados", async () => {
    // Aprova (publica) os dois nós envolvidos primeiro.
    const citationA = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "PERSON", entityId: personAId, sourceId },
    );
    const citationB = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "PERSON", entityId: personBId, sourceId },
    );
    citationIds.push(citationA.id, citationB.id);
    await publishAcademicPerson({ userId: adminId, role: Role.ADMIN }, personAId);
    await publishAcademicPerson({ userId: adminId, role: Role.ADMIN }, personBId);

    const relation = await createAcademicRelation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        sourceType: "PERSON",
        sourceId: personAId,
        relationType: "CRITICADA_POR",
        targetType: "PERSON",
        targetId: personBId,
      },
    );
    relationIds.push(relation.id);

    const relationCitation = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "ACADEMIC_RELATION", entityId: relation.id, sourceId },
    );
    citationIds.push(relationCitation.id);

    const published = await publishAcademicRelation(
      { userId: adminId, role: Role.ADMIN },
      relation.id,
    );
    expect(published.status).toBe("PUBLISHED");
  });

  it("PERIOD/DEVELOPMENTAL_STAGE (sem status) são sempre tratados como aprovados", async () => {
    const period = await prisma.historicalPeriod.create({
      data: {
        slug: `test-fixture-period-relation-${Date.now()}`,
        name: "TEST_FIXTURE_period_relation",
      },
    });

    const citationTheory = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "THEORY", entityId: theoryId, sourceId },
    );
    citationIds.push(citationTheory.id);
    await publishTheory({ userId: adminId, role: Role.ADMIN }, theoryId);

    const relation = await createAcademicRelation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        sourceType: "THEORY",
        sourceId: theoryId,
        relationType: "APLICADO_EM",
        targetType: "PERIOD",
        targetId: period.id,
      },
    );
    relationIds.push(relation.id);

    const relationCitation = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "ACADEMIC_RELATION", entityId: relation.id, sourceId },
    );
    citationIds.push(relationCitation.id);

    const published = await publishAcademicRelation(
      { userId: adminId, role: Role.ADMIN },
      relation.id,
    );
    expect(published.status).toBe("PUBLISHED");

    await prisma.historicalPeriod.delete({ where: { id: period.id } });
  });

  afterAll(async () => {
    await cleanupFixtures({
      academicRelationIds: relationIds,
      citationIds,
      sourceIds,
      personIds,
      theoryIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
