"use client";

/**
 * Cartão de questão RESPONDÍVEL (fase de correção de bugs — achado real
 * do usuário: "não tem como responder às questões" na tela Questões, que
 * antes só mostrava tipo/dificuldade/enunciado, sem nenhuma interação).
 * Mesmo padrão de `LessonRunner`: nenhuma correção acontece aqui, só
 * delega para `submitPracticeAnswerAction` (que delega para
 * `recordAttempt`, Módulo 3) e mostra o resultado que o servidor devolve.
 * `QuestionRenderer` já cuida de badges/enunciado/campo de resposta — este
 * componente só adiciona o selo de ano de prova (quando existir) e troca
 * para `QuestionFeedback` depois de responder.
 */
import { useState } from "react";
import { QuestionRenderer, type PublicQuestionViewLike } from "./QuestionRenderer";
import { QuestionFeedback } from "./QuestionFeedback";
import { Badge } from "./Badge";
import { now } from "@/lib/time";
import { submitPracticeAnswerAction } from "@/server/actions/question-actions";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";

export function PracticeQuestionCard({
  question,
  examYear,
}: {
  question: PublicQuestionViewLike;
  examYear?: number | null;
}) {
  const [startedAt] = useState<number>(() => now());
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanation: string | null;
  } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(answerData: AttemptAnswerData) {
    setPending(true);
    try {
      const result = await submitPracticeAnswerAction({
        questionId: question.id,
        answerData,
        timeSpentMs: now() - startedAt,
      });
      setFeedback(result);
    } finally {
      setPending(false);
    }
  }

  if (feedback) {
    return (
      <div className="card stack">
        {examYear ? (
          <Badge tone="warning" style={{ alignSelf: "flex-start" }}>
            {examYear}
          </Badge>
        ) : null}
        <p style={{ fontSize: "1.05rem", fontWeight: 600 }}>{question.prompt}</p>
        <QuestionFeedback isCorrect={feedback.isCorrect} explanation={feedback.explanation} />
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {examYear ? (
        <Badge tone="warning" style={{ position: "absolute", top: 20, right: 20, zIndex: 1 }}>
          {examYear}
        </Badge>
      ) : null}
      <QuestionRenderer question={question} onSubmit={handleSubmit} disabled={pending} />
    </div>
  );
}
