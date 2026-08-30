/**
 * Testes de integração reais contra o Postgres de desenvolvimento (Módulo
 * 5). Cobre criação (item novo, estado inicial correto, primeiro
 * vencimento — seção 28), idempotência, suspensão/reativação, e privacidade
 * (seção 21: aluno nunca acessa dado de outro aluno).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { ReviewValidationError } from "./errors";
import {
  ensureReviewItem,
  getReviewItem,
  listReviewItemsForUser,
  suspendReviewItem,
  resumeReviewItem,
} from "./reviewItem.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  cleanupFixtures,
} from "@/test/fixtures";

describe("ReviewItem service", () => {
  let studentId: string;
  let otherStudentId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let questionId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const reviewItemIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("reviewitem-student", Role.STUDENT);
    const other = await createFixtureUser("reviewitem-other", Role.STUDENT);
    const admin = await createFixtureUser("reviewitem-admin", Role.ADMIN);
    const source = await createFixtureSource("reviewitem");
    const concept = await createFixtureConcept("reviewitem");
    const question = await createFixtureMultipleChoiceQuestion("reviewitem", source.id);
    studentId = student.id;
    otherStudentId = other.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptId = concept.id;
    questionId = question.id;
    userIds.push(studentId, otherStudentId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    questionIds.push(questionId);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("cria um item novo (scope=CONCEPT) com estado NEW e vencimento imediato", async () => {
    const before = new Date();
    const item = await ensureReviewItem(student(), { scope: "CONCEPT", conceptId });
    reviewItemIds.push(item.id);
    expect(item.state).toBe("NEW");
    expect(item.repetitions).toBe(0);
    expect(item.intervalDays).toBe(1);
    expect(item.easeFactor).toBe(2.5);
    expect(item.dueAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(item.userId).toBe(studentId);
  });

  it("cria um item novo (scope=QUESTION)", async () => {
    const item = await ensureReviewItem(student(), { scope: "QUESTION", questionId });
    reviewItemIds.push(item.id);
    expect(item.scope).toBe("QUESTION");
    expect(item.questionId).toBe(questionId);
  });

  it("é idempotente: chamar de novo para o mesmo conceito devolve o mesmo item, não duplica", async () => {
    const first = await ensureReviewItem(student(), { scope: "CONCEPT", conceptId });
    const second = await ensureReviewItem(student(), { scope: "CONCEPT", conceptId });
    expect(second.id).toBe(first.id);
  });

  it("rejeita scope=CONCEPT sem conceptId, e scope=QUESTION com conceptId também preenchido", async () => {
    await expect(ensureReviewItem(student(), { scope: "CONCEPT" } as never)).rejects.toThrow();
    await expect(
      ensureReviewItem(student(), { scope: "QUESTION", questionId, conceptId } as never),
    ).rejects.toThrow();
  });

  it("rejeita Concept/Question inexistente", async () => {
    await expect(
      ensureReviewItem(student(), { scope: "CONCEPT", conceptId: "concept-fantasma" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("cria sempre para o próprio actor — nunca para outro userId (autosserviço)", async () => {
    const item = await ensureReviewItem(other(), { scope: "CONCEPT", conceptId });
    reviewItemIds.push(item.id);
    expect(item.userId).toBe(otherStudentId);
    expect(item.userId).not.toBe(studentId);
  });

  it("getReviewItem: o dono consegue ler o próprio item", async () => {
    const item = await ensureReviewItem(student(), { scope: "QUESTION", questionId });
    reviewItemIds.push(item.id);
    const fetched = await getReviewItem(student(), item.id);
    expect(fetched.id).toBe(item.id);
  });

  it("getReviewItem: OUTRO aluno NÃO consegue ler o item (privacidade — seção 21)", async () => {
    const item = await ensureReviewItem(student(), { scope: "QUESTION", questionId });
    reviewItemIds.push(item.id);
    await expect(getReviewItem(other(), item.id)).rejects.toThrow(AuthorizationError);
  });

  it("getReviewItem: ADMIN consegue ler o item de qualquer aluno", async () => {
    const item = await ensureReviewItem(student(), { scope: "CONCEPT", conceptId });
    reviewItemIds.push(item.id);
    const fetched = await getReviewItem(admin(), item.id);
    expect(fetched.id).toBe(item.id);
  });

  it("listReviewItemsForUser: aluno não pode listar itens de outro aluno", async () => {
    await expect(listReviewItemsForUser(student(), otherStudentId)).rejects.toThrow(
      AuthorizationError,
    );
  });

  it("suspendReviewItem move o item para SUSPENDED; resumeReviewItem reconstitui o estado ativo", async () => {
    const item = await ensureReviewItem(student(), { scope: "QUESTION", questionId });
    reviewItemIds.push(item.id);

    const suspended = await suspendReviewItem(student(), item.id);
    expect(suspended.state).toBe("SUSPENDED");

    await expect(suspendReviewItem(student(), item.id)).rejects.toThrow(ReviewValidationError);

    const resumed = await resumeReviewItem(student(), item.id);
    expect(resumed.state).toBe("NEW"); // nunca foi revisado -> volta como NEW
  });

  it("suspendReviewItem: outro aluno não pode suspender item alheio", async () => {
    const item = await ensureReviewItem(student(), { scope: "CONCEPT", conceptId });
    reviewItemIds.push(item.id);
    await expect(suspendReviewItem(other(), item.id)).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ reviewItemIds, questionIds, conceptIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
