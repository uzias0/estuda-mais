/**
 * Prova, contra o banco real, que os serviços de domínio de fato gravam
 * trilha de auditoria em `ContentAuditLog` — não basta os testes de cada
 * entidade passarem "por fora"; isto verifica a linha em si (Módulo 2,
 * seção 24).
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { createConcept, publishConcept } from "@/modules/knowledge/server/services/concept.service";
import { createCitation } from "./citation.service";
import { listAuditLogEntries } from "./auditLog";
import { createFixtureUser, createFixtureSource, cleanupFixtures } from "@/test/fixtures";

describe("Auditoria — ContentAuditLog integrado aos serviços de domínio", () => {
  const conceptIds: string[] = [];
  const citationIds: string[] = [];
  const sourceIds: string[] = [];
  const userIds: string[] = [];

  it("createConcept grava uma entrada CREATE em ContentAuditLog", async () => {
    const editor = await createFixtureUser("audit-create", Role.CONTENT_EDITOR);
    userIds.push(editor.id);

    const concept = await createConcept(
      { userId: editor.id, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-audit-${Date.now()}`,
        name: "TEST_FIXTURE_concept_audit",
        definition: "Para verificar auditoria.",
      },
    );
    conceptIds.push(concept.id);

    const logs = await prisma.contentAuditLog.findMany({
      where: { entityType: "CONCEPT", entityId: concept.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("CREATE");
    expect(logs[0].actorUserId).toBe(editor.id);
    expect(logs[0].snapshot).not.toBeNull();
  });

  it("publishConcept grava uma entrada PUBLISH separada, preservando a de CREATE", async () => {
    const editor = await createFixtureUser("audit-publish-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("audit-publish-admin", Role.ADMIN);
    const source = await createFixtureSource("audit-publish");
    userIds.push(editor.id, admin.id);
    sourceIds.push(source.id);

    const concept = await createConcept(
      { userId: editor.id, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-audit-pub-${Date.now()}`,
        name: "TEST_FIXTURE_concept_audit_pub",
        definition: "Para verificar auditoria de publicação.",
      },
    );
    conceptIds.push(concept.id);

    const citation = await createCitation(
      { userId: editor.id, role: Role.CONTENT_EDITOR },
      { entityType: "CONCEPT", entityId: concept.id, sourceId: source.id },
    );
    citationIds.push(citation.id);

    await publishConcept({ userId: admin.id, role: Role.ADMIN }, concept.id);

    // 3 entradas: CREATE do concept, CREATE da citation (que também audita o
    // concept alvo, via toAuditableEntityType), e PUBLISH do concept.
    const logs = await prisma.contentAuditLog.findMany({
      where: { entityType: "CONCEPT", entityId: concept.id },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map((l) => l.action)).toEqual(["CREATE", "CREATE", "PUBLISH"]);
    expect(logs[2].actorUserId).toBe(admin.id);
  });

  it("listAuditLogEntries (Módulo 12) lê o mesmo log gravado, filtrando por entidade e ação", async () => {
    const editor = await createFixtureUser("audit-list", Role.CONTENT_EDITOR);
    userIds.push(editor.id);

    const concept = await createConcept(
      { userId: editor.id, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-audit-list-${Date.now()}`,
        name: "TEST_FIXTURE_concept_audit_list",
        definition: "Para verificar a consulta de leitura do audit log.",
      },
    );
    conceptIds.push(concept.id);

    const entries = await listAuditLogEntries({ entityType: "CONCEPT", entityId: concept.id });
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("CREATE");
    expect(entries[0].actor.id).toBe(editor.id);

    const filteredByOtherAction = await listAuditLogEntries({
      entityType: "CONCEPT",
      entityId: concept.id,
      action: "PUBLISH",
    });
    expect(filteredByOtherAction).toHaveLength(0);
  });

  afterAll(async () => {
    await cleanupFixtures({ conceptIds, citationIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
