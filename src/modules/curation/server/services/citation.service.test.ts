/**
 * Testes de integração reais — Citation: Source válido, Source inexistente,
 * entidade válida, entidade inexistente (Módulo 2, seção 28).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { NotFoundError } from "./publicationPolicy";
import { createCitation, citationTargetExists, listCitationsBySource } from "./citation.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureLesson,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Citation service", () => {
  let editorId: string;
  let sourceId: string;
  let conceptId: string;
  let lessonId: string;
  const citationIds: string[] = [];
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const lessonIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("citation-editor", Role.CONTENT_EDITOR);
    const source = await createFixtureSource("citation");
    const concept = await createFixtureConcept("citation");
    const lesson = await createFixtureLesson("citation");
    editorId = editor.id;
    sourceId = source.id;
    conceptId = concept.id;
    lessonId = lesson.id;
    userIds.push(editorId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    lessonIds.push(lessonId);
  });

  it("cria uma Citation com Source válido e entidade válida", async () => {
    const citation = await createCitation(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { entityType: "CONCEPT", entityId: conceptId, sourceId },
    );
    citationIds.push(citation.id);
    expect(citation.sourceId).toBe(sourceId);
  });

  it("listCitationsBySource (Módulo 12) lista as citações que usam uma fonte, na direção inversa de listCitationsForEntity", async () => {
    const citations = await listCitationsBySource(sourceId);
    expect(citations.length).toBeGreaterThanOrEqual(1);
    expect(citations.some((c) => c.entityType === "CONCEPT" && c.entityId === conceptId)).toBe(
      true,
    );

    const noneForFakeSource = await listCitationsBySource("source-fantasma");
    expect(noneForFakeSource).toHaveLength(0);
  });

  it("rejeita Source inexistente", async () => {
    await expect(
      createCitation(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { entityType: "CONCEPT", entityId: conceptId, sourceId: "source-inexistente" },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejeita entidade (entityId) inexistente", async () => {
    await expect(
      createCitation(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { entityType: "CONCEPT", entityId: "concept-inexistente", sourceId },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("citationTargetExists confirma existência para os 6 tipos que se sobrepõem a KnowledgeEntityType", async () => {
    expect(await citationTargetExists("CONCEPT", conceptId)).toBe(true);
    expect(await citationTargetExists("CONCEPT", "id-fantasma")).toBe(false);
  });

  it("rejeita explicitamente QUESTION/EXAM_EDITION — fora do escopo desta função (Módulo 3, não tocado aqui)", async () => {
    await expect(citationTargetExists("QUESTION", "qualquer-id")).rejects.toThrow(
      /ainda não é suportada/,
    );
    await expect(citationTargetExists("EXAM_EDITION", "qualquer-id")).rejects.toThrow(
      /ainda não é suportada/,
    );
  });

  it("LESSON é resolvido diretamente (Módulo 4 fechou esta lacuna — Lesson agora existe)", async () => {
    expect(await citationTargetExists("LESSON", lessonId)).toBe(true);
    expect(await citationTargetExists("LESSON", "id-fantasma")).toBe(false);
  });

  afterAll(async () => {
    await cleanupFixtures({ citationIds, conceptIds, lessonIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
