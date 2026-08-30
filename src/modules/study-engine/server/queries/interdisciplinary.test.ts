/**
 * Testes de integração reais de conexões interdisciplinares (Módulo 10,
 * seção 15/40) — só `AcademicRelation` PUBLICADA real conta; nada é
 * inventado por semelhança de assunto.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { findInterdisciplinaryConnections } from "./interdisciplinary";
import { publishConcept } from "@/modules/knowledge/server/services/concept.service";
import { publishDiscipline } from "@/modules/knowledge/server/services/discipline.service";
import { publishAcademicPerson } from "@/modules/knowledge/server/services/academicPerson.service";
import {
  createAcademicRelation,
  publishAcademicRelation,
} from "@/modules/knowledge/server/services/academicRelation.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureDiscipline,
  createFixtureAcademicPerson,
  cleanupFixtures,
} from "@/test/fixtures";

describe("interdisciplinary connections query", () => {
  let adminId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const disciplineIds: string[] = [];
  const personIds: string[] = [];
  const citationIds: string[] = [];
  const academicRelationIds: string[] = [];

  const admin = () => ({ userId: adminId, role: Role.ADMIN });
  const editor = () => ({ userId: adminId, role: Role.CONTENT_EDITOR });

  beforeAll(async () => {
    const adminUser = await createFixtureUser("interdisc-admin", Role.ADMIN);
    adminId = adminUser.id;
    userIds.push(adminId);
  });

  it("sem nenhuma AcademicRelation, não há conexão interdisciplinar", async () => {
    const concept = await createFixtureConcept("interdisc-lonely");
    conceptIds.push(concept.id);
    const connections = await findInterdisciplinaryConnections(concept.id);
    expect(connections).toEqual([]);
  });

  it("relação PUBLICADA com outra Discipline conta como conexão interdisciplinar", async () => {
    const source = await createFixtureSource("interdisc-real");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("interdisc-real");
    conceptIds.push(concept.id);
    const discipline = await createFixtureDiscipline("interdisc-real");
    disciplineIds.push(discipline.id);

    const conceptCitation = await createCitation(editor(), {
      entityType: "CONCEPT",
      entityId: concept.id,
      sourceId: source.id,
    });
    citationIds.push(conceptCitation.id);
    await publishConcept(admin(), concept.id);

    const disciplineCitation = await createCitation(editor(), {
      entityType: "DISCIPLINE",
      entityId: discipline.id,
      sourceId: source.id,
    });
    citationIds.push(disciplineCitation.id);
    await publishDiscipline(admin(), discipline.id);

    const relation = await createAcademicRelation(editor(), {
      sourceType: "CONCEPT",
      sourceId: concept.id,
      relationType: "APLICADO_EM",
      targetType: "DISCIPLINE",
      targetId: discipline.id,
    });
    academicRelationIds.push(relation.id);
    const relationCitation = await createCitation(editor(), {
      entityType: "ACADEMIC_RELATION",
      entityId: relation.id,
      sourceId: source.id,
    });
    citationIds.push(relationCitation.id);
    await publishAcademicRelation(admin(), relation.id);

    const connections = await findInterdisciplinaryConnections(concept.id);
    expect(connections).toEqual([
      { relationType: "APLICADO_EM", entityType: "DISCIPLINE", entityId: discipline.id },
    ]);
  });

  it("relação em DRAFT (não publicada) NÃO conta como conexão interdisciplinar", async () => {
    const concept = await createFixtureConcept("interdisc-draft");
    conceptIds.push(concept.id);
    const discipline = await createFixtureDiscipline("interdisc-draft");
    disciplineIds.push(discipline.id);

    const relation = await createAcademicRelation(editor(), {
      sourceType: "CONCEPT",
      sourceId: concept.id,
      relationType: "RELACIONADO_A",
      targetType: "DISCIPLINE",
      targetId: discipline.id,
    });
    academicRelationIds.push(relation.id);

    const connections = await findInterdisciplinaryConnections(concept.id);
    expect(connections).toEqual([]);
  });

  it("relação com uma Pessoa (nem CONCEPT nem DISCIPLINE) é ignorada", async () => {
    const source = await createFixtureSource("interdisc-person");
    sourceIds.push(source.id);
    const concept = await createFixtureConcept("interdisc-person");
    conceptIds.push(concept.id);
    const person = await createFixtureAcademicPerson("interdisc-person");
    personIds.push(person.id);

    const conceptCitation = await createCitation(editor(), {
      entityType: "CONCEPT",
      entityId: concept.id,
      sourceId: source.id,
    });
    citationIds.push(conceptCitation.id);
    await publishConcept(admin(), concept.id);

    const personCitation = await createCitation(editor(), {
      entityType: "PERSON",
      entityId: person.id,
      sourceId: source.id,
    });
    citationIds.push(personCitation.id);
    await publishAcademicPerson(admin(), person.id);

    const relation = await createAcademicRelation(editor(), {
      sourceType: "CONCEPT",
      sourceId: concept.id,
      relationType: "ESTUDOU",
      targetType: "PERSON",
      targetId: person.id,
    });
    academicRelationIds.push(relation.id);
    const relationCitation = await createCitation(editor(), {
      entityType: "ACADEMIC_RELATION",
      entityId: relation.id,
      sourceId: source.id,
    });
    citationIds.push(relationCitation.id);
    await publishAcademicRelation(admin(), relation.id);

    const connections = await findInterdisciplinaryConnections(concept.id);
    expect(connections).toEqual([]);
  });

  afterAll(async () => {
    await cleanupFixtures({
      academicRelationIds,
      citationIds,
      conceptIds,
      disciplineIds,
      personIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
