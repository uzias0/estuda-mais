/**
 * Testes de integração reais de conquistas (Módulo 9, seções 18-20/40).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { evaluateAndUnlockAchievements, listAchievementsForUser } from "./achievement.service";
import { getTotalXp } from "./xp.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureLesson,
  createFixtureLessonBlock,
  createFixtureAchievement,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Achievement service", () => {
  let studentId: string;
  let otherStudentId: string;
  let lessonAchievementId: string;
  let unreachableAchievementId: string;
  const userIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const achievementIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("ach-student", Role.STUDENT);
    const otherUser = await createFixtureUser("ach-other", Role.STUDENT);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId);

    // Um LessonProgress COMPLETED real (Módulo 8), direto no banco — este
    // teste avalia CONQUISTAS a partir de progresso já existente, não
    // exercita `lesson-execution.service.ts` de novo (já testado no
    // Módulo 8).
    const source = await createFixtureSource("ach");
    const lesson = await createFixtureLesson("ach");
    sourceIds.push(source.id);
    lessonIds.push(lesson.id);
    await createFixtureLessonBlock(lesson.id, 0);
    await prisma.lessonProgress.create({
      data: {
        userId: studentId,
        lessonId: lesson.id,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    const lessonAchievement = await createFixtureAchievement(
      "first-lesson",
      { type: "LESSONS_COMPLETED", count: 1 },
      { xpReward: 40 },
    );
    lessonAchievementId = lessonAchievement.id;
    achievementIds.push(lessonAchievementId);

    const unreachable = await createFixtureAchievement(
      "unreachable",
      { type: "SIMULATIONS_COMPLETED", count: 999 },
      { xpReward: 10 },
    );
    unreachableAchievementId = unreachable.id;
    achievementIds.push(unreachableAchievementId);
  });

  it("critério verdadeiro: desbloqueia e concede o XP da conquista", async () => {
    const before = await getTotalXp(student(), studentId);
    const outcomes = await evaluateAndUnlockAchievements(studentId);

    const unlocked = outcomes.find((o) => o.achievement.id === lessonAchievementId);
    expect(unlocked?.justUnlocked).toBe(true);

    const after = await getTotalXp(student(), studentId);
    expect(after - before).toBe(40);

    const row = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId: studentId, achievementId: lessonAchievementId } },
    });
    expect(row).not.toBeNull();
  });

  it("critério falso: conquista inalcançável não é desbloqueada", async () => {
    const outcomes = await evaluateAndUnlockAchievements(studentId);
    const found = outcomes.find((o) => o.achievement.id === unreachableAchievementId);
    expect(found).toBeUndefined();

    const row = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId: studentId, achievementId: unreachableAchievementId },
      },
    });
    expect(row).toBeNull();
  });

  it("idempotência: reavaliar não desbloqueia de novo nem concede XP de novo", async () => {
    const before = await getTotalXp(student(), studentId);
    const outcomes = await evaluateAndUnlockAchievements(studentId);
    // já estava desbloqueada — nem aparece mais na lista de candidatas.
    expect(outcomes.find((o) => o.achievement.id === lessonAchievementId)).toBeUndefined();
    const after = await getTotalXp(student(), studentId);
    expect(after).toBe(before);
  });

  it("listAchievementsForUser separa desbloqueadas de próximas, com progresso", async () => {
    const result = await listAchievementsForUser(student(), studentId);
    expect(result.unlocked.map((u) => u.achievement.id)).toContain(lessonAchievementId);
    const upcoming = result.upcoming.find((u) => u.achievement.id === unreachableAchievementId);
    expect(upcoming).toBeDefined();
    expect(upcoming?.evaluation.met).toBe(false);
    expect(upcoming?.evaluation.current).toBeGreaterThanOrEqual(0);
  });

  it("privacidade: outro aluno não pode consultar conquistas de terceiro", async () => {
    await expect(listAchievementsForUser(other(), studentId)).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ achievementIds, lessonIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
