/**
 * Teste de integração real das Server Actions de lição (Módulo 11, seções
 * 15-17/49) — confirma que a camada fina de UI não abre uma segunda porta
 * para fraude: mesmo chamando as Server Actions diretamente (o mesmo
 * caminho que o `LessonRunner` usa), a correção e o XP continuam vindo
 * exclusivamente do servidor (Módulos 3/8/9).
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  startLessonAction,
  submitLessonActivityAction,
  completeLessonAction,
} from "./lesson-actions";
import { getCurrentActor } from "@/server/auth/devActor";
import { loginAsUserId } from "@/test/authTestHelpers";
import { getTotalXp } from "@/modules/gamification/server/services/xp.service";
import {
  createFixtureSource,
  createFixtureMultipleChoiceQuestion,
  createFixturePublishedLesson,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Lesson Server Actions", () => {
  const sourceIds: string[] = [];
  const questionIds: string[] = [];
  const lessonIds: string[] = [];
  const citationIds: string[] = [];

  it("executa a lição de ponta a ponta e corrige de verdade, mesmo com uma resposta forjada como certa", async () => {
    const source = await createFixtureSource("action-lesson");
    sourceIds.push(source.id);
    const question = await createFixtureMultipleChoiceQuestion("action-lesson", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);
    const wrongOptionId = question.options.find((o) => !o.isCorrect)!.id;

    const {
      lesson,
      source: lessonSource,
      citation,
      blocks,
    } = await createFixturePublishedLesson("action-lesson", {
      blocks: [{ type: "QUESTION", questionId: question.id }],
    });
    lessonIds.push(lesson.id);
    sourceIds.push(lessonSource.id);
    citationIds.push(citation.id);

    const actor = await getCurrentActor();
    await loginAsUserId(actor.userId); // Server Action agora exige sessão real (etapa de consolidação)
    const before = await getTotalXp(actor, actor.userId);

    await startLessonAction(lesson.id);

    // resposta ERRADA, mas o payload da Action não tem NENHUM campo para
    // forjar "isCorrect"/"score" — só `answerData` (a escolha em si).
    const submitted = await submitLessonActivityAction({
      lessonId: lesson.id,
      blockId: blocks[0].id,
      answerData: { type: "MULTIPLE_CHOICE", selectedOptionId: wrongOptionId },
      timeSpentMs: 100,
    });
    expect(submitted.isCorrect).toBe(false); // corrigido de verdade, mesmo sem "forjar" nada.

    const completion = await completeLessonAction(lesson.id);
    expect(completion.completed.status).toBe("COMPLETED"); // não MASTERED — aproveitamento 0%.
    expect(completion.gamification?.xpGrantedNow).toBe(50); // só o XP de conclusão, nunca o de questão correta.

    const after = await getTotalXp(actor, actor.userId);
    expect(after - before).toBeGreaterThanOrEqual(50);
  });

  afterAll(async () => {
    await cleanupFixtures({ citationIds, lessonIds, questionIds, sourceIds });
    await prisma.$disconnect();
  });
});
