/**
 * Testes de integração reais do resumo consolidado (Módulo 9, seção 28) e do
 * progresso acadêmico composto (seção 21) — verifica forma e privacidade;
 * os cálculos individuais (XP/nível/streak/meta/conquistas/progresso) já
 * são testados em profundidade nos outros arquivos deste módulo e no
 * Módulo 8.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { getGamificationSummary } from "./gamification-summary.service";
import { getStudentProgress, getTrackProgress } from "./student-progress.service";
import { awardXp } from "./xp.service";
import { createFixtureUser, createFixtureTrack, cleanupFixtures } from "@/test/fixtures";

describe("Gamification summary / student progress", () => {
  let studentId: string;
  let otherStudentId: string;
  const userIds: string[] = [];
  const trackIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("summary-student", Role.STUDENT);
    const otherUser = await createFixtureUser("summary-other", Role.STUDENT);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId);

    await awardXp({
      userId: studentId,
      type: "LESSON_COMPLETED",
      idempotencyKey: `summary-seed:${studentId}`,
      amount: 120,
    });
  });

  it("getGamificationSummary devolve XP/nível/streak/meta/conquistas/progresso acadêmico consolidados", async () => {
    const summary = await getGamificationSummary(student(), studentId);

    expect(summary.xp.totalXp).toBe(120);
    expect(summary.xp.currentLevel).toBeGreaterThanOrEqual(1);
    expect(summary.streak).toMatchObject({ currentStreak: expect.any(Number) });
    expect(summary.dailyGoal).toMatchObject({ target: expect.any(Number) });
    expect(summary.achievements).toHaveProperty("recent");
    expect(summary.achievements).toHaveProperty("upcoming");
    expect(summary.academicProgress).toHaveProperty("lessons");
    expect(summary.academicProgress).toHaveProperty("review");
    expect(summary.academicProgress).toHaveProperty("simulation");
    // Fase "vidas/joias" — usuário novo começa com o máximo de baterias e
    // zero joia (nunca completou nada que concedesse joia neste teste).
    expect(summary.hearts).toMatchObject({ current: 25, max: 25, nextRegenAt: null });
    expect(summary.gemBalance).toBe(0);
  });

  it("getStudentProgress compõe lições/revisão/simulados sem erro para quem nunca estudou", async () => {
    const progress = await getStudentProgress(other(), otherStudentId);
    expect(progress.lessons.lessonsStarted).toBe(0);
    expect(progress.review.totalReviews).toBe(0);
    expect(progress.simulation.trend).toBe("SEM_DADOS");
  });

  it("re-exporta getTrackProgress do Módulo 8 sem reimplementar (0% para trilha vazia)", async () => {
    const track = await createFixtureTrack("summary");
    trackIds.push(track.id);
    const progress = await getTrackProgress(student(), studentId, track.id);
    expect(progress).toMatchObject({ lessonsTotal: 0, lessonsCompleted: 0, percentage: 0 });
  });

  it("privacidade: outro aluno não pode consultar o resumo de terceiro", async () => {
    await expect(getGamificationSummary(other(), studentId)).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({ trackIds, userIds });
    await prisma.$disconnect();
  });
});
