/**
 * Testes de integração reais de `library.service.ts` (Módulo 7, seções
 * 5/6/21/22/34/35). Cobre criação, validação de licença/fonte gratuita,
 * publicação com/sem procedência válida, arquivamento, restauração,
 * autorização, auditoria, e payloads forjados.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { ContentValidationError } from "./errors";
import {
  createLibraryItem,
  updateLibraryItem,
  publishLibraryItem,
  archiveLibraryItem,
  restoreLibraryItem,
  getLibraryItem,
} from "./library.service";
import { linkLibraryItemToKnowledge } from "./content-linking.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureDiscipline,
  createFixtureAcademicWork,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Library service", () => {
  let studentId: string;
  let editorId: string;
  let adminId: string;
  let sourceWithUrlId: string;
  let sourceNoUrlId: string;
  let conceptId: string;
  let disciplineId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const disciplineIds: string[] = [];
  const libraryItemIds: string[] = [];
  const workIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("lib-student", Role.STUDENT);
    const editor = await createFixtureUser("lib-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("lib-admin", Role.ADMIN);
    const sourceWithUrl = await createFixtureSource("lib-with-url");
    const sourceNoUrl = await createFixtureSource("lib-no-url");
    const concept = await createFixtureConcept("lib");
    const discipline = await createFixtureDiscipline("lib");

    studentId = student.id;
    editorId = editor.id;
    adminId = admin.id;
    sourceWithUrlId = sourceWithUrl.id;
    sourceNoUrlId = sourceNoUrl.id;
    conceptId = concept.id;
    disciplineId = discipline.id;

    userIds.push(studentId, editorId, adminId);
    sourceIds.push(sourceWithUrlId, sourceNoUrlId);
    conceptIds.push(conceptId);
    disciplineIds.push(disciplineId);

    await prisma.source.update({
      where: { id: sourceWithUrlId },
      data: { url: "https://example.invalid/free-book", license: "CC-BY-4.0" },
    });
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("CONTENT_EDITOR cria um LibraryItem válido", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_create",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
    });
    libraryItemIds.push(item.id);
    expect(item.status).toBe("DRAFT");
    expect(item.isFree).toBe(false);
  });

  it("STUDENT NÃO pode criar LibraryItem", async () => {
    await expect(
      createLibraryItem(student(), {
        title: "TEST_FIXTURE_lib_student",
        materialType: "LIVRO",
        sourceId: sourceWithUrlId,
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it("rejeita Source inexistente", async () => {
    await expect(
      createLibraryItem(editor(), {
        title: "TEST_FIXTURE_lib_bad_source",
        materialType: "LIVRO",
        sourceId: "source-fantasma",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("material gratuito exige freeAccessReason — rejeitado na criação sem ele", async () => {
    await expect(
      createLibraryItem(editor(), {
        title: "TEST_FIXTURE_lib_free_noreason",
        materialType: "EBOOK",
        sourceId: sourceWithUrlId,
        isFree: true,
      } as never),
    ).rejects.toThrow();
  });

  it("material gratuito com freeAccessReason é aceito na criação", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_free_ok",
      materialType: "EBOOK",
      sourceId: sourceWithUrlId,
      isFree: true,
      freeAccessReason: "PUBLIC_DOMAIN",
    });
    libraryItemIds.push(item.id);
    expect(item.freeAccessReason).toBe("PUBLIC_DOMAIN");
  });

  it("updateLibraryItem revalida isFree/freeAccessReason combinando existente + patch", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_update_base",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
    });
    libraryItemIds.push(item.id);

    // tenta marcar isFree=true sem informar freeAccessReason no patch — deve falhar
    await expect(updateLibraryItem(editor(), item.id, { isFree: true })).rejects.toThrow(
      ContentValidationError,
    );

    const updated = await updateLibraryItem(editor(), item.id, {
      isFree: true,
      freeAccessReason: "AUTHOR_PROVIDED",
    });
    expect(updated.isFree).toBe(true);
  });

  it("reutiliza AcademicWork existente via academicWorkId em vez de duplicar título/ano/tipo", async () => {
    const work = await createFixtureAcademicWork("lib-linked");
    workIds.push(work.id);

    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_linked_to_work",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
      academicWorkId: work.id,
    });
    libraryItemIds.push(item.id);
    expect(item.academicWorkId).toBe(work.id);

    const fetched = await getLibraryItem(item.id);
    expect(fetched?.academicWork?.id).toBe(work.id);
  });

  it("publicação SEM relacionamento com a Base de Conhecimento é rejeitada", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_no_tags",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
    });
    libraryItemIds.push(item.id);
    await expect(publishLibraryItem(admin(), item.id)).rejects.toThrow(ContentValidationError);
  });

  it("publicação de material gratuito SEM Source.url é rejeitada", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_free_no_url",
      materialType: "EBOOK",
      sourceId: sourceNoUrlId,
      isFree: true,
      freeAccessReason: "OFFICIAL_FREE_ACCESS",
    });
    libraryItemIds.push(item.id);
    await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });

    await expect(publishLibraryItem(admin(), item.id)).rejects.toThrow(ContentValidationError);
  });

  it("freeAccessReason=OPEN_LICENSE sem Source.license é rejeitada na publicação", async () => {
    const sourceNoLicense = await createFixtureSource("lib-no-license");
    sourceIds.push(sourceNoLicense.id);
    await prisma.source.update({
      where: { id: sourceNoLicense.id },
      data: { url: "https://example.invalid/open" },
    });

    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_open_license_missing",
      materialType: "EBOOK",
      sourceId: sourceNoLicense.id,
      isFree: true,
      freeAccessReason: "OPEN_LICENSE",
    });
    libraryItemIds.push(item.id);
    await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });

    await expect(publishLibraryItem(admin(), item.id)).rejects.toThrow(ContentValidationError);
  });

  it("publicação válida (fonte com URL/licença + relacionamento) é aceita", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_publish_ok",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
      isFree: true,
      freeAccessReason: "OPEN_LICENSE",
    });
    libraryItemIds.push(item.id);
    await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });

    const published = await publishLibraryItem(admin(), item.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("CONTENT_EDITOR NÃO pode publicar (só ADMIN)", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_editor_publish",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
    });
    libraryItemIds.push(item.id);
    await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await expect(publishLibraryItem(editor(), item.id)).rejects.toThrow(AuthorizationError);
  });

  it("STUDENT NÃO pode publicar", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_student_publish",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
    });
    libraryItemIds.push(item.id);
    await expect(publishLibraryItem(student(), item.id)).rejects.toThrow(AuthorizationError);
  });

  it("relacionamento interdisciplinar: o mesmo item liga a conceito E disciplina, sem duplicar o item", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_interdisciplinary",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
    });
    libraryItemIds.push(item.id);
    await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "DISCIPLINE",
      entityId: disciplineId,
    });

    const fetched = await getLibraryItem(item.id);
    expect(fetched?.knowledgeTags).toHaveLength(2);
  });

  it("arquivamento e restauração: ARCHIVED -> DRAFT, nunca direto para PUBLISHED", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_archive_restore",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
    });
    libraryItemIds.push(item.id);

    const archived = await archiveLibraryItem(editor(), item.id);
    expect(archived.status).toBe("ARCHIVED");

    await expect(restoreLibraryItem(editor(), item.id)).resolves.toMatchObject({ status: "DRAFT" });

    // idempotência: não é possível restaurar algo que não está arquivado
    await expect(restoreLibraryItem(editor(), item.id)).rejects.toThrow(ContentValidationError);
  });

  it("auditoria: cria ContentAuditLog em CREATE/PUBLISH/ARCHIVE", async () => {
    const item = await createLibraryItem(editor(), {
      title: "TEST_FIXTURE_lib_audit",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
    });
    libraryItemIds.push(item.id);
    await linkLibraryItemToKnowledge(editor(), item.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishLibraryItem(admin(), item.id);
    await archiveLibraryItem(admin(), item.id);

    const logs = await prisma.contentAuditLog.findMany({
      where: { entityType: "LIBRARY_ITEM", entityId: item.id },
    });
    expect(logs.map((l) => l.action).sort()).toEqual(
      ["ARCHIVE", "CREATE", "LINK", "PUBLISH"].sort(),
    );
  });

  it("segurança: status/isPublished/sourceId/publishedAt/license forjados no payload são ignorados", async () => {
    const forged = {
      title: "TEST_FIXTURE_lib_forged",
      materialType: "LIVRO",
      sourceId: sourceWithUrlId,
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date("2000-01-01"),
      license: "MIT",
      createdByUserId: studentId,
      authorId: studentId,
    };
    const item = await createLibraryItem(editor(), forged as never);
    libraryItemIds.push(item.id);
    expect(item.status).toBe("DRAFT"); // nunca PUBLISHED direto pelo payload
  });

  afterAll(async () => {
    await cleanupFixtures({
      libraryItemIds,
      workIds,
      conceptIds,
      disciplineIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
