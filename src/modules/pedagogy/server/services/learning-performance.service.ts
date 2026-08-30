/**
 * Evolução do estudante (Módulo 8, seção 32) — só agrega dados que já
 * existem: `LessonProgress` (deste módulo) e `computePerformance` (Módulo
 * 3, sobre `QuestionAttempt`). Não inventra métrica sem dado real por trás
 * (seção 32: "não inventar métricas que não possuam dados") — por isso não
 * há "tempo total de estudo" aqui (nenhum modelo mede duração de forma
 * confiável neste módulo) nem XP/streak (fora de escopo, reservado à
 * gamificação futura).
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { LessonProgressStatus } from "@/generated/prisma/enums";
import { computePerformance } from "@/modules/assessment/server/services/performance.service";
import { STRONG_CONCEPT_THRESHOLD, WEAK_CONCEPT_THRESHOLD } from "@/config/diagnostic";
import { assertOwnLearningDataOrAdmin } from "./learning-privacy";

export interface StudentLearningOverview {
  lessonsStarted: number;
  lessonsCompleted: number;
  lessonsMastered: number;
  questionsAnswered: number;
  correctCount: number;
  accuracyPercentage: number;
  /** Conceitos com >= `STRONG_CONCEPT_THRESHOLD`% de acerto entre as tentativas já respondidas. */
  strongConceptIds: string[];
  /** Conceitos com <= `WEAK_CONCEPT_THRESHOLD`% de acerto — mesmas faixas do diagnóstico (Módulo 3), não uma segunda escala inventada. */
  weakConceptIds: string[];
}

export async function getStudentLearningOverview(
  actor: Actor,
  targetUserId: string = actor.userId,
): Promise<StudentLearningOverview> {
  assertOwnLearningDataOrAdmin(actor, targetUserId);

  const [lessonProgresses, performance] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { userId: targetUserId } }),
    computePerformance(targetUserId),
  ]);

  const lessonsStarted = lessonProgresses.length;
  const lessonsCompleted = lessonProgresses.filter(
    (p) =>
      p.status === LessonProgressStatus.COMPLETED || p.status === LessonProgressStatus.MASTERED,
  ).length;
  const lessonsMastered = lessonProgresses.filter(
    (p) => p.status === LessonProgressStatus.MASTERED,
  ).length;

  const strongConceptIds: string[] = [];
  const weakConceptIds: string[] = [];
  for (const [conceptId, summary] of Object.entries(performance.byConcept)) {
    if (summary.accuracyPercentage >= STRONG_CONCEPT_THRESHOLD) strongConceptIds.push(conceptId);
    else if (summary.accuracyPercentage <= WEAK_CONCEPT_THRESHOLD) weakConceptIds.push(conceptId);
  }

  return {
    lessonsStarted,
    lessonsCompleted,
    lessonsMastered,
    questionsAnswered: performance.totalAnswered,
    correctCount: performance.correctCount,
    accuracyPercentage: performance.accuracyPercentage,
    strongConceptIds,
    weakConceptIds,
  };
}
