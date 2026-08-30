/**
 * Testes de integração reais do ledger de XP (Módulo 9, seções 6-8/27/30/40).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { awardXp, getTotalXp, listXpHistory } from "./xp.service";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";

describe("XP service", () => {
  let studentId: string;
  let otherStudentId: string;
  const userIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("xp-student", Role.STUDENT);
    const otherUser = await createFixtureUser("xp-other", Role.STUDENT);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId);
  });

  it("rejeita XP negativo", async () => {
    await expect(
      awardXp({
        userId: studentId,
        type: "LESSON_COMPLETED",
        idempotencyKey: `neg-${studentId}`,
        amount: -10,
      }),
    ).rejects.toThrow(RangeError);
  });

  it("concede XP e soma no total", async () => {
    await awardXp({
      userId: studentId,
      type: "LESSON_COMPLETED",
      idempotencyKey: `xp-basic-1:${studentId}`,
      amount: 50,
      referenceType: "LessonProgress",
      referenceId: "lp-1",
    });
    const total = await getTotalXp(student(), studentId);
    expect(total).toBeGreaterThanOrEqual(50);
  });

  it("idempotência: mesma idempotencyKey nunca duplica XP", async () => {
    const key = `xp-idempotent:${studentId}`;
    const before = await getTotalXp(student(), studentId);

    const first = await awardXp({
      userId: studentId,
      type: "LESSON_COMPLETED",
      idempotencyKey: key,
      amount: 30,
    });
    expect(first.alreadyAwarded).toBe(false);

    const second = await awardXp({
      userId: studentId,
      type: "LESSON_COMPLETED",
      idempotencyKey: key,
      amount: 30,
    });
    expect(second.alreadyAwarded).toBe(true);
    expect(second.event.id).toBe(first.event.id);

    const after = await getTotalXp(student(), studentId);
    expect(after - before).toBe(30); // não 60 — a segunda chamada não concedeu nada.
  });

  it("evento 1 → XP concedido; evento 2 igual → XP não duplicado (mesmo com amount diferente no payload)", async () => {
    const key = `xp-forge-attempt:${studentId}`;
    await awardXp({
      userId: studentId,
      type: "SIMULATION_COMPLETED",
      idempotencyKey: key,
      amount: 100,
    });
    // Uma segunda tentativa com valor MAIOR (simulando um payload que tentasse
    // "corrigir" o XP para mais) ainda deve ser tratada como já concedida —
    // o valor gravado na primeira vez é o que prevalece.
    const second = await awardXp({
      userId: studentId,
      type: "SIMULATION_COMPLETED",
      idempotencyKey: key,
      amount: 999999,
    });
    expect(second.alreadyAwarded).toBe(true);
    expect(second.event.xpAwarded).toBe(100);
  });

  it("listXpHistory devolve o histórico mais recente primeiro, com origem rastreável", async () => {
    const history = await listXpHistory(student(), studentId);
    expect(history.length).toBeGreaterThan(0);
    for (let i = 1; i < history.length; i++) {
      expect(history[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
        history[i].createdAt.getTime(),
      );
    }
    expect(history.every((e) => typeof e.type === "string" && e.type.length > 0)).toBe(true);
  });

  it("privacidade: outro aluno não pode consultar XP/histórico de terceiro", async () => {
    await expect(getTotalXp(other(), studentId)).rejects.toThrow(AuthorizationError);
    await expect(listXpHistory(other(), studentId)).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ userIds });
    await prisma.$disconnect();
  });
});
