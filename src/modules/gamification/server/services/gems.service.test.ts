/**
 * Testes de integração reais do ledger de joias (fase "vidas/joias") —
 * mesmo padrão de `xp.service.test.ts` (Módulo 9), adaptado para a
 * diferença deliberada deste ledger: `amount` pode ser negativo (gasto).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import {
  creditGems,
  debitGems,
  getGemBalance,
  getGemBalanceForActor,
  listGemHistory,
  InsufficientGemsError,
} from "./gems.service";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";

describe("Gems (joias) service", () => {
  let studentId: string;
  let otherStudentId: string;
  const userIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("gems-student", Role.STUDENT);
    const otherUser = await createFixtureUser("gems-other", Role.STUDENT);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId);
  });

  it("rejeita crédito não positivo", async () => {
    await expect(
      creditGems({
        userId: studentId,
        type: "LESSON_COMPLETED",
        idempotencyKey: `neg-${studentId}`,
        amount: 0,
      }),
    ).rejects.toThrow(RangeError);
    await expect(
      creditGems({
        userId: studentId,
        type: "LESSON_COMPLETED",
        idempotencyKey: `neg2-${studentId}`,
        amount: -5,
      }),
    ).rejects.toThrow(RangeError);
  });

  it("concede joia e soma no saldo", async () => {
    await creditGems({
      userId: studentId,
      type: "LESSON_COMPLETED",
      idempotencyKey: `gems-basic-1:${studentId}`,
      amount: 10,
    });
    const balance = await getGemBalance(studentId);
    expect(balance).toBeGreaterThanOrEqual(10);
  });

  it("idempotência: mesma idempotencyKey nunca duplica crédito", async () => {
    const key = `gems-idempotent:${studentId}`;
    const before = await getGemBalance(studentId);

    const first = await creditGems({
      userId: studentId,
      type: "LESSON_COMPLETED",
      idempotencyKey: key,
      amount: 30,
    });
    expect(first.alreadyProcessed).toBe(false);

    const second = await creditGems({
      userId: studentId,
      type: "LESSON_COMPLETED",
      idempotencyKey: key,
      amount: 30,
    });
    expect(second.alreadyProcessed).toBe(true);
    expect(second.transaction.id).toBe(first.transaction.id);

    const after = await getGemBalance(studentId);
    expect(after - before).toBe(30); // não 60.
  });

  it("debitGems gasta joia quando há saldo suficiente", async () => {
    const freshUser = await createFixtureUser("gems-debit", Role.STUDENT);
    userIds.push(freshUser.id);

    await creditGems({
      userId: freshUser.id,
      type: "LESSON_COMPLETED",
      idempotencyKey: `gems-debit-seed:${freshUser.id}`,
      amount: 50,
    });

    const debit = await debitGems({
      userId: freshUser.id,
      type: "HEART_REFILL",
      idempotencyKey: `gems-debit-1:${freshUser.id}`,
      amount: 20,
    });
    expect(debit.transaction.amount).toBe(-20);

    const balance = await getGemBalance(freshUser.id);
    expect(balance).toBe(30);
  });

  it("debitGems rejeita com InsufficientGemsError quando o saldo é menor que o pedido", async () => {
    const freshUser = await createFixtureUser("gems-insufficient", Role.STUDENT);
    userIds.push(freshUser.id);

    await expect(
      debitGems({
        userId: freshUser.id,
        type: "HEART_REFILL",
        idempotencyKey: `gems-insufficient-1:${freshUser.id}`,
        amount: 20,
      }),
    ).rejects.toThrow(InsufficientGemsError);

    const balance = await getGemBalance(freshUser.id);
    expect(balance).toBe(0); // tentativa rejeitada não grava nada.
  });

  it("debitGems rejeita quantidade não positiva", async () => {
    await expect(
      debitGems({
        userId: studentId,
        type: "HEART_REFILL",
        idempotencyKey: `neg-debit-${studentId}`,
        amount: 0,
      }),
    ).rejects.toThrow(RangeError);
  });

  it("debitGems idempotente: reenviar a MESMA idempotencyKey não gasta duas vezes", async () => {
    const freshUser = await createFixtureUser("gems-debit-idempotent", Role.STUDENT);
    userIds.push(freshUser.id);
    await creditGems({
      userId: freshUser.id,
      type: "LESSON_COMPLETED",
      idempotencyKey: `gems-debit-idem-seed:${freshUser.id}`,
      amount: 40,
    });

    const key = `gems-debit-idem:${freshUser.id}`;
    const first = await debitGems({
      userId: freshUser.id,
      type: "HEART_REFILL",
      idempotencyKey: key,
      amount: 20,
    });
    expect(first.alreadyProcessed).toBe(false);
    const second = await debitGems({
      userId: freshUser.id,
      type: "HEART_REFILL",
      idempotencyKey: key,
      amount: 20,
    });
    expect(second.alreadyProcessed).toBe(true);

    const balance = await getGemBalance(freshUser.id);
    expect(balance).toBe(20); // gasto uma única vez, não duas.
  });

  it("listGemHistory devolve o histórico mais recente primeiro", async () => {
    const history = await listGemHistory(student(), studentId);
    expect(history.length).toBeGreaterThan(0);
    for (let i = 1; i < history.length; i++) {
      expect(history[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
        history[i].createdAt.getTime(),
      );
    }
  });

  it("privacidade: outro aluno não pode consultar saldo/histórico de terceiro", async () => {
    await expect(getGemBalanceForActor(other(), studentId)).rejects.toThrow(AuthorizationError);
    await expect(listGemHistory(other(), studentId)).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ userIds });
    await prisma.$disconnect();
  });
});
