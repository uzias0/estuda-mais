"use client";

/**
 * Fluxo do diagnóstico inicial (Módulo 11, seção 9): Introdução → Questão →
 * Resposta → Próxima questão → Resultado. Client Component: precisa de
 * estado local para navegar entre as questões já carregadas; toda
 * correção/cálculo acontece nas Server Actions (`diagnostic-actions.ts`),
 * que só delegam ao Módulo 3 — nada é recalculado aqui.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import {
  startDiagnosticAction,
  submitDiagnosticAnswerAction,
  finishDiagnosticAction,
} from "@/server/actions/diagnostic-actions";
import { QuestionRenderer, type PublicQuestionViewLike } from "./QuestionRenderer";
import { QuestionFeedback } from "./QuestionFeedback";
import { ProgressBar } from "./ProgressBar";
import { ErrorState } from "./ErrorState";
import { CharacterMessage } from "./characters/CharacterMessage";
import { answerReaction, NEUTRAL_CHARACTER } from "./characters/reactions";
import { now } from "@/lib/time";

type Phase = "intro" | "loading" | "question" | "feedback" | "error";

export function DiagnosticRunner() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PublicQuestionViewLike[]>([]);
  const [index, setIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(0);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanation: string | null;
  } | null>(null);

  async function handleStart() {
    setPhase("loading");
    try {
      const result = await startDiagnosticAction();
      setSessionId(result.sessionId);
      setQuestions(result.questions);
      setIndex(0);
      setQuestionStartedAt(now());
      setPhase(result.questions.length > 0 ? "question" : "error");
    } catch {
      setPhase("error");
    }
  }

  async function handleAnswer(answerData: AttemptAnswerData) {
    if (!sessionId) return;
    const question = questions[index];
    setPhase("loading");
    try {
      const result = await submitDiagnosticAnswerAction({
        sessionId,
        questionId: question.id,
        answerData,
        timeSpentMs: now() - questionStartedAt,
      });
      setFeedback({ isCorrect: result.isCorrect, explanation: result.explanation });
      setPhase("feedback");
    } catch {
      setPhase("error");
    }
  }

  async function handleNext() {
    if (!sessionId) return;
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setQuestionStartedAt(now());
      setFeedback(null);
      setPhase("question");
      return;
    }
    setPhase("loading");
    try {
      await finishDiagnosticAction(sessionId);
      router.push(`/dashboard/diagnostico/resultado?sessionId=${sessionId}`);
    } catch {
      setPhase("error");
    }
  }

  if (phase === "error") {
    return <ErrorState message="Não foi possível continuar o diagnóstico." onRetry={handleStart} />;
  }

  if (phase === "intro") {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ fontSize: "1.4rem", fontWeight: 800 }}>Bem-vindo à sua jornada de estudos!</p>
        <p
          style={{
            color: "var(--color-text-muted)",
            marginTop: 12,
            maxWidth: 480,
            marginInline: "auto",
          }}
        >
          Antes de começar, vamos descobrir qual é o seu nível atual. Você responderá uma mini
          avaliação e receberá um ponto de partida personalizado.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 20, minWidth: 220 }}
          onClick={handleStart}
        >
          Começar diagnóstico
        </button>
      </div>
    );
  }

  if (phase === "loading" || questions.length === 0) {
    return (
      <div className="card" role="status" aria-live="polite">
        <p>Carregando…</p>
      </div>
    );
  }

  const question = questions[index];

  return (
    <div className="stack">
      <ProgressBar
        value={((phase === "feedback" ? index + 1 : index) / questions.length) * 100}
        label={`Questão ${index + 1} de ${questions.length}`}
      />
      {phase === "feedback" && feedback ? (
        <>
          {(() => {
            const reaction = answerReaction(feedback.isCorrect);
            return (
              <CharacterMessage
                character={NEUTRAL_CHARACTER}
                expression={reaction.expression}
                message={reaction.message}
              />
            );
          })()}
          <QuestionFeedback isCorrect={feedback.isCorrect} explanation={feedback.explanation} />
          <button type="button" className="btn btn-primary" onClick={handleNext}>
            {index + 1 < questions.length ? "Próxima questão" : "Ver resultado"}
          </button>
        </>
      ) : (
        <QuestionRenderer question={question} onSubmit={handleAnswer} />
      )}
    </div>
  );
}
