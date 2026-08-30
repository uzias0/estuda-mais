/**
 * Testes de integração reais da fila de revisão (Módulo 5, seção 12/28:
 * "itens vencidos; itens futuros; ordenação; prioridade; limite diário").
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { getReviewQueue } from "./reviewQueue.service";
import {
  createFixtureUser,
  createFixtureConcept,
  createFixtureReviewItem,
  cleanupFixtures,
} from "@/test/fixtures";

const DAY = 24 * 60 * 60 * 1000;

describe("Review queue service", () => {
  let studentId: string;
  let otherStudentId: string;
  const userIds: string[] = [];
  const conceptIds: string[] = [];
  const reviewItemIds: string[] = [];

  let conceptHardId: string;
  let conceptEasyId: string;
  let itemOverdueId: string;
  let itemDueTodayId: string;
  let itemFutureId: string;
  let itemSuspendedId: string;

  beforeAll(async () => {
    const student = await createFixtureUser("queue-student", Role.STUDENT);
    const other = await createFixtureUser("queue-other", Role.STUDENT);
    studentId = student.id;
    otherStudentId = other.id;
    userIds.push(studentId, otherStudentId);

    // Cada ReviewItem CONCEPT deste usuário precisa de um Concept DIFERENTE —
    // o índice único parcial (userId, conceptId) WHERE scope='CONCEPT'
    // (migration do Módulo 1) permite só um item por usuário/conceito.
    const hard = await createFixtureConcept("queue-hard", { difficulty: "AVANCADO" });
    const easy = await createFixtureConcept("queue-easy", { difficulty: "INICIANTE" });
    const hard2 = await createFixtureConcept("queue-hard-2", { difficulty: "AVANCADO" });
    const hard3 = await createFixtureConcept("queue-hard-3", { difficulty: "AVANCADO" });
    conceptHardId = hard.id;
    conceptEasyId = easy.id;
    conceptIds.push(conceptHardId, conceptEasyId, hard2.id, hard3.id);

    const now = new Date();
    // Cada `push` acontece logo após a criação (não em lote ao final) —
    // se uma criação seguinte falhar, os itens já criados ainda são
    // limpos no `afterAll` em vez de ficarem órfãos apontando para um
    // Concept que o `afterAll` tentaria apagar.
    const overdue = await createFixtureReviewItem(studentId, {
      scope: "CONCEPT",
      conceptId: conceptHardId,
      opts: { dueAt: new Date(now.getTime() - 5 * DAY), state: "REVIEW" },
    });
    itemOverdueId = overdue.id;
    reviewItemIds.push(itemOverdueId);

    const dueToday = await createFixtureReviewItem(studentId, {
      scope: "CONCEPT",
      conceptId: conceptEasyId,
      opts: { dueAt: now, state: "REVIEW" },
    });
    itemDueTodayId = dueToday.id;
    reviewItemIds.push(itemDueTodayId);

    const future = await createFixtureReviewItem(studentId, {
      scope: "CONCEPT",
      conceptId: hard2.id,
      opts: { dueAt: new Date(now.getTime() + 5 * DAY), state: "REVIEW" },
    });
    itemFutureId = future.id;
    reviewItemIds.push(itemFutureId);

    const suspended = await createFixtureReviewItem(studentId, {
      scope: "CONCEPT",
      conceptId: hard3.id,
      opts: { dueAt: new Date(now.getTime() - 10 * DAY), state: "SUSPENDED" },
    });
    itemSuspendedId = suspended.id;
    reviewItemIds.push(itemSuspendedId);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  it("nunca inclui itens SUSPENDED", async () => {
    const queue = await getReviewQueue(student(), studentId);
    expect(queue.map((e) => e.reviewItem.id)).not.toContain(itemSuspendedId);
  });

  it("ordena por prioridade decrescente — o mais atrasado vem primeiro, o futuro por último", async () => {
    const queue = await getReviewQueue(student(), studentId);
    const ids = queue.map((e) => e.reviewItem.id);
    expect(ids.indexOf(itemOverdueId)).toBeLessThan(ids.indexOf(itemDueTodayId));
    expect(ids.indexOf(itemDueTodayId)).toBeLessThan(ids.indexOf(itemFutureId));
    // priorities estão de fato decrescentes
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i - 1].priority).toBeGreaterThanOrEqual(queue[i].priority);
    }
  });

  it("dueOnly exclui itens ainda não vencidos", async () => {
    const queue = await getReviewQueue(student(), studentId, { dueOnly: true });
    expect(queue.map((e) => e.reviewItem.id)).not.toContain(itemFutureId);
    expect(queue.map((e) => e.reviewItem.id)).toContain(itemOverdueId);
  });

  it("overdueOnly exclui itens vencidos há menos de 24h e itens futuros", async () => {
    const queue = await getReviewQueue(student(), studentId, { overdueOnly: true });
    const ids = queue.map((e) => e.reviewItem.id);
    expect(ids).toContain(itemOverdueId);
    expect(ids).not.toContain(itemDueTodayId);
    expect(ids).not.toContain(itemFutureId);
  });

  it("filtra por difficulty (resolvida via Concept.difficulty)", async () => {
    const queue = await getReviewQueue(student(), studentId, { difficulty: "INICIANTE" });
    expect(queue.map((e) => e.reviewItem.id)).toEqual([itemDueTodayId]);
  });

  it("filtra por conceptId", async () => {
    const queue = await getReviewQueue(student(), studentId, { conceptId: conceptEasyId });
    expect(queue.map((e) => e.reviewItem.id)).toEqual([itemDueTodayId]);
  });

  it("respeita o limite diário (limit)", async () => {
    const queue = await getReviewQueue(student(), studentId, { limit: 1 });
    expect(queue).toHaveLength(1);
    expect(queue[0].reviewItem.id).toBe(itemOverdueId);
  });

  it("cada entrada traz uma justificativa (reason) não vazia", async () => {
    const queue = await getReviewQueue(student(), studentId);
    for (const entry of queue) {
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it("privacidade: outro aluno não pode consultar a fila alheia", async () => {
    await expect(getReviewQueue(other(), studentId)).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ reviewItemIds, conceptIds, userIds });
    await prisma.$disconnect();
  });
});
