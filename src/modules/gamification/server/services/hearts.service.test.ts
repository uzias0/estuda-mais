/**
 * Testes de integração reais de vidas/baterias (fase "vidas/joias") — usa
 * o parâmetro `now` opcional de cada função para testar a regeneração de
 * forma determinística, sem esperar tempo real nem mockar o relógio do
 * sistema.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { getHeartsState, loseHeart, refillHearts } from "./hearts.service";
import { HEARTS_MAX, HEART_REGEN_INTERVAL_MS } from "@/config/hearts";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";

describe("Hearts (baterias) service", () => {
  let studentId: string;
  let otherStudentId: string;
  const userIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("hearts-student", Role.STUDENT);
    const otherUser = await createFixtureUser("hearts-other", Role.STUDENT);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId);
  });

  it("usuário nunca visto começa com o máximo de baterias, sem próxima recarga", async () => {
    const state = await getHeartsState(student(), studentId);
    expect(state).toEqual({ current: HEARTS_MAX, max: HEARTS_MAX, nextRegenAt: null });
  });

  it("loseHeart consome 1 bateria e nunca fica negativo", async () => {
    const now = new Date();
    const afterOne = await loseHeart(studentId, now);
    expect(afterOne.current).toBe(HEARTS_MAX - 1);
    expect(afterOne.nextRegenAt).not.toBeNull();

    // Zera de propósito para testar o piso em 0.
    let last = afterOne;
    for (let i = 0; i < HEARTS_MAX - 1; i++) {
      last = await loseHeart(studentId, now);
    }
    expect(last.current).toBe(0);

    const oneMore = await loseHeart(studentId, now);
    expect(oneMore.current).toBe(0); // nunca negativo.
  });

  it("regenera 1 bateria sozinha depois do intervalo configurado, sem passar do máximo", async () => {
    const freshUser = await createFixtureUser("hearts-regen", Role.STUDENT);
    userIds.push(freshUser.id);
    const actor = { userId: freshUser.id, role: Role.STUDENT };

    const t0 = new Date();
    await loseHeart(freshUser.id, t0); // 24/25

    // Antes do intervalo completo: nenhuma regeneração ainda.
    const tooSoon = new Date(t0.getTime() + HEART_REGEN_INTERVAL_MS - 1);
    const stillLow = await getHeartsState(actor, freshUser.id, tooSoon);
    expect(stillLow.current).toBe(HEARTS_MAX - 1);

    // Depois de exatamente 1 intervalo: regenera 1.
    const oneIntervalLater = new Date(t0.getTime() + HEART_REGEN_INTERVAL_MS);
    const regenerated = await getHeartsState(actor, freshUser.id, oneIntervalLater);
    expect(regenerated.current).toBe(HEARTS_MAX);
    expect(regenerated.nextRegenAt).toBeNull(); // já no máximo, nada mais a esperar.

    // Muito tempo depois, sem nunca passar do máximo.
    const wayLater = new Date(t0.getTime() + HEART_REGEN_INTERVAL_MS * 1000);
    const capped = await getHeartsState(actor, freshUser.id, wayLater);
    expect(capped.current).toBe(HEARTS_MAX);
  });

  it("refillHearts soma baterias na hora, sem passar do máximo", async () => {
    const freshUser = await createFixtureUser("hearts-refill", Role.STUDENT);
    userIds.push(freshUser.id);
    const now = new Date();

    await loseHeart(freshUser.id, now);
    await loseHeart(freshUser.id, now); // 23/25

    const refilled = await refillHearts(freshUser.id, 2, now);
    expect(refilled.current).toBe(HEARTS_MAX);

    const overRefill = await refillHearts(freshUser.id, 5, now);
    expect(overRefill.current).toBe(HEARTS_MAX); // não passa do teto.
  });

  it("refillHearts rejeita quantidade não positiva", async () => {
    await expect(refillHearts(studentId, 0)).rejects.toThrow(RangeError);
    await expect(refillHearts(studentId, -1)).rejects.toThrow(RangeError);
  });

  it("privacidade: outro aluno não pode consultar baterias de terceiro", async () => {
    await expect(getHeartsState(other(), studentId)).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ userIds });
    await prisma.$disconnect();
  });
});
