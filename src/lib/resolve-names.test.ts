/**
 * Teste de integração real da resolução de nomes (Módulo 11) — usada pelas
 * páginas de biblioteca/atualidades/revisão/diagnóstico para mostrar nomes
 * reais em vez de ids crus.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { resolveConceptNames, resolveKnowledgeEntityLabel } from "./resolve-names";
import { createFixtureConcept, createFixtureAcademicWork, cleanupFixtures } from "@/test/fixtures";

describe("resolve-names", () => {
  const conceptIds: string[] = [];
  const workIds: string[] = [];

  it("resolveConceptNames devolve um mapa id → nome, ignorando ids inexistentes", async () => {
    const concept = await createFixtureConcept("resolve-names");
    conceptIds.push(concept.id);

    const map = await resolveConceptNames([concept.id, "concept-inexistente"]);
    expect(map.get(concept.id)).toBe(concept.name);
    expect(map.has("concept-inexistente")).toBe(false);
  });

  it("resolveKnowledgeEntityLabel lê `name` para a maioria dos nós e `title` para AcademicWork", async () => {
    const concept = await createFixtureConcept("resolve-names-2");
    conceptIds.push(concept.id);
    const work = await createFixtureAcademicWork("resolve-names");
    workIds.push(work.id);

    expect(await resolveKnowledgeEntityLabel("CONCEPT", concept.id)).toBe(concept.name);
    expect(await resolveKnowledgeEntityLabel("WORK", work.id)).toBe(work.title);
    expect(await resolveKnowledgeEntityLabel("CONCEPT", "id-inexistente")).toBe("id-inexistente");
  });

  afterAll(async () => {
    await cleanupFixtures({ conceptIds, workIds });
    await prisma.$disconnect();
  });
});
