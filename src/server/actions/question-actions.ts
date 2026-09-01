"use server";

/**
 * Server Action de resposta avulsa a uma questão (fase de correção de
 * bugs — achado real do usuário: a tela "Questões" listava questões sem
 * NENHUMA forma de respondê-las). Camada fina sobre `recordAttempt`
 * (Módulo 3) — nenhuma lógica de correção nova, mesma autoridade de
 * sempre (`gradeAnswer`). `AttemptContext.PRACTICE` identifica esta
 * tentativa como avulsa (fora de lição/revisão/simulado/diagnóstico), sem
 * precisar de nenhum `sessionId`.
 */
import { requireSessionActor } from "@/server/auth/session";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import { recordAttempt } from "@/modules/assessment/server/services/questionAttempt.service";
import { AttemptContext } from "@/generated/prisma/enums";

export async function submitPracticeAnswerAction(input: {
  questionId: string;
  answerData: AttemptAnswerData;
  timeSpentMs: number;
}) {
  const actor = await requireSessionActor();
  const result = await recordAttempt(actor, {
    questionId: input.questionId,
    answerData: input.answerData,
    timeSpentMs: input.timeSpentMs,
    context: AttemptContext.PRACTICE,
  });
  return { isCorrect: result.isCorrect, explanation: result.explanation };
}
