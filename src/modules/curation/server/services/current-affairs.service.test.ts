/**
 * Testes de integração reais de `current-affairs.service.ts` (Módulo 7,
 * seções 8/9/21/22/34/35).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { ContentValidationError } from "./errors";
import {
  createCurrentAffair,
  updateCurrentAffair,
  publishCurrentAffair,
  archiveCurrentAffair,
  restoreCurrentAffair,
  getCurrentAffair,
} from "./current-affairs.service";
import {
  linkCurrentAffairToKnowledge,
  linkCurrentAffairToTag,
  unlinkCurrentAffairFromTag,
} from "./content-linking.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureDiscipline,
  createFixtureTag,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Current affairs service", () => {
  let studentId: string;
  let editorId: string;
  let adminId: string;
  let sourceWithUrlId: string;
  let sourceNoUrlId: string;
  let conceptId: string;
  let disciplineId: string;
  let tagId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const disciplineIds: string[] = [];
  const tagIds: string[] = [];
  const currentAffairIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("ca-student", Role.STUDENT);
    const editor = await createFixtureUser("ca-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("ca-admin", Role.ADMIN);
    const sourceWithUrl = await createFixtureSource("ca-with-url");
    const sourceNoUrl = await createFixtureSource("ca-no-url");
    const concept = await createFixtureConcept("ca");
    const discipline = await createFixtureDiscipline("ca");
    const tag = await createFixtureTag("ca");

    studentId = student.id;
    editorId = editor.id;
    adminId = admin.id;
    sourceWithUrlId = sourceWithUrl.id;
    sourceNoUrlId = sourceNoUrl.id;
    conceptId = concept.id;
    disciplineId = discipline.id;
    tagId = tag.id;

    userIds.push(studentId, editorId, adminId);
    sourceIds.push(sourceWithUrlId, sourceNoUrlId);
    conceptIds.push(conceptId);
    disciplineIds.push(disciplineId);
    tagIds.push(tagId);

    await prisma.source.update({
      where: { id: sourceWithUrlId },
      data: { url: "https://example.invalid/news-article" },
    });
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("CONTENT_EDITOR cria uma CurrentAffair válida, com eventDate distinta de createdAt", async () => {
    const eventDate = new Date("2026-01-15T00:00:00.000Z");
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_ca_create",
      summary: "Resumo de teste.",
      eventDate,
      sourceId: sourceWithUrlId,
    });
    currentAffairIds.push(affair.id);
    expect(affair.status).toBe("DRAFT");
    expect(affair.eventDate).toEqual(eventDate);
    expect(affair.eventDate.getTime()).not.toBe(affair.createdAt.getTime());
  });

  it("STUDENT NÃO pode criar CurrentAffair", async () => {
    await expect(
      createCurrentAffair(student(), {
        title: "TEST_FIXTURE_ca_student",
        summary: "x",
        eventDate: new Date(),
        sourceId: sourceWithUrlId,
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it("publicação SEM relacionamento com a Base de Conhecimento é rejeitada", async () => {
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_ca_no_tags",
      summary: "x",
      eventDate: new Date(),
      sourceId: sourceWithUrlId,
    });
    currentAffairIds.push(affair.id);
    await expect(publishCurrentAffair(admin(), affair.id)).rejects.toThrow(ContentValidationError);
  });

  it("publicação SEM Source.url (procedência insuficiente) é rejeitada", async () => {
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_ca_no_url",
      summary: "x",
      eventDate: new Date(),
      sourceId: sourceNoUrlId,
    });
    currentAffairIds.push(affair.id);
    await linkCurrentAffairToKnowledge(editor(), affair.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await expect(publishCurrentAffair(admin(), affair.id)).rejects.toThrow(ContentValidationError);
  });

  it("publicação válida (fonte com URL + relacionamento) é aceita", async () => {
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_ca_publish_ok",
      summary: "x",
      eventDate: new Date(),
      sourceId: sourceWithUrlId,
    });
    currentAffairIds.push(affair.id);
    await linkCurrentAffairToKnowledge(editor(), affair.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    const published = await publishCurrentAffair(admin(), affair.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("CONTENT_EDITOR NÃO pode publicar; STUDENT também não", async () => {
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_ca_publish_auth",
      summary: "x",
      eventDate: new Date(),
      sourceId: sourceWithUrlId,
    });
    currentAffairIds.push(affair.id);
    await expect(publishCurrentAffair(editor(), affair.id)).rejects.toThrow(AuthorizationError);
    await expect(publishCurrentAffair(student(), affair.id)).rejects.toThrow(AuthorizationError);
  });

  it("relacionamento interdisciplinar: conceito + disciplina + tag no mesmo item", async () => {
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_ca_interdisciplinary",
      summary: "x",
      eventDate: new Date(),
      sourceId: sourceWithUrlId,
    });
    currentAffairIds.push(affair.id);
    await linkCurrentAffairToKnowledge(editor(), affair.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await linkCurrentAffairToKnowledge(editor(), affair.id, {
      entityType: "DISCIPLINE",
      entityId: disciplineId,
    });
    await linkCurrentAffairToTag(editor(), affair.id, tagId);

    const fetched = await getCurrentAffair(affair.id);
    expect(fetched?.knowledgeTags).toHaveLength(2);
    expect(fetched?.tags.map((t) => t.id)).toContain(tagId);

    await unlinkCurrentAffairFromTag(editor(), affair.id, tagId);
    const afterUnlink = await getCurrentAffair(affair.id);
    expect(afterUnlink?.tags).toHaveLength(0);
  });

  it("arquivamento e restauração", async () => {
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_ca_archive_restore",
      summary: "x",
      eventDate: new Date(),
      sourceId: sourceWithUrlId,
    });
    currentAffairIds.push(affair.id);

    const archived = await archiveCurrentAffair(editor(), affair.id);
    expect(archived.status).toBe("ARCHIVED");
    const restored = await restoreCurrentAffair(editor(), affair.id);
    expect(restored.status).toBe("DRAFT");
    await expect(restoreCurrentAffair(editor(), affair.id)).rejects.toThrow(ContentValidationError);
  });

  it("auditoria: CREATE/LINK/PUBLISH/ARCHIVE geram ContentAuditLog", async () => {
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_ca_audit",
      summary: "x",
      eventDate: new Date(),
      sourceId: sourceWithUrlId,
    });
    currentAffairIds.push(affair.id);
    await linkCurrentAffairToKnowledge(editor(), affair.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishCurrentAffair(admin(), affair.id);
    await archiveCurrentAffair(admin(), affair.id);

    const logs = await prisma.contentAuditLog.findMany({
      where: { entityType: "CURRENT_AFFAIR", entityId: affair.id },
    });
    expect(logs.map((l) => l.action).sort()).toEqual(
      ["ARCHIVE", "CREATE", "LINK", "PUBLISH"].sort(),
    );
  });

  it("segurança: status/publishedAt/sourceId/createdByUserId forjados são ignorados", async () => {
    const forged = {
      title: "TEST_FIXTURE_ca_forged",
      summary: "x",
      eventDate: new Date(),
      sourceId: sourceWithUrlId,
      status: "PUBLISHED",
      publishedAt: new Date("2000-01-01"),
      createdByUserId: studentId,
    };
    const affair = await createCurrentAffair(editor(), forged as never);
    currentAffairIds.push(affair.id);
    expect(affair.status).toBe("DRAFT");
  });

  it("updateCurrentAffair valida Source informada no patch", async () => {
    const affair = await createCurrentAffair(editor(), {
      title: "TEST_FIXTURE_ca_update",
      summary: "x",
      eventDate: new Date(),
      sourceId: sourceWithUrlId,
    });
    currentAffairIds.push(affair.id);
    await expect(
      updateCurrentAffair(editor(), affair.id, { sourceId: "source-fantasma" }),
    ).rejects.toThrow();
  });

  afterAll(async () => {
    await cleanupFixtures({
      currentAffairIds,
      conceptIds,
      disciplineIds,
      tagIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
