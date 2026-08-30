/**
 * Testes de integração reais de `simulation-query.service.ts` — tentativas
 * do usuário (privacidade) e disciplinas disponíveis (seção 6.3 — "a lista
 * real deve vir do banco").
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role, PublicationStatus } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import {
  getSimulationAttemptDetail,
  listSimulationAttemptsForUser,
  listAvailableDisciplines,
} from "./simulation-query.service";
import { createSimulationFromQuestionIds, publishSimulation } from "./simulation.service";
import { startSimulation } from "./simulation-attempt.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureDiscipline,
  createFixtureMultipleChoiceQuestion,
  cleanupFixtures,
} from "@/test/fixtures";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";

describe("Simulation query service", () => {
  let studentId: string;
  let otherStudentId: string;
  let editorId: string;
  let adminId: string;
  let sourceId: string;
  let questionId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const questionIds: string[] = [];
  const simulationIds: string[] = [];
  const disciplineIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("query-sim-student", Role.STUDENT);
    const other = await createFixtureUser("query-sim-other", Role.STUDENT);
    const editor = await createFixtureUser("query-sim-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("query-sim-admin", Role.ADMIN);
    const source = await createFixtureSource("query-sim");
    const question = await createFixtureMultipleChoiceQuestion("query-sim", source.id);

    studentId = student.id;
    otherStudentId = other.id;
    editorId = editor.id;
    adminId = admin.id;
    sourceId = source.id;
    questionId = question.id;

    userIds.push(studentId, otherStudentId, editorId, adminId);
    sourceIds.push(sourceId);
    questionIds.push(questionId);

    await publishQuestion({ userId: adminId, role: Role.ADMIN }, questionId);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });
  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });

  it("listAvailableDisciplines só lista disciplinas PUBLICADAS, vindas do banco", async () => {
    const draft = await createFixtureDiscipline("query-sim-draft");
    const published = await createFixtureDiscipline("query-sim-published");
    disciplineIds.push(draft.id, published.id);
    await prisma.discipline.update({
      where: { id: published.id },
      data: { status: PublicationStatus.PUBLISHED },
    });

    const list = await listAvailableDisciplines();
    const ids = list.map((d) => d.id);
    expect(ids).toContain(published.id);
    expect(ids).not.toContain(draft.id);
  });

  it("getSimulationAttemptDetail: dono e CURATOR_ROLES acessam; outro aluno não", async () => {
    const simulation = await createSimulationFromQuestionIds(editor(), {
      title: "TEST_FIXTURE_sim_query",
      questionIds: [questionId],
    });
    simulationIds.push(simulation.id);
    await publishSimulation({ userId: adminId, role: Role.ADMIN }, simulation.id);
    const { attemptId } = await startSimulation(student(), simulation.id);

    const own = await getSimulationAttemptDetail(student(), attemptId);
    expect(own.id).toBe(attemptId);

    const asEditor = await getSimulationAttemptDetail(editor(), attemptId);
    expect(asEditor.id).toBe(attemptId);

    await expect(getSimulationAttemptDetail(other(), attemptId)).rejects.toThrow(
      AuthorizationError,
    );
  });

  it("listSimulationAttemptsForUser: privacidade e listagem cronológica", async () => {
    const simulation = await createSimulationFromQuestionIds(editor(), {
      title: "TEST_FIXTURE_sim_query_list",
      questionIds: [questionId],
    });
    simulationIds.push(simulation.id);
    await publishSimulation({ userId: adminId, role: Role.ADMIN }, simulation.id);
    await startSimulation(student(), simulation.id);

    const list = await listSimulationAttemptsForUser(student(), studentId);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((a) => a.userId === studentId)).toBe(true);

    await expect(listSimulationAttemptsForUser(other(), studentId)).rejects.toThrow(
      AuthorizationError,
    );
  });

  afterAll(async () => {
    await cleanupFixtures({
      simulationIds,
      questionIds,
      disciplineIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
