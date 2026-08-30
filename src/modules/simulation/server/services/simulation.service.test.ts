/**
 * Testes de integração reais de `simulation.service.ts` — criação
 * administrativa, publicação/arquivamento (gate estrutural), visibilidade
 * (curado vs. personalizado) e listagem.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { SimulationValidationError } from "./errors";
import {
  createSimulationFromQuestionIds,
  publishSimulation,
  archiveSimulation,
  getSimulation,
  listSimulations,
} from "./simulation.service";
import { buildSimulation } from "./simulation-builder.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";

describe("Simulation service (curatorial)", () => {
  let studentId: string;
  let otherStudentId: string;
  let editorId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let publishedQuestionId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const simulationIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("sim-svc-student", Role.STUDENT);
    const other = await createFixtureUser("sim-svc-other", Role.STUDENT);
    const editor = await createFixtureUser("sim-svc-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("sim-svc-admin", Role.ADMIN);
    const source = await createFixtureSource("sim-svc");
    const concept = await createFixtureConcept("sim-svc");
    const question = await createFixtureMultipleChoiceQuestion("sim-svc", source.id);

    studentId = student.id;
    otherStudentId = other.id;
    editorId = editor.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptId = concept.id;
    publishedQuestionId = question.id;

    userIds.push(studentId, otherStudentId, editorId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    questionIds.push(publishedQuestionId);

    await createFixtureQuestionKnowledgeTag(publishedQuestionId, "CONCEPT", conceptId);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, publishedQuestionId);
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });
  const editor = () => ({ userId: editorId, role: Role.CONTENT_EDITOR });
  const admin = () => ({ userId: adminId, role: Role.ADMIN });

  it("createSimulationFromQuestionIds: CONTENT_EDITOR cria um simulado administrativo válido", async () => {
    const simulation = await createSimulationFromQuestionIds(editor(), {
      title: "TEST_FIXTURE_sim_manual",
      questionIds: [publishedQuestionId],
    });
    simulationIds.push(simulation.id);
    expect(simulation.status).toBe("DRAFT");
    expect(simulation.createdByUserId).toBeNull();
  });

  it("createSimulationFromQuestionIds: STUDENT não pode", async () => {
    await expect(
      createSimulationFromQuestionIds(student(), {
        title: "TEST_FIXTURE_sim_manual_student",
        questionIds: [publishedQuestionId],
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it("createSimulationFromQuestionIds: rejeita questão não publicada/inexistente", async () => {
    await expect(
      createSimulationFromQuestionIds(editor(), {
        title: "TEST_FIXTURE_sim_manual_bad",
        questionIds: ["questao-fantasma"],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("publishSimulation: exige ao menos uma questão (gate estrutural)", async () => {
    // Simulado sem questões — só é alcançável manipulando o banco direto,
    // já que os dois caminhos de criação (builder/manual) sempre exigem
    // >= 1 questão; usado aqui só para exercitar o gate de publicação.
    const empty = await prisma.simulation.create({
      data: { title: "TEST_FIXTURE_sim_empty_pub", config: {} },
    });
    simulationIds.push(empty.id);
    await expect(publishSimulation(admin(), empty.id)).rejects.toThrow(SimulationValidationError);
  });

  it("publishSimulation: ADMIN publica; CONTENT_EDITOR não pode", async () => {
    const simulation = await createSimulationFromQuestionIds(editor(), {
      title: "TEST_FIXTURE_sim_to_publish",
      questionIds: [publishedQuestionId],
    });
    simulationIds.push(simulation.id);

    await expect(publishSimulation(editor(), simulation.id)).rejects.toThrow(AuthorizationError);
    const published = await publishSimulation(admin(), simulation.id);
    expect(published.status).toBe("PUBLISHED");

    await expect(publishSimulation(admin(), simulation.id)).rejects.toThrow(
      SimulationValidationError,
    );
  });

  it("archiveSimulation: idempotência (não arquiva duas vezes)", async () => {
    const simulation = await createSimulationFromQuestionIds(editor(), {
      title: "TEST_FIXTURE_sim_to_archive",
      questionIds: [publishedQuestionId],
    });
    simulationIds.push(simulation.id);

    const archived = await archiveSimulation(editor(), simulation.id);
    expect(archived.status).toBe("ARCHIVED");
    await expect(archiveSimulation(editor(), simulation.id)).rejects.toThrow();
  });

  it("visibilidade: um simulado PERSONALIZADO (DRAFT) só é visível para quem o criou", async () => {
    const { simulation } = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_visibility",
      filters: { count: 1, conceptId },
    });
    simulationIds.push(simulation.id);

    const own = await getSimulation(student(), simulation.id);
    expect(own.id).toBe(simulation.id);

    await expect(getSimulation(other(), simulation.id)).rejects.toThrow(SimulationValidationError);
    // CURATOR_ROLES ainda enxergam qualquer simulado (curadoria/suporte).
    const asAdmin = await getSimulation(admin(), simulation.id);
    expect(asAdmin.id).toBe(simulation.id);
  });

  it("visibilidade: um simulado PUBLISHED é visível para qualquer aluno", async () => {
    const simulation = await createSimulationFromQuestionIds(editor(), {
      title: "TEST_FIXTURE_sim_public",
      questionIds: [publishedQuestionId],
    });
    simulationIds.push(simulation.id);
    await publishSimulation(admin(), simulation.id);

    const seenByOther = await getSimulation(other(), simulation.id);
    expect(seenByOther.status).toBe("PUBLISHED");
  });

  it("listSimulations: sem filtro `mine`, alunos só veem PUBLISHED", async () => {
    const list = await listSimulations(student());
    expect(list.every((s) => s.status === "PUBLISHED")).toBe(true);
  });

  it("listSimulations: com `mine=true`, o aluno vê seus próprios simulados (mesmo DRAFT)", async () => {
    const { simulation } = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_mine",
      filters: { count: 1, conceptId },
    });
    simulationIds.push(simulation.id);

    const list = await listSimulations(student(), { mine: true });
    expect(list.map((s) => s.id)).toContain(simulation.id);
  });

  afterAll(async () => {
    await cleanupFixtures({ simulationIds, questionIds, conceptIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
