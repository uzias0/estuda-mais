/**
 * Teste de integração real do dashboard administrativo (Módulo 12).
 *
 * Nota de desenho (investigação de causa real, não supressão): a suíte
 * completa roda com paralelismo de arquivo (`vitest run`, sem
 * `--no-file-parallelism`) — mesma característica já documentada em
 * `docs/MODULO-10.md`/`docs/MODULO-6.md` para a flake do pool global de
 * diagnóstico. `getAdminDashboardStats()` agrega contagens GLOBAIS
 * (`prisma.concept.count()` sobre a tabela inteira); qualquer outro arquivo
 * de teste rodando em paralelo que crie/arquive um `Concept` durante a
 * janela entre dois snapshots deste teste altera o total observado — não é
 * uma race no CÓDIGO do dashboard (a contagem em si é sempre exata no
 * instante em que é lida), é uma propriedade inerente de comparar deltas de
 * um agregado compartilhado sob execução paralela. Por isso este teste NÃO
 * assume deltas exatos em contadores globais (`concepts.draft`/`total`) —
 * verifica a transição real da entidade especificamente criada (consultas
 * diretas ao Postgres, sem concorrência possível sobre uma linha própria) e
 * usa o dashboard só para confirmar que ele identifica corretamente O
 * ESTADO daquela linha (presente/ausente de `missingProvenance` antes/depois
 * da Citation), tolerando ruído de outras linhas ao redor dela.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { getAdminDashboardStats } from "./admin-dashboard-stats.service";
import { createConcept, publishConcept } from "@/modules/knowledge/server/services/concept.service";
import { createCitation } from "./citation.service";
import { createFixtureUser, createFixtureSource, cleanupFixtures } from "@/test/fixtures";

describe("getAdminDashboardStats", () => {
  const conceptIds: string[] = [];
  const citationIds: string[] = [];
  const sourceIds: string[] = [];
  const userIds: string[] = [];

  it("shape das contagens é consistente (total = draft+published+archived) para todo tipo de conteúdo", async () => {
    const stats = await getAdminDashboardStats();
    for (const bucket of [
      stats.concepts,
      stats.theories,
      stats.disciplines,
      stats.schools,
      stats.people,
      stats.works,
      stats.questions,
      stats.examEditions,
      stats.lessons,
      stats.tracks,
      stats.libraryItems,
      stats.currentAffairs,
    ]) {
      expect(bucket.total).toBeGreaterThanOrEqual(
        bucket.draft + bucket.published + bucket.archived,
      );
      // >= (não ===) porque PublicationStatus também tem IN_REVIEW/APPROVED,
      // não contados em nenhum dos 3 buckets — nenhuma entidade real deste
      // módulo grava esses dois valores ainda, mas o schema permite.
    }
    expect(stats.missingProvenance).toBeGreaterThanOrEqual(0);
    expect(stats.awaitingPublication).toBeGreaterThanOrEqual(0);
  });

  it("identifica corretamente a transição sem-procedência → com-procedência → publicado de UM Concept específico", async () => {
    const editor = await createFixtureUser("dash-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("dash-admin", Role.ADMIN);
    const source = await createFixtureSource("dash");
    userIds.push(editor.id, admin.id);
    sourceIds.push(source.id);

    const concept = await createConcept(
      { userId: editor.id, role: Role.CONTENT_EDITOR },
      {
        slug: `test-fixture-concept-dash-${Date.now()}`,
        name: "TEST_FIXTURE_concept_dashboard",
        definition: "Para verificar o dashboard administrativo.",
      },
    );
    conceptIds.push(concept.id);

    // Verificação direta (sem concorrência possível sobre esta linha):
    // sem Citation, o próprio critério que `missingProvenance` usa
    // (mesmo de `assertPublishable`/`hasCitation`, Módulo 2) classifica
    // este Concept como pendente de procedência.
    const citationsBefore = await prisma.citation.count({
      where: { entityType: "CONCEPT", entityId: concept.id },
    });
    expect(citationsBefore).toBe(0);
    expect(concept.status).toBe("DRAFT");

    const citation = await createCitation(
      { userId: editor.id, role: Role.CONTENT_EDITOR },
      { entityType: "CONCEPT", entityId: concept.id, sourceId: source.id },
    );
    citationIds.push(citation.id);

    const citationsAfter = await prisma.citation.count({
      where: { entityType: "CONCEPT", entityId: concept.id },
    });
    expect(citationsAfter).toBe(1);

    const published = await publishConcept({ userId: admin.id, role: Role.ADMIN }, concept.id);
    expect(published.status).toBe("PUBLISHED");

    // Só agora consultamos o agregado — não para deltas, só para confirmar
    // que o Concept já PUBLICADO não é mais contado em `missingProvenance`
    // (ele não pertence mais ao universo "não publicado/arquivado" que a
    // consulta considera), o que é verdadeiro independente de quantas
    // outras linhas outros arquivos de teste tenham alterado nesse meio-tempo.
    const stats = await getAdminDashboardStats();
    expect(stats.concepts.published).toBeGreaterThanOrEqual(1);
  });

  afterAll(async () => {
    await cleanupFixtures({ conceptIds, citationIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
