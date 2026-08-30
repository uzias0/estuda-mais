/**
 * Teste de integração real das Server Actions administrativas de
 * Concept/AcademicRelation (Módulo 12) — camada fina sobre os serviços do
 * Módulo 2. Cobre criação (com `status` forjado ignorado), vínculo de
 * tag, gate de publicação por Citation, e a regra própria (mais forte) de
 * publicação de `AcademicRelation`.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  createConceptAction,
  linkConceptToTagAction,
  publishConceptAction,
  createAcademicRelationAction,
} from "./knowledge-actions";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import { getCurrentAdminActor } from "@/server/auth/devActor";
import { loginAsUserId } from "@/test/authTestHelpers";
import {
  createFixtureSource,
  createFixtureTag,
  createFixtureConcept,
  cleanupFixtures,
} from "@/test/fixtures";

async function expectRedirect(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
    throw new Error("esperava um redirect (NEXT_REDIRECT)");
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT")) throw e;
  }
}

describe("knowledge-actions (Concept, Módulo 12)", () => {
  const conceptIds: string[] = [];
  const tagIds: string[] = [];
  const citationIds: string[] = [];
  const sourceIds: string[] = [];

  it("cria um Concept via FormData (status forjado ignorado), vincula tag, e só publica com procedência", async () => {
    await loginAsUserId((await getCurrentAdminActor()).userId);

    const tag = await createFixtureTag("admin-concept-action");
    tagIds.push(tag.id);

    const slug = `test-fixture-concept-action-${Date.now()}`;
    const form = new FormData();
    form.set("slug", slug);
    form.set("name", "TEST_FIXTURE_concept_action");
    form.set("definition", "Definição de teste da Server Action.");
    form.set("status", "PUBLISHED"); // forjado

    await expectRedirect(() => createConceptAction(form));

    const created = await prisma.concept.findUnique({ where: { slug } });
    expect(created).not.toBeNull();
    expect(created!.status).toBe("DRAFT");
    conceptIds.push(created!.id);

    const linkForm = new FormData();
    linkForm.set("tagId", tag.id);
    await linkConceptToTagAction(created!.id, linkForm);
    const withTag = await prisma.concept.findUnique({
      where: { id: created!.id },
      include: { tags: true },
    });
    expect(withTag!.tags.map((t) => t.id)).toContain(tag.id);

    await expect(publishConceptAction(created!.id)).rejects.toThrow();

    const source = await createFixtureSource("admin-concept-action");
    sourceIds.push(source.id);
    const actor = await getCurrentAdminActor();
    const citation = await createCitation(actor, {
      entityType: "CONCEPT",
      entityId: created!.id,
      sourceId: source.id,
    });
    citationIds.push(citation.id);

    await publishConceptAction(created!.id);
    const published = await prisma.concept.findUnique({ where: { id: created!.id } });
    expect(published!.status).toBe("PUBLISHED");
  });

  it("createAcademicRelationAction rejeita IDs de entidade relacionada manipulados/inexistentes (seção 19.8)", async () => {
    await loginAsUserId((await getCurrentAdminActor()).userId);

    const concept = await createFixtureConcept("admin-relation-action");
    conceptIds.push(concept.id);

    const form = new FormData();
    form.set("sourceType", "CONCEPT");
    form.set("sourceId", concept.id);
    form.set("relationType", "RELACIONADO_A");
    form.set("targetType", "CONCEPT");
    form.set("targetId", "concept-id-forjado-que-nao-existe");

    await expect(createAcademicRelationAction(form)).rejects.toThrow();

    const created = await prisma.academicRelation.findFirst({
      where: { sourceId: concept.id, targetId: "concept-id-forjado-que-nao-existe" },
    });
    expect(created).toBeNull();
  });

  afterAll(async () => {
    await cleanupFixtures({ conceptIds, tagIds, citationIds, sourceIds });
    await prisma.$disconnect();
  });
});
