/**
 * Testes de integração reais de recomendação determinística (Módulo 6,
 * seções 19/20/23/34): lacuna crítica/moderada, ponto forte, ausência de
 * dados, dados insuficientes (amostra pequena demais).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import {
  getStudyRecommendation,
  getNextSimulationRecommendation,
} from "./simulation-recommendation.service";
import { createSimulationFromQuestionIds, publishSimulation } from "./simulation.service";
import {
  startSimulation,
  submitSimulationAnswer,
  finishSimulation,
} from "./simulation-attempt.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureDiscipline,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  cleanupFixtures,
} from "@/test/fixtures";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";

describe("Simulation recommendation service", () => {
  let studentId: string;
  let otherStudentId: string;
  let adminId: string;
  let sourceId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const disciplineIds: string[] = [];
  const questionIds: string[] = [];
  const simulationIds: string[] = [];

  let criticalConceptId: string;
  let strongConceptId: string;

  const admin = () => ({ userId: adminId, role: Role.ADMIN });
  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  /** Cria N questões tagueadas a um conceito/disciplina e responde cada uma corretamente ou não, conforme o padrão. */
  async function seedConceptPerformance(suffix: string, correctPattern: boolean[]) {
    const concept = await createFixtureConcept(`reco-${suffix}`);
    const discipline = await createFixtureDiscipline(`reco-${suffix}`);
    conceptIds.push(concept.id);
    disciplineIds.push(discipline.id);

    const qIds: string[] = [];
    for (let i = 0; i < correctPattern.length; i++) {
      const q = await createFixtureMultipleChoiceQuestion(`reco-${suffix}-${i}`, sourceId, {
        correctIndex: 0,
      });
      questionIds.push(q.id);
      await createFixtureQuestionKnowledgeTag(q.id, "CONCEPT", concept.id);
      await createFixtureQuestionKnowledgeTag(q.id, "DISCIPLINE", discipline.id);
      await publishQuestion(admin(), q.id);
      qIds.push(q.id);
    }

    const simulation = await createSimulationFromQuestionIds(admin(), {
      title: `TEST_FIXTURE_sim_reco_${suffix}`,
      questionIds: qIds,
    });
    simulationIds.push(simulation.id);
    await publishSimulation(admin(), simulation.id);
    const { attemptId } = await startSimulation(student(), simulation.id);

    for (let i = 0; i < qIds.length; i++) {
      const option = await prisma.questionOption.findFirstOrThrow({
        where: { questionId: qIds[i], isCorrect: correctPattern[i] },
      });
      await submitSimulationAnswer(student(), {
        attemptId,
        questionId: qIds[i],
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: option.id },
        timeSpentMs: 100,
      });
    }
    await finishSimulation(student(), attemptId);
    return { conceptId: concept.id, disciplineId: discipline.id };
  }

  beforeAll(async () => {
    const studentUser = await createFixtureUser("reco-student", Role.STUDENT);
    const otherUser = await createFixtureUser("reco-other", Role.STUDENT);
    const adminUser = await createFixtureUser("reco-admin", Role.ADMIN);
    const source = await createFixtureSource("reco");
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    adminId = adminUser.id;
    sourceId = source.id;
    userIds.push(studentId, otherStudentId, adminId);
    sourceIds.push(sourceId);

    // 0/3 -> lacuna CRÍTICA (<=20%); 1/3≈33% -> lacuna MODERADA (21-40%); 3/3 -> PONTO FORTE (>=61%).
    const critical = await seedConceptPerformance("critical", [false, false, false]);
    await seedConceptPerformance("moderate", [true, false, false]);
    const strong = await seedConceptPerformance("strong", [true, true, true]);
    criticalConceptId = critical.conceptId;
    strongConceptId = strong.conceptId;
  });

  it("identifica lacuna crítica, lacuna moderada e ponto forte corretamente", async () => {
    const recommendation = await getStudyRecommendation(student());

    expect(recommendation.criticalGaps.map((g) => g.conceptId)).toContain(criticalConceptId);
    expect(recommendation.strengths.map((g) => g.conceptId)).toContain(strongConceptId);

    const critical = recommendation.criticalGaps.find((g) => g.conceptId === criticalConceptId)!;
    expect(critical.percentage).toBe(0);
    expect(critical.reason).toContain("questão");
    expect(critical.reviewItemId).not.toBeNull(); // erro no simulado já alimentou o Módulo 5

    const strong = recommendation.strengths.find((g) => g.conceptId === strongConceptId)!;
    expect(strong.percentage).toBe(100);
  });

  it("getStudyRecommendation: sem dados (aluno sem histórico) devolve listas vazias, sem erro", async () => {
    const recommendation = await getStudyRecommendation(other());
    expect(recommendation.criticalGaps).toEqual([]);
    expect(recommendation.moderateGaps).toEqual([]);
    expect(recommendation.strengths).toEqual([]);
  });

  it("getNextSimulationRecommendation aponta para a disciplina de pior desempenho, com motivo explicável", async () => {
    const next = await getNextSimulationRecommendation(student());
    expect(next.primaryDisciplineId).not.toBeNull();
    expect(next.reason.length).toBeGreaterThan(0);
    expect(next.count).toBeGreaterThan(0);
  });

  it("getNextSimulationRecommendation: dados insuficientes devolve recomendação neutra, sem erro", async () => {
    const next = await getNextSimulationRecommendation(other());
    expect(next.primaryDisciplineId).toBeNull();
    expect(next.reason.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    const dynamicReviewItems = await prisma.reviewItem.findMany({
      where: { userId: { in: [studentId, otherStudentId] } },
      select: { id: true },
    });
    await cleanupFixtures({
      simulationIds,
      reviewItemIds: dynamicReviewItems.map((r) => r.id),
      questionIds,
      conceptIds,
      disciplineIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
