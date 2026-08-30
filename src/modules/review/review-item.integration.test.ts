/**
 * Testes de INTEGRAÇÃO reais contra o Postgres de desenvolvimento — exercitam
 * o CHECK constraint e os índices únicos parciais criados na migration
 * `20260818210111_review_item_scope_constraint` (SQL manual, fora do DSL do
 * Prisma — ver docs/RELATORIO_REVISAO_V3.md, seção 5). Isso prova que a
 * regra é garantida pelo BANCO, não só pelo schema Zod
 * (src/modules/review/types/review-item.schema.test.ts cobre a camada de
 * aplicação separadamente).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureQuestion,
  cleanupFixtures,
} from "@/test/fixtures";

describe("ReviewItem — CHECK constraint + índices únicos parciais (banco real)", () => {
  let userId: string;
  let sourceId: string;
  let questionId: string;
  let conceptId: string;
  const reviewItemIds: string[] = [];

  beforeAll(async () => {
    const user = await createFixtureUser("review-item");
    const source = await createFixtureSource("review-item");
    const concept = await createFixtureConcept("review-item");
    const question = await createFixtureQuestion("review-item", source.id);
    userId = user.id;
    sourceId = source.id;
    conceptId = concept.id;
    questionId = question.id;
  });

  it("aceita scope=QUESTION com questionId preenchido e conceptId nulo", async () => {
    const item = await prisma.reviewItem.create({
      data: { userId, scope: "QUESTION", questionId, dueAt: new Date() },
    });
    reviewItemIds.push(item.id);
    expect(item.questionId).toBe(questionId);
    expect(item.conceptId).toBeNull();
  });

  it("aceita scope=CONCEPT com conceptId preenchido e questionId nulo", async () => {
    const item = await prisma.reviewItem.create({
      data: { userId, scope: "CONCEPT", conceptId, dueAt: new Date() },
    });
    reviewItemIds.push(item.id);
    expect(item.conceptId).toBe(conceptId);
    expect(item.questionId).toBeNull();
  });

  it("REJEITA (CHECK do banco) um ReviewItem com questionId E conceptId nulos", async () => {
    await expect(
      prisma.reviewItem.create({
        data: { userId, scope: "QUESTION", dueAt: new Date() },
      }),
    ).rejects.toThrow();
  });

  it("REJEITA (CHECK do banco) um ReviewItem com questionId E conceptId preenchidos", async () => {
    await expect(
      prisma.reviewItem.create({
        data: { userId, scope: "QUESTION", questionId, conceptId, dueAt: new Date() },
      }),
    ).rejects.toThrow();
  });

  it("REJEITA (índice único parcial) um segundo ReviewItem QUESTION duplicado para o mesmo usuário/questão", async () => {
    // limpa qualquer ReviewItem QUESTION preexistente para este par antes de
    // testar — isola este teste do estado deixado por outros `it` do arquivo.
    await prisma.reviewItem.deleteMany({ where: { userId, questionId, scope: "QUESTION" } });

    const first = await prisma.reviewItem.create({
      data: { userId, scope: "QUESTION", questionId, dueAt: new Date() },
    });
    reviewItemIds.push(first.id);

    await expect(
      prisma.reviewItem.create({
        data: { userId, scope: "QUESTION", questionId, dueAt: new Date() },
      }),
    ).rejects.toThrow();
  });

  it("REJEITA (índice único parcial) um segundo ReviewItem CONCEPT duplicado para o mesmo usuário/conceito", async () => {
    await prisma.reviewItem.deleteMany({ where: { userId, conceptId, scope: "CONCEPT" } });

    const first = await prisma.reviewItem.create({
      data: { userId, scope: "CONCEPT", conceptId, dueAt: new Date() },
    });
    reviewItemIds.push(first.id);

    await expect(
      prisma.reviewItem.create({
        data: { userId, scope: "CONCEPT", conceptId, dueAt: new Date() },
      }),
    ).rejects.toThrow();
  });

  afterAll(async () => {
    await cleanupFixtures({
      reviewItemIds,
      questionIds: [questionId],
      conceptIds: [conceptId],
      sourceIds: [sourceId],
      userIds: [userId],
    });
    await prisma.$disconnect();
  });
});
