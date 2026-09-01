/**
 * Testes de integração reais do ranking semanal — divisão por nível,
 * ordenação por XP ganho NA SEMANA (não pelo total histórico), contra o
 * Postgres real.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { getWeeklyRanking } from "./weekly-ranking.service";
import { awardXp } from "./xp.service";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";

describe("getWeeklyRanking", () => {
  const userIds: string[] = [];

  async function makeActor(suffix: string) {
    const user = await createFixtureUser(`ranking-${suffix}`, Role.STUDENT);
    userIds.push(user.id);
    return { userId: user.id, role: Role.STUDENT };
  }

  it("aluno sem nenhum XP fica na divisão Bronze (nível 1), sozinho consigo mesmo no mínimo", async () => {
    const actor = await makeActor("fresh");
    const result = await getWeeklyRanking(actor, actor.userId);
    expect(result.division.id).toBe("bronze");
    expect(result.ownEntry.xpThisWeek).toBe(0);
    expect(result.ownEntry.rank).toBeGreaterThanOrEqual(1);
    expect(result.top.some((e) => e.userId === actor.userId)).toBe(true);
  });

  it("ordena por XP ganho NESTA SEMANA — quem ganhou mais XP fica em 1º na mesma divisão", async () => {
    const low = await makeActor("low");
    const high = await makeActor("high");

    await awardXp({
      userId: low.userId,
      type: "LESSON_COMPLETED",
      idempotencyKey: `ranking-low:${low.userId}`,
      amount: 10,
    });
    await awardXp({
      userId: high.userId,
      type: "LESSON_COMPLETED",
      idempotencyKey: `ranking-high:${high.userId}`,
      amount: 500,
    });

    const resultForHigh = await getWeeklyRanking(high, high.userId);
    // Ambos ficam em Bronze (nível 1, XP baixo) — high deve estar À FRENTE de low no ranking.
    const highEntry = resultForHigh.top.find((e) => e.userId === high.userId)!;
    const lowEntry = resultForHigh.top.find((e) => e.userId === low.userId);
    expect(highEntry.xpThisWeek).toBe(500);
    if (lowEntry) {
      expect(highEntry.rank).toBeLessThan(lowEntry.rank);
    }
  });

  it("divisões diferentes não se misturam — alguém com XP suficiente pra outro nível não aparece na divisão Bronze", async () => {
    const bronze = await makeActor("division-bronze");
    const higherLevel = await makeActor("division-higher");

    // XP alto o bastante pra sair da divisão Bronze (nível > 5) — usa
    // vários eventos reais em vez de um só gigante, mesmo ledger de sempre.
    for (let i = 0; i < 5; i++) {
      await awardXp({
        userId: higherLevel.userId,
        type: "SIMULATION_COMPLETED",
        idempotencyKey: `ranking-higher-${i}:${higherLevel.userId}`,
        amount: 200,
      });
    }

    const resultBronze = await getWeeklyRanking(bronze, bronze.userId);
    const resultHigher = await getWeeklyRanking(higherLevel, higherLevel.userId);

    expect(resultHigher.division.id).not.toBe("bronze");
    expect(resultBronze.top.some((e) => e.userId === higherLevel.userId)).toBe(false);
  });

  it("privacidade: outro aluno não pode consultar o ranking de terceiro", async () => {
    const owner = await makeActor("privacy-owner");
    const other = await makeActor("privacy-other");
    await expect(
      getWeeklyRanking({ userId: other.userId, role: Role.STUDENT }, owner.userId),
    ).rejects.toThrow(AuthorizationError);
  });

  it("ADMIN pode consultar o ranking de qualquer aluno", async () => {
    const student = await makeActor("admin-view-target");
    const admin = await createFixtureUser("ranking-admin", Role.ADMIN);
    userIds.push(admin.id);

    const result = await getWeeklyRanking({ userId: admin.id, role: Role.ADMIN }, student.userId);
    expect(result.ownEntry.userId).toBe(student.userId);
  });

  afterAll(async () => {
    await cleanupFixtures({ userIds });
    await prisma.$disconnect();
  });
});
