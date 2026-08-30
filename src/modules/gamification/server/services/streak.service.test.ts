/**
 * Testes de integração reais do streak persistido (Módulo 9, seções 11-13/40).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { recordStudyActivity, getStreak } from "./streak.service";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";

describe("Streak service", () => {
  let studentId: string;
  let otherStudentId: string;
  const userIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("streak-student", Role.STUDENT);
    const otherUser = await createFixtureUser("streak-other", Role.STUDENT);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId);
  });

  it("getStreak cria a linha padrão (tudo zerado) quando o usuário nunca estudou", async () => {
    const streak = await getStreak(other(), otherStudentId);
    expect(streak).toMatchObject({ currentStreak: 0, longestStreak: 0, daysStudied: 0 });
    expect(streak.lastStudyDate).toBeNull();
  });

  it("primeiro estudo: currentStreak = 1", async () => {
    await recordStudyActivity(studentId, new Date("2026-02-01T12:00:00Z"));
    const streak = await getStreak(student(), studentId);
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(1);
    expect(streak.daysStudied).toBe(1);
  });

  it("repetição no mesmo dia: não aumenta de novo", async () => {
    await recordStudyActivity(studentId, new Date("2026-02-01T20:00:00Z"));
    const streak = await getStreak(student(), studentId);
    expect(streak.currentStreak).toBe(1);
    expect(streak.daysStudied).toBe(1);
  });

  it("estudo no dia seguinte: currentStreak += 1", async () => {
    await recordStudyActivity(studentId, new Date("2026-02-02T12:00:00Z"));
    const streak = await getStreak(student(), studentId);
    expect(streak.currentStreak).toBe(2);
    expect(streak.longestStreak).toBe(2);
  });

  it("falta de um dia quebra a sequência; o melhor streak nunca diminui", async () => {
    await recordStudyActivity(studentId, new Date("2026-02-10T12:00:00Z")); // salto grande — quebra
    const streak = await getStreak(student(), studentId);
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(2); // preservado do streak anterior
  });

  it("privacidade: outro aluno não pode consultar o streak de terceiro", async () => {
    await expect(getStreak(other(), studentId)).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ userIds });
    await prisma.$disconnect();
  });
});
