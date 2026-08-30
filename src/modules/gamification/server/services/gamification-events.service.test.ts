/**
 * Testes de integração reais dos pontos de entrada de gamificação (Módulo
 * 9, seções 4/5/8/31/34/40/41) — exercitam o fluxo completo a partir das
 * ações REAIS dos módulos de origem (Módulo 8 lição, Módulo 5 revisão,
 * Módulo 6 simulado, Módulo 3 diagnóstico), nunca um atalho que finja o
 * resultado.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { GamificationValidationError } from "./errors";
import {
  processLessonCompletionEvent,
  processReviewSessionCompletionEvent,
  processSimulationCompletionEvent,
  processDiagnosticCompletionEvent,
} from "./gamification-events.service";
import { getTotalXp } from "./xp.service";
import {
  startLesson,
  submitLessonActivity,
  completeLesson,
} from "@/modules/pedagogy/server/services/lesson-execution.service";
import {
  startReviewSession,
  submitReviewAnswer,
  finishReviewSession,
} from "@/modules/review/server/services/reviewSession.service";
import {
  startSimulation,
  submitSimulationAnswer,
  finishSimulation,
} from "@/modules/simulation/server/services/simulation-attempt.service";
import {
  createSimulationFromQuestionIds,
  publishSimulation,
} from "@/modules/simulation/server/services/simulation.service";
import {
  startDiagnostic,
  submitDiagnosticAnswer,
  finishDiagnostic,
} from "@/modules/assessment/server/services/diagnostic.service";
import { publishQuestion } from "@/modules/assessment/server/services/question.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureQuestionKnowledgeTag,
  createFixturePublishedLesson,
  createFixtureReviewItem,
  cleanupFixtures,
} from "@/test/fixtures";

/**
 * Monta um `answerData` válido para QUALQUER um dos 8 `QuestionType`
 * suportados — necessário porque `startDiagnostic` seleciona do pool GLOBAL
 * de questões publicadas e tagueadas, que agora inclui conteúdo acadêmico
 * real de tipos variados (fase de expansão — `scripts/seed-academic-content-v2.ts`),
 * não só a fixture MULTIPLE_CHOICE criada neste teste. A correção da
 * resposta em si não importa para este teste (só concede XP por completar o
 * diagnóstico), só a FORMA precisa ser válida para o tipo real sorteado.
 */
async function anyValidAnswerDataFor(questionId: string): Promise<Record<string, unknown>> {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: { options: true },
  });
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
    case "CASE_STUDY":
      return { type: question.type, selectedOptionId: question.options[0].id };
    case "MULTI_SELECT":
      return { type: "MULTI_SELECT", selectedOptionIds: [question.options[0].id] };
    case "ORDERING":
      return {
        type: "ORDERING",
        orderedOptionIds: [...question.options].sort((a, b) => a.order - b.order).map((o) => o.id),
      };
    case "MATCHING": {
      const answerKey = question.answerKey as { pairs: Array<{ left: string; right: string }> };
      return { type: "MATCHING", pairs: answerKey.pairs };
    }
    case "FILL_BLANK": {
      const answerKey = question.answerKey as { blanks: Array<{ accepted: string[] }> };
      return { type: "FILL_BLANK", answers: answerKey.blanks.map((b) => b.accepted[0]) };
    }
    case "SHORT_ANSWER": {
      const answerKey = question.answerKey as { accepted: string[] };
      return { type: "SHORT_ANSWER", text: answerKey.accepted[0] };
    }
    default:
      throw new Error(`Tipo de questão não suportado no teste: "${question.type}".`);
  }
}

