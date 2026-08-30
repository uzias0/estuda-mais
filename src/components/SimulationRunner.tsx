"use client";

/**
 * Execução de simulado (Módulo 11, seção 21) — diferente de lição/revisão/
 * diagnóstico: NÃO mostra feedback por questão ("não mostrar resultado
 * antes da finalização"), só avança. Client Component só pela navegação
 * entre questões já carregadas; a correção real (Módulo 3) acontece a cada
 * resposta, mas o resultado só é revelado ao finalizar.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import {
  submitSimulationAnswerAction,
  finishSimulationAction,
} from "@/server/actions/simulation-actions";
import { QuestionRenderer, type PublicQuestionViewLike } from "./QuestionRenderer";
import { ProgressBar } from "./ProgressBar";
import { ErrorState } from "./ErrorState";
import { now } from "@/lib/time";

export function SimulationRunner({
  attemptId,
  simulationId,
  questions,
}: {
  attemptId: string;
  simulationId: string;
  questions: PublicQuestionViewLike[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [startedAt, setStartedAt] = useState(now());

  async function handleAnswer(answerData: AttemptAnswerData) {
    setBusy(true);
    try {
      await submitSimulationAnswerAction({
        attemptId,
        questionId: questions[index].id,
        answerData,
        timeSpentMs: now() - startedAt,
      });
      if (index + 1 < questions.length) {
        setIndex(index + 1);
        setStartedAt(now());
        setBusy(false);
      } else {
        await finishSimulationAction(attemptId);
        router.push(`/dashboard/simulados/${simulationId}/resultado?attemptId=${attemptId}`);
      }
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  if (error) {
    return <ErrorState message="Não foi possível continuar o simulado." />;
  }

  return (
    <div className="stack">
      <ProgressBar
        value={(index / questions.length) * 100}
        label={`Questão ${index + 1}/${questions.length}`}
      />
      {busy ? (
        <div className="card" role="status">
          <p>Enviando resposta…</p>
        </div>
      ) : (
        <QuestionRenderer question={questions[index]} onSubmit={handleAnswer} />
      )}
    </div>
  );
}
