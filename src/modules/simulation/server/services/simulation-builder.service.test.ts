/**
 * Testes de integração reais de `buildSimulation` (Módulo 6, seção 34 —
 * "Construção"): filtros válidos/inválidos, quantidade, questões
 * publicadas/não publicadas, ausência de questões suficientes, duplicação,
 * os 3 modos (PERSONALIZED/EXAM_EDITION/REVIEW), e os 3 flags de "já
 * respondida" (seção 9).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { buildSimulation } from "./simulation-builder.service";
import { ensureReviewItem } from "@/modules/review/server/services/reviewItem.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureDiscipline,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  createFixtureExam,
  createFixtureExamEdition,
  cleanupFixtures,
} from "@/test/fixtures";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";

describe("Simulation builder service", () => {
  let studentId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let disciplineId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const disciplineIds: string[] = [];
  const questionIds: string[] = [];
  const simulationIds: string[] = [];
  const reviewItemIds: string[] = [];
  const examIds: string[] = [];
  const examEditionIds: string[] = [];

  const publishedQuestionIds: string[] = [];

  beforeAll(async () => {
    const student = await createFixtureUser("builder-student", Role.STUDENT);
    const admin = await createFixtureUser("builder-admin", Role.ADMIN);
    const source = await createFixtureSource("builder");
    const concept = await createFixtureConcept("builder");
    const discipline = await createFixtureDiscipline("builder");

    studentId = student.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptId = concept.id;
    disciplineId = discipline.id;
    userIds.push(studentId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    disciplineIds.push(disciplineId);

    const admin_ = { userId: adminId, role: Role.ADMIN };
    for (let i = 0; i < 5; i++) {
      const q = await createFixtureMultipleChoiceQuestion(`builder-${i}`, sourceId);
      questionIds.push(q.id);
      await createFixtureQuestionKnowledgeTag(q.id, "CONCEPT", conceptId);
      await createFixtureQuestionKnowledgeTag(q.id, "DISCIPLINE", disciplineId);
      await publishQuestion(admin_, q.id);
      publishedQuestionIds.push(q.id);
    }
  });

  const student = () => ({ userId: studentId, role: Role.STUDENT });

  it("PERSONALIZED: monta um simulado com o count e filtros pedidos, deterministicamente", async () => {
    const { simulation, questions } = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_personalized",
      filters: { count: 3, conceptId, seed: 1 },
    });
    simulationIds.push(simulation.id);
    expect(questions).toHaveLength(3);
    expect(simulation.createdByUserId).toBe(studentId);

    // determinístico: mesma seed, mesmos filtros -> mesmo conjunto de questões
    const second = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_personalized_2",
      filters: { count: 3, conceptId, seed: 1 },
    });
    simulationIds.push(second.simulation.id);
    expect(second.questions.map((q) => q.id).sort()).toEqual(questions.map((q) => q.id).sort());
  });

  it("PERSONALIZED: visão pública nunca inclui isCorrect/answerKey/gabarito", async () => {
    const { simulation, questions } = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_public_view",
      filters: { count: 2, conceptId },
    });
    simulationIds.push(simulation.id);
    for (const q of questions) {
      expect((q as unknown as Record<string, unknown>).isCorrect).toBeUndefined();
      expect((q as unknown as Record<string, unknown>).answerKey).toBeUndefined();
      for (const opt of q.options) {
        expect((opt as unknown as Record<string, unknown>).isCorrect).toBeUndefined();
      }
    }
  });

  it("rejeita filtros inválidos (count fora do limite)", async () => {
    await expect(
      buildSimulation(student(), {
        kind: "PERSONALIZED",
        title: "TEST_FIXTURE_sim_invalid",
        filters: { count: 0, conceptId },
      }),
    ).rejects.toThrow();
    await expect(
      buildSimulation(student(), {
        kind: "PERSONALIZED",
        title: "TEST_FIXTURE_sim_invalid2",
        filters: { count: 99999, conceptId },
      }),
    ).rejects.toThrow();
  });

  it("questões NÃO publicadas nunca são selecionadas", async () => {
    const unpublished = await createFixtureMultipleChoiceQuestion("builder-unpub", sourceId);
    questionIds.push(unpublished.id);
    await createFixtureQuestionKnowledgeTag(unpublished.id, "CONCEPT", conceptId);

    const { simulation, questions } = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_unpub_check",
      filters: { count: 10, conceptId },
    });
    simulationIds.push(simulation.id);
    expect(questions.map((q) => q.id)).not.toContain(unpublished.id);
  });

  it("ausência de questões elegíveis é rejeitada explicitamente", async () => {
    await expect(
      buildSimulation(student(), {
        kind: "PERSONALIZED",
        title: "TEST_FIXTURE_sim_empty",
        filters: { count: 5, conceptId: "concept-fantasma" },
      }),
    ).rejects.toThrow();
  });

  it("nunca duplica questão dentro do mesmo simulado, mesmo pedindo mais do que o pool tem", async () => {
    const { simulation, questions } = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_overrequest",
      filters: { count: 100, conceptId },
    });
    simulationIds.push(simulation.id);
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(publishedQuestionIds.length);
  });

  it("flags de 'já respondida': excludePreviouslyCorrect remove questão já acertada", async () => {
    const target = publishedQuestionIds[0];
    await prisma.questionAttempt.create({
      data: {
        userId: studentId,
        questionId: target,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: "x" },
        isCorrect: true,
        timeSpentMs: 10,
        context: "LESSON",
      },
    });

    const { simulation, questions } = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_exclude_correct",
      filters: { count: 10, conceptId, excludePreviouslyCorrect: true },
    });
    simulationIds.push(simulation.id);
    expect(questions.map((q) => q.id)).not.toContain(target);
  });

  it("flags de 'já respondida': includePreviouslyAnswered=false exclui qualquer questão já vista", async () => {
    const target = publishedQuestionIds[1];
    await prisma.questionAttempt.create({
      data: {
        userId: studentId,
        questionId: target,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: "x" },
        isCorrect: false,
        timeSpentMs: 10,
        context: "LESSON",
      },
    });

    const { simulation, questions } = await buildSimulation(student(), {
      kind: "PERSONALIZED",
      title: "TEST_FIXTURE_sim_exclude_seen",
      filters: { count: 10, conceptId, includePreviouslyAnswered: false },
    });
    simulationIds.push(simulation.id);
    expect(questions.map((q) => q.id)).not.toContain(target);
  });

  it("EXAM_EDITION: monta o simulado com as questões da prova, respeitando publicação", async () => {
    const exam = await createFixtureExam("builder");
    const edition = await createFixtureExamEdition("builder", exam.id);
    examIds.push(exam.id);
    examEditionIds.push(edition.id);

    const q1 = await createFixtureMultipleChoiceQuestion("builder-edition-1", sourceId, {
      examEditionId: edition.id,
    });
    const q2 = await createFixtureMultipleChoiceQuestion("builder-edition-2", sourceId, {
      examEditionId: edition.id,
    });
    questionIds.push(q1.id, q2.id);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, q1.id);
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, q2.id);

    const { simulation, questions } = await buildSimulation(student(), {
      kind: "EXAM_EDITION",
      title: "TEST_FIXTURE_sim_exam_edition",
      examEditionId: edition.id,
    });
    simulationIds.push(simulation.id);
    expect(questions.map((q) => q.id).sort()).toEqual([q1.id, q2.id].sort());
  });

  it("EXAM_EDITION inexistente é rejeitada", async () => {
    await expect(
      buildSimulation(student(), {
        kind: "EXAM_EDITION",
        title: "TEST_FIXTURE_sim_exam_missing",
        examEditionId: "edition-fantasma",
      }),
    ).rejects.toThrow();
  });

  it("REVIEW: monta o simulado a partir da fila de revisão do próprio aluno", async () => {
    const item = await ensureReviewItem(student(), {
      scope: "QUESTION",
      questionId: publishedQuestionIds[2],
    });
    reviewItemIds.push(item.id);

    const { simulation, questions } = await buildSimulation(student(), {
      kind: "REVIEW",
      title: "TEST_FIXTURE_sim_review",
      count: 5,
    });
    simulationIds.push(simulation.id);
    expect(questions.map((q) => q.id)).toContain(publishedQuestionIds[2]);
  });

  afterAll(async () => {
    await cleanupFixtures({
      simulationIds,
      reviewItemIds,
      examEditionIds,
      examIds,
      questionIds,
      conceptIds,
      disciplineIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
