/**
 * Testes de integração reais da meta diária (Módulo 9, seções 15-17/40).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { applyXpToDailyGoal, getDailyGoalStatus } from "./daily-goal.service";
import { getTotalXp } from "./xp.service";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";

describe("Daily goal service", () => {
  let studentId: string;
  let otherStudentId: string;
  const userIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("goal-student", Role.STUDENT);
    const otherUser = await createFixtureUser("goal-other", Role.STUDENT);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId);
  });

  it("getDailyGoalStatus cria a meta padrão (target 20, current 0) para quem nunca estudou", async () => {
    const status = await getDailyGoalStatus(other(), otherStudentId);
    expect(status).toMatchObject({ target: 20, current: 0, completed: false, remaining: 20 });
  });

  it("progresso parcial: soma XP sem completar a meta", async () => {
    const now = new Date("2026-03-01T12:00:00Z");
    const status = await applyXpToDailyGoal(studentId, 8, now);
    expect(status).toMatchObject({ target: 20, current: 8, completed: false, remaining: 12 });
    expect(status.percentage).toBe(40);
  });

  it("conclusão: cruzar o alvo concede a recompensa da meta (via awardXp interno), uma única vez", async () => {
    // `applyXpToDailyGoal` só REFLETE no contador `todayXp` um XP já
    // concedido em outro lugar (é chamada depois de `awardXp` real, na
    // orquestração) — o único XP que ELA MESMA concede é o bônus de meta
    // concluída, então `getTotalXp` só deve refletir esse bônus aqui.
    const now = new Date("2026-03-01T13:00:00Z");
    const before = await getTotalXp(student(), studentId);

    const status = await applyXpToDailyGoal(studentId, 15, now); // 8+15=23 >= 20
    expect(status.completed).toBe(true);

    const afterFirstCompletion = await getTotalXp(student(), studentId);
    expect(afterFirstCompletion - before).toBe(25); // só o bônus da meta (config: DAILY_GOAL_COMPLETED)

    // Meta já concluída — mais XP no mesmo dia não gera um segundo bônus.
    const statusAgain = await applyXpToDailyGoal(studentId, 5, now);
    expect(statusAgain.current).toBe(28);
    const afterSecondXp = await getTotalXp(student(), studentId);
    expect(afterSecondXp).toBe(afterFirstCompletion); // nenhum XP novo concedido pela própria função
  });

  it("virada de dia reinicia o progresso (current volta a 0), preservando o target", async () => {
    const nextDay = new Date("2026-03-02T09:00:00Z");
    const status = await applyXpToDailyGoal(studentId, 3, nextDay);
    expect(status.current).toBe(3);
    expect(status.target).toBe(20);
  });

  it("privacidade: outro aluno não pode consultar a meta diária de terceiro", async () => {
    await expect(getDailyGoalStatus(other(), studentId)).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ userIds });
    await prisma.$disconnect();
  });
});
