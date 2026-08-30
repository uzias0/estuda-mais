/**
 * Testes de integração reais — Source e LegalReference (Módulo 2, seção 6/21).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { createSource, updateSource } from "./source.service";
import { createLegalReference, updateLegalReference } from "./legalReference.service";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";

describe("Source + LegalReference services", () => {
  let editorId: string;
  let studentId: string;
  const sourceIds: string[] = [];
  const legalReferenceSourceIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("source-editor", Role.CONTENT_EDITOR);
    const student = await createFixtureUser("source-student", Role.STUDENT);
    editorId = editor.id;
    studentId = student.id;
    userIds.push(editorId, studentId);
  });

  it("cria e atualiza uma Source", async () => {
    const source = await createSource(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { name: "TEST_FIXTURE_source_crud", sourceType: "ACADEMICA" },
    );
    sourceIds.push(source.id);

    const updated = await updateSource({ userId: editorId, role: Role.CONTENT_EDITOR }, source.id, {
      classification: "SECUNDARIA",
    });
    expect(updated.classification).toBe("SECUNDARIA");
  });

  it("STUDENT não pode criar Source (segurança)", async () => {
    await expect(
      createSource(
        { userId: studentId, role: Role.STUDENT },
        { name: "TEST_FIXTURE_source_student", sourceType: "ACADEMICA" },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it("cria uma LegalReference vinculada a uma Source e atualiza vigência", async () => {
    const source = await createSource(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { name: "TEST_FIXTURE_source_legal", sourceType: "OFICIAL" },
    );
    sourceIds.push(source.id);

    const legalReference = await createLegalReference(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { sourceId: source.id, jurisdiction: "CFP" },
    );
    legalReferenceSourceIds.push(legalReference.sourceId);
    expect(legalReference.legalStatus).toBe("VIGENTE");

    const updated = await updateLegalReference(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      source.id,
      { legalStatus: "REVOGADA" },
    );
    expect(updated.legalStatus).toBe("REVOGADA");
  });

  it("rejeita LegalReference para Source inexistente", async () => {
    await expect(
      createLegalReference(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { sourceId: "source-inexistente" },
      ),
    ).rejects.toThrow();
  });

  afterAll(async () => {
    await cleanupFixtures({ legalReferenceSourceIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