describe("Gamification events service", () => {
  let studentId: string;
  let otherStudentId: string;
  let adminUserId: string;
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const lessonIds: string[] = [];
  const citationIds: string[] = [];
  const reviewItemIds: string[] = [];
  const studySessionIds: string[] = [];
  const questionAttemptIds: string[] = [];
  const simulationIds: string[] = [];
  const simulationAttemptIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });
  const admin = () => ({ userId: adminUserId, role: Role.ADMIN });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("evt-student", Role.STUDENT);
    const otherUser = await createFixtureUser("evt-other", Role.STUDENT);
    const adminUser = await createFixtureUser("evt-admin", Role.ADMIN);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    adminUserId = adminUser.id;
    userIds.push(studentId, otherStudentId, adminUserId);
  });

  describe("processLessonCompletionEvent", () => {
    it("concede XP de conclusão + XP por questão correta, atualiza streak/meta/conquistas, e é idempotente", async () => {
      const source = await createFixtureSource("evt-lesson");
      sourceIds.push(source.id);
      const question = await createFixtureMultipleChoiceQuestion("evt-lesson", source.id, {
        correctIndex: 0,
      });
      questionIds.push(question.id);
      const correctOptionId = question.options.find((o) => o.isCorrect)!.id;

      const {
        lesson,
        source: lessonSource,
        citation,
        blocks,
      } = await createFixturePublishedLesson("evt-lesson", {
        blocks: [{ type: "QUESTION", questionId: question.id }],
      });
      lessonIds.push(lesson.id);
      sourceIds.push(lessonSource.id);
      citationIds.push(citation.id);

      await startLesson(student(), lesson.id);
      await submitLessonActivity(student(), {
        lessonId: lesson.id,
        blockId: blocks[0].id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 500,
      });
      const completed = await completeLesson(student(), lesson.id);

      const before = await getTotalXp(student(), studentId);
      const result = await processLessonCompletionEvent(student(), completed.lessonProgressId!);
      expect(result.xpGrantedNow).toBe(50 + 10); // LESSON_COMPLETED + LESSON_QUESTION_CORRECT
      const after = await getTotalXp(student(), studentId);
      // >= 60 XP de atividade + o bônus de meta diária (25) que esses 60
      // cruzam (meta padrão = 20 XP/dia). Não é uma igualdade exata: outras
      // suítes deste módulo rodam em paralelo contra o MESMO catálogo global
      // de `Achievement` (ver `achievement.service.test.ts`) e podem, por
      // coincidência de critério (ex.: "LESSONS_COMPLETED >= 1"), desbloquear
      // uma conquista de fixture concorrente para este usuário também — o
      // que é o comportamento CORRETO do sistema (o catálogo é global por
      // design), não um bug; só torna a igualdade exata frágil sob execução
      // paralela.
      expect(after - before).toBeGreaterThanOrEqual(60 + 25);
      expect(result.streak.currentStreak).toBeGreaterThanOrEqual(1);
      expect(result.dailyGoal.completed).toBe(true);

      // idempotência: reprocessar o MESMO evento não concede XP de novo
      // pela atividade em si (achievements globais concorrentes, ver nota
      // acima, poderiam em tese somar algo a mais entre as duas chamadas —
      // por isso `afterAgain >= after`, não `===`).
      const again = await processLessonCompletionEvent(student(), completed.lessonProgressId!);
      expect(again.xpGrantedNow).toBe(0);
      const afterAgain = await getTotalXp(student(), studentId);
      expect(afterAgain).toBeGreaterThanOrEqual(after);
    });

    it("rejeita lição ainda não concluída", async () => {
      const { lesson, source, citation } = await createFixturePublishedLesson(
        "evt-lesson-pending",
        {
          blocks: [
            { type: "INTRO", content: "a" },
            { type: "CONCEPT", content: "b" },
          ],
        },
      );
      lessonIds.push(lesson.id);
      sourceIds.push(source.id);
      citationIds.push(citation.id);

      const progress = await startLesson(student(), lesson.id);
      await expect(
        processLessonCompletionEvent(student(), progress.lessonProgressId!),
      ).rejects.toThrow(GamificationValidationError);
    });

    it("rejeita LessonProgress inexistente e acesso de outro usuário sem ser ADMIN", async () => {
      await expect(processLessonCompletionEvent(student(), "lp-inexistente")).rejects.toThrow();

      const { lesson, source, citation, blocks } =
        await createFixturePublishedLesson("evt-lesson-security");
      lessonIds.push(lesson.id);
      sourceIds.push(source.id);
      citationIds.push(citation.id);
      await startLesson(student(), lesson.id);
      await submitLessonActivity(student(), { lessonId: lesson.id, blockId: blocks[0].id });
      const completed = await completeLesson(student(), lesson.id);

      await expect(
        processLessonCompletionEvent(other(), completed.lessonProgressId!),
      ).rejects.toThrow(AuthorizationError);
      // ADMIN pode processar em nome do estudante.
      await expect(
        processLessonCompletionEvent(admin(), completed.lessonProgressId!),
      ).resolves.toBeDefined();
    });
  });

  describe("processReviewSessionCompletionEvent", () => {
    it("concede XP de conclusão + XP por questão correta, e é idempotente", async () => {
      const source = await createFixtureSource("evt-review");
      sourceIds.push(source.id);
      const concept = await createFixtureConcept("evt-review");
      conceptIds.push(concept.id);
      const question = await createFixtureMultipleChoiceQuestion("evt-review", source.id, {
        correctIndex: 0,
      });
      questionIds.push(question.id);
      await createFixtureQuestionKnowledgeTag(question.id, "CONCEPT", concept.id);
      await publishQuestion(admin(), question.id);
      const correctOptionId = question.options.find((o) => o.isCorrect)!.id;

      const reviewItem = await createFixtureReviewItem(studentId, {
        scope: "CONCEPT",
        conceptId: concept.id,
        opts: { dueAt: new Date(), state: "REVIEW" },
      });
      reviewItemIds.push(reviewItem.id);

      const { sessionId, items } = await startReviewSession(student(), {});
      studySessionIds.push(sessionId);
      const item = items.find((i) => i.reviewItemId === reviewItem.id);
      expect(item).toBeDefined();

      const submitted = await submitReviewAnswer(student(), {
        sessionId,
        reviewItemId: reviewItem.id,
        questionId: item!.question.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 300,
      });
      expect(submitted.isCorrect).toBe(true);

      await finishReviewSession(student(), sessionId);

      const before = await getTotalXp(student(), studentId);
      const result = await processReviewSessionCompletionEvent(student(), sessionId);
      expect(result.xpGrantedNow).toBe(20 + 5); // REVIEW_SESSION_COMPLETED + REVIEW_QUESTION_CORRECT
      const after = await getTotalXp(student(), studentId);
      // >= (não ===): ver nota sobre catálogo global de Achievement no teste de lição, acima.
      expect(after - before).toBeGreaterThanOrEqual(25);

      const again = await processReviewSessionCompletionEvent(student(), sessionId);
      expect(again.xpGrantedNow).toBe(0);
    });

    it("rejeita sessão de revisão ainda não finalizada", async () => {
      const { sessionId } = await startReviewSession(student(), {});
      studySessionIds.push(sessionId);
      await expect(processReviewSessionCompletionEvent(student(), sessionId)).rejects.toThrow(
        GamificationValidationError,
      );
    });
  });

  describe("processSimulationCompletionEvent", () => {
    it("concede o XP de conclusão de simulado, e é idempotente", async () => {
      const source = await createFixtureSource("evt-sim");
      sourceIds.push(source.id);
      const question = await createFixtureMultipleChoiceQuestion("evt-sim", source.id, {
        correctIndex: 0,
      });
      questionIds.push(question.id);
      await publishQuestion(admin(), question.id);
      const correctOptionId = question.options.find((o) => o.isCorrect)!.id;

      const simulation = await createSimulationFromQuestionIds(admin(), {
        title: "TEST_FIXTURE_evt_simulation",
        questionIds: [question.id],
      });
      simulationIds.push(simulation.id);
      await publishSimulation(admin(), simulation.id);

      const { attemptId } = await startSimulation(student(), simulation.id);
      simulationAttemptIds.push(attemptId);
      await submitSimulationAnswer(student(), {
        attemptId,
        questionId: question.id,
        answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId },
        timeSpentMs: 400,
      });
      await finishSimulation(student(), attemptId);

      const before = await getTotalXp(student(), studentId);
      const result = await processSimulationCompletionEvent(student(), attemptId);
      expect(result.xpGrantedNow).toBe(100);
      const after = await getTotalXp(student(), studentId);
      // >= (não ===): ver nota sobre catálogo global de Achievement no teste de lição, acima.
      expect(after - before).toBeGreaterThanOrEqual(100);

      const again = await processSimulationCompletionEvent(student(), attemptId);
      expect(again.xpGrantedNow).toBe(0);
    });

    it("rejeita simulado ainda não finalizado", async () => {
      const source = await createFixtureSource("evt-sim-pending");
      sourceIds.push(source.id);
      const question = await createFixtureMultipleChoiceQuestion("evt-sim-pending", source.id);
      questionIds.push(question.id);
      await publishQuestion(admin(), question.id);
      const simulation = await createSimulationFromQuestionIds(admin(), {
        title: "TEST_FIXTURE_evt_simulation_pending",
        questionIds: [question.id],
      });
      simulationIds.push(simulation.id);
      await publishSimulation(admin(), simulation.id);
      const { attemptId } = await startSimulation(student(), simulation.id);
      simulationAttemptIds.push(attemptId);

      await expect(processSimulationCompletionEvent(student(), attemptId)).rejects.toThrow(
        GamificationValidationError,
      );
    });
  });

  describe("processDiagnosticCompletionEvent", () => {
    it("concede o XP de conclusão de diagnóstico, e é idempotente", async () => {
      const source = await createFixtureSource("evt-diag");
      sourceIds.push(source.id);
      const concept = await createFixtureConcept("evt-diag");
      conceptIds.push(concept.id);
      const question = await createFixtureMultipleChoiceQuestion("evt-diag", source.id, {
        correctIndex: 0,
      });
      questionIds.push(question.id);
      await createFixtureQuestionKnowledgeTag(question.id, "CONCEPT", concept.id);
      await publishQuestion(admin(), question.id);
      const correctOptionId = question.options.find((o) => o.isCorrect)!.id;

      const { sessionId, questions } = await startDiagnostic(student(), 1);
      studySessionIds.push(sessionId);
      // O diagnóstico monta a partir do banco publicado inteiro — a questão
      // desta fixture pode ou não ter sido sorteada; para garantir o
      // resultado determinístico do teste, responde-se pelo menos a questão
      // sorteada real (não precisa ser exatamente a criada acima). A questão
      // sorteada pode ser de QUALQUER um dos 8 QuestionType reais hoje
      // publicados no banco (fase de expansão de conteúdo — ver
      // `scripts/seed-academic-content-v2.ts`), não só MULTIPLE_CHOICE.
      expect(questions.length).toBeGreaterThan(0);

      const answerData =
        questions[0].id === question.id
          ? { type: "MULTIPLE_CHOICE", selectedOptionId: correctOptionId }
          : await anyValidAnswerDataFor(questions[0].id);

      const attempt = await submitDiagnosticAnswer(student(), {
        sessionId,
        questionId: questions[0].id,
        answerData: answerData as never,
        timeSpentMs: 200,
      });
      questionAttemptIds.push(attempt.attempt.id);
      await finishDiagnostic(student(), sessionId);

      const before = await getTotalXp(student(), studentId);
      const result = await processDiagnosticCompletionEvent(student(), sessionId);
      expect(result.xpGrantedNow).toBe(75);
      const after = await getTotalXp(student(), studentId);
      // >= (não ===): ver nota sobre catálogo global de Achievement no teste de lição, acima.
      expect(after - before).toBeGreaterThanOrEqual(75);

      const again = await processDiagnosticCompletionEvent(student(), sessionId);
      expect(again.xpGrantedNow).toBe(0);
    });

    it("rejeita sessão que não é de diagnóstico (nenhuma tentativa em contexto DIAGNOSTIC)", async () => {
      const { sessionId } = await startReviewSession(student(), {});
      studySessionIds.push(sessionId);
      await finishReviewSession(student(), sessionId);

      await expect(processDiagnosticCompletionEvent(student(), sessionId)).rejects.toThrow(
        GamificationValidationError,
      );
    });
  });

  afterAll(async () => {
    await cleanupFixtures({
      simulationAttemptIds,
      simulationIds,
      questionAttemptIds,
      studySessionIds,
      reviewItemIds,
      citationIds,
      lessonIds,
      questionIds,
      conceptIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
