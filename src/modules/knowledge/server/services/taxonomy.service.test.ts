/**
 * Testes de integração reais para as entidades de taxonomia mais simples da
 * Base de Conhecimento: Discipline, School (+ link N:N), HistoricalPeriod,
 * DevelopmentalStage e Tag. Cobertura mais leve que Concept/Theory/
 * AcademicPerson (que têm a matriz completa da seção 28), mas ainda real
 * contra o Postgres de dev — nenhuma dessas entidades fica sem teste
 * (critério de conclusão, seção 36: "entidades principais puderem ser
 * manipuladas de forma segura").
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { PublicationPolicyError } from "@/modules/curation/server/services/publicationPolicy";
import { createDiscipline, publishDiscipline, archiveDiscipline } from "./discipline.service";
import { createSchool, linkSchoolToDiscipline, publishSchool } from "./school.service";
import { createHistoricalPeriod, listHistoricalPeriods } from "./historicalPeriod.service";
import { createDevelopmentalStage } from "./developmentalStage.service";
import { createTag, updateTag } from "./tag.service";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import { createFixtureUser, createFixtureSource, cleanupFixtures } from "@/test/fixtures";

describe("Taxonomia da Base de Conhecimento (Discipline/School/HistoricalPeriod/DevelopmentalStage/Tag)", () => {
  let editorId: string;
  let adminId: string;
  let studentId: string;
  let sourceId: string;
  const disciplineIds: string[] = [];
  const schoolIds: string[] = [];
  const periodIds: string[] = [];
  const stageIds: string[] = [];
  const tagIds: string[] = [];
  const citationIds: string[] = [];
  const userIds: string[] = [];
  const sourceIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("taxonomy-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("taxonomy-admin", Role.ADMIN);
    const student = await createFixtureUser("taxonomy-student", Role.STUDENT);
    const source = await createFixtureSource("taxonomy");
    editorId = editor.id;
    adminId = admin.id;
    studentId = student.id;
    sourceId = source.id;
    userIds.push(editorId, adminId, studentId);
    sourceIds.push(sourceId);
  });

  it("Discipline: cria, publica sem citation (rejeitado), publica com citation, arquiva", async () => {
    const discipline = await createDiscipline(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-discipline-tax-${Date.now()}`, name: "TEST_FIXTURE_discipline_tax" },
    );
    disciplineIds.push(discipline.id);

    await expect(
      publishDiscipline({ userId: adminId, role: Role.ADMIN }, discipline.id),
    ).rejects.toThrow(PublicationPolicyError);

    const citation = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "DISCIPLINE", entityId: discipline.id, sourceId },
    );
    citationIds.push(citation.id);

    const published = await publishDiscipline({ userId: adminId, role: Role.ADMIN }, discipline.id);
    expect(published.status).toBe("PUBLISHED");

    const anotherDiscipline = await createDiscipline(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-discipline-arch-${Date.now()}`, name: "TEST_FIXTURE_discipline_arch" },
    );
    disciplineIds.push(anotherDiscipline.id);
    const archived = await archiveDiscipline(
      { userId: adminId, role: Role.ADMIN },
      anotherDiscipline.id,
    );
    expect(archived.status).toBe("ARCHIVED");
  });

  it("School: cria, associa a Discipline (N:N), publica com citation", async () => {
    const discipline = await createDiscipline(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-discipline-school-${Date.now()}`,
        name: "TEST_FIXTURE_discipline_school",
      },
    );
    disciplineIds.push(discipline.id);

    const school = await createSchool(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-school-tax-${Date.now()}`, name: "TEST_FIXTURE_school_tax" },
    );
    schoolIds.push(school.id);

    const linked = await linkSchoolToDiscipline(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      school.id,
      discipline.id,
    );
    expect(linked.disciplines.map((d) => d.id)).toContain(discipline.id);

    const citation = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "SCHOOL", entityId: school.id, sourceId },
    );
    citationIds.push(citation.id);
    const published = await publishSchool({ userId: adminId, role: Role.ADMIN }, school.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("STUDENT não pode criar School (segurança)", async () => {
    await expect(
      createSchool(
        { userId: studentId, role: Role.STUDENT },
        { slug: `test-fixture-school-student-${Date.now()}`, name: "TEST_FIXTURE_school_student" },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it("HistoricalPeriod: cria e consulta por faixa de ano", async () => {
    const period = await createHistoricalPeriod(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-period-tax-${Date.now()}`,
        name: "TEST_FIXTURE_period_tax",
        startYear: 1900,
        endYear: 1950,
      },
    );
    periodIds.push(period.id);

    const found = await listHistoricalPeriods({ yearWithinRange: 1925 });
    expect(found.map((p) => p.id)).toContain(period.id);

    const notFound = await listHistoricalPeriods({ yearWithinRange: 2100 });
    expect(notFound.map((p) => p.id)).not.toContain(period.id);
  });

  it("HistoricalPeriod: rejeita endYear anterior a startYear", async () => {
    await expect(
      createHistoricalPeriod(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          slug: `test-fixture-period-bad-${Date.now()}`,
          name: "TEST_FIXTURE_period_bad",
          startYear: 1950,
          endYear: 1900,
        },
      ),
    ).rejects.toThrow();
  });

  it("DevelopmentalStage: cria com order", async () => {
    const stage = await createDevelopmentalStage(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-stage-tax-${Date.now()}`, name: "TEST_FIXTURE_stage_tax", order: 1 },
    );
    stageIds.push(stage.id);
    expect(stage.order).toBe(1);
  });

  it("Tag: cria e atualiza", async () => {
    const tag = await createTag(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-tag-tax-${Date.now()}`, name: "TEST_FIXTURE_tag_tax_v1" },
    );
    tagIds.push(tag.id);

    const updated = await updateTag({ userId: editorId, role: Role.CONTENT_EDITOR }, tag.id, {
      name: "TEST_FIXTURE_tag_tax_v2",
    });
    expect(updated.name).toBe("TEST_FIXTURE_tag_tax_v2");
  });

  afterAll(async () => {
    await cleanupFixtures({
      disciplineIds,
      schoolIds,
      periodIds,
      stageIds,
      tagIds,
      citationIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
