/**
 * Testes de integração reais de `current-affairs-query.service.ts` (Módulo
 * 7, seção 12/14/31) — janela temporal (7/30/90 dias, customizada), filtro
 * por data, por conceito/disciplina, e busca textual.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import {
  searchCurrentAffairs,
  getRecentCurrentAffairs,
  getCurrentAffairsByConcept,
  getCurrentAffairsByDiscipline,
} from "./current-affairs-query.service";
import { createCurrentAffair, publishCurrentAffair } from "./current-affairs.service";
import { linkCurrentAffairToKnowledge } from "./content-linking.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureDiscipline,
  cleanupFixtures,
} from "@/test/fixtures";

const DAY = 24 * 60 * 60 * 1000;

describe("Current affairs query service", () => {
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let disciplineId: string;
  let recentAffairId: string;
  let oldAffairId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const disciplineIds: string[] = [];
  const currentAffairIds: string[] = [];

  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  beforeAll(async () => {
    const adminUser = await createFixtureUser("caq-admin", Role.ADMIN);
    const source = await createFixtureSource("caq");
    const concept = await createFixtureConcept("caq");
    const discipline = await createFixtureDiscipline("caq");

    adminId = adminUser.id;
    sourceId = source.id;
    conceptId = concept.id;
    disciplineId = discipline.id;

    userIds.push(adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    disciplineIds.push(disciplineId);

    await prisma.source.update({
      where: { id: sourceId },
      data: { url: "https://example.invalid/caq" },
    });

    const now = new Date();
    const recent = await createCurrentAffair(admin(), {
      title: "TEST_FIXTURE_caq_recent_findable",
      summary: "acontecimento recente",
      eventDate: new Date(now.getTime() - 5 * DAY),
      sourceId,
    });
    await linkCurrentAffairToKnowledge(admin(), recent.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await linkCurrentAffairToKnowledge(admin(), recent.id, {
      entityType: "DISCIPLINE",
      entityId: disciplineId,
    });
    await publishCurrentAffair(admin(), recent.id);
    recentAffairId = recent.id;

    const old = await createCurrentAffair(admin(), {
      title: "TEST_FIXTURE_caq_old",
      summary: "acontecimento antigo",
      eventDate: new Date(now.getTime() - 200 * DAY),
      sourceId,
    });
    await linkCurrentAffairToKnowledge(admin(), old.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishCurrentAffair(admin(), old.id);
    oldAffairId = old.id;

    currentAffairIds.push(recentAffairId, oldAffairId);
  });

  it("getRecentCurrentAffairs com janela padrão (30 dias) inclui o recente e exclui o antigo", async () => {
    const results = await getRecentCurrentAffairs();
    const ids = results.map((r) => r.id);
    expect(ids).toContain(recentAffairId);
    expect(ids).not.toContain(oldAffairId);
  });

  it("getRecentCurrentAffairs com janela CUSTOM inclui o antigo quando o intervalo cobre", async () => {
    const now = new Date();
    const results = await getRecentCurrentAffairs({
      window: "CUSTOM",
      from: new Date(now.getTime() - 250 * DAY),
      to: now,
    });
    expect(results.map((r) => r.id)).toContain(oldAffairId);
  });

  it("rejeita janela CUSTOM sem from/to", async () => {
    await expect(getRecentCurrentAffairs({ window: "CUSTOM" })).rejects.toThrow();
  });

  it("filtra por conceito e por disciplina", async () => {
    const byConcept = await getCurrentAffairsByConcept(conceptId);
    expect(byConcept.map((r) => r.id)).toEqual(
      expect.arrayContaining([recentAffairId, oldAffairId]),
    );

    const byDiscipline = await getCurrentAffairsByDiscipline(disciplineId);
    expect(byDiscipline.map((r) => r.id)).toContain(recentAffairId);
    expect(byDiscipline.map((r) => r.id)).not.toContain(oldAffairId);
  });

  it("searchCurrentAffairs busca por título", async () => {
    const results = await searchCurrentAffairs("recent_findable");
    expect(results.map((r) => r.id)).toContain(recentAffairId);
  });

  afterAll(async () => {
    await cleanupFixtures({
      currentAffairIds,
      conceptIds,
      disciplineIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
