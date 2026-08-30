/**
 * Testes de integração reais de `getReviewRecommendations` (Módulo 5,
 * seção 24) — cada recomendação precisa vir com uma justificativa
 * explicável, derivada de dados reais.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { getReviewRecommendations } from "./reviewRecommendation.service";
import {
  createFixtureUser,
  createFixtureConcept,
  createFixtureReviewItem,
  cleanupFixtures,
} from "@/test/fixtures";

const DAY = 24 * 60 * 60 * 1000;

describe("Review recommendation service", () => {
  let studentId: string;
  const userIds: string[] = [];
  const conceptIds: string[] = [];
  const reviewItemIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("reco-student", Role.STUDENT);
    studentId = student.id;
    userIds.push(studentId);

    const concept = await createFixtureConcept("reco");
    conceptIds.push(concept.id);
    const item = await createFixtureReviewItem(studentId, {
      scope: "CONCEPT",
      conceptId: concept.id,
      opts: { dueAt: new Date(Date.now() - 4 * DAY), state: "REVIEW" },
    });
    reviewItemIds.push(item.id);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });

  it("cada recomendação traz reviewItemId, priority numérica e reason explicável", async () => {
    const recommendations = await getReviewRecommendations(student());
    expect(recommendations.length).toBeGreaterThan(0);
    for (const rec of recommendations) {
      expect(typeof rec.priority).toBe("number");
      expect(rec.reason.length).toBeGreaterThan(0);
      expect(rec.reviewItemId).toBeTruthy();
    }
  });

  it("respeita o parâmetro limit", async () => {
    const recommendations = await getReviewRecommendations(student(), { limit: 1 });
    expect(recommendations).toHaveLength(1);
  });

  afterAll(async () => {
    await cleanupFixtures({ reviewItemIds, conceptIds, userIds });
    await prisma.$disconnect();
  });
});
