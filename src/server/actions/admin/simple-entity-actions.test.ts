/**
 * Teste de integração real das Server Actions genéricas de entidade simples
 * (Módulo 12) — percorre criação → edição → publicação → arquivamento pelo
 * caminho real da UI administrativa (FormData → Server Action → serviço de
 * domínio), usando "disciplines" como representante dos 14 registros de
 * `admin-simple-entities.ts` (todos seguem o mesmo esqueleto). Também prova
 * a seção 15 do prompt: um `status` forjado no FormData é ignorado — a
 * action nunca lê esse campo (só os declarados em `config.fields`).
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  createSimpleEntityAction,
  updateSimpleEntityAction,
  publishSimpleEntityAction,
  archiveSimpleEntityAction,
} from "./simple-entity-actions";
import { createCitation } from "@/modules/curation/server/services/citation.service";
import { getCurrentAdminActor } from "@/server/auth/devActor";
import { loginAsUserId } from "@/test/authTestHelpers";
import { createFixtureSource, cleanupFixtures } from "@/test/fixtures";

async function expectRedirect(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
    throw new Error("esperava um redirect (NEXT_REDIRECT), a action não lançou nada");
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT")) throw e;
  }
}

describe("simple-entity-actions (genéricas, Módulo 12)", () => {
  const disciplineIds: string[] = [];
  const citationIds: string[] = [];
  const sourceIds: string[] = [];

  it("cria uma Discipline via FormData ignorando um `status` forjado, edita, publica (com procedência) e arquiva", async () => {
    // Server Actions administrativas agora exigem sessão real (etapa de
    // consolidação) — "loga" o mesmo curador de dev antes de chamar qualquer action.
    await loginAsUserId((await getCurrentAdminActor()).userId);

    const createForm = new FormData();
    const slug = `test-fixture-discipline-admin-${Date.now()}`;
    createForm.set("slug", slug);
    createForm.set("name", "TEST_FIXTURE_discipline_admin");
    createForm.set("description", "criada via Server Action administrativa");
    createForm.set("status", "PUBLISHED"); // forjado — não existe em config.fields, deve ser ignorado

    await expectRedirect(() => createSimpleEntityAction("disciplines", createForm));

    const created = await prisma.discipline.findUnique({ where: { slug } });
    expect(created).not.toBeNull();
    expect(created!.status).toBe("DRAFT"); // nunca PUBLISHED por payload forjado
    disciplineIds.push(created!.id);

    const updateForm = new FormData();
    updateForm.set("name", "TEST_FIXTURE_discipline_admin_editada");
    await updateSimpleEntityAction("disciplines", created!.id, updateForm);
    const updated = await prisma.discipline.findUnique({ where: { id: created!.id } });
    expect(updated!.name).toBe("TEST_FIXTURE_discipline_admin_editada");

    // Publicar sem Citation deve falhar (gate de procedência, Módulo 2).
    await expect(publishSimpleEntityAction("disciplines", created!.id)).rejects.toThrow();

    const source = await createFixtureSource("admin-simple-entity");
    sourceIds.push(source.id);
    const actor = await getCurrentAdminActor();
    const citation = await createCitation(actor, {
      entityType: "DISCIPLINE",
      entityId: created!.id,
      sourceId: source.id,
    });
    citationIds.push(citation.id);

    await publishSimpleEntityAction("disciplines", created!.id);
    const published = await prisma.discipline.findUnique({ where: { id: created!.id } });
    expect(published!.status).toBe("PUBLISHED");

    await archiveSimpleEntityAction("disciplines", created!.id);
    const archived = await prisma.discipline.findUnique({ where: { id: created!.id } });
    expect(archived!.status).toBe("ARCHIVED");
  });

  it("rejeita entityKey desconhecido — nenhuma entidade forjada chama serviço nenhum", async () => {
    const form = new FormData();
    form.set("name", "não deveria criar nada");
    await expect(createSimpleEntityAction("entidade-inventada", form)).rejects.toThrow(
      /não é uma entidade administrativa reconhecida/,
    );
  });

  afterAll(async () => {
    await cleanupFixtures({ disciplineIds, citationIds, sourceIds });
    await prisma.$disconnect();
  });
});
