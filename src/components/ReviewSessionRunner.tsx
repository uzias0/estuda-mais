"use client";

/**
 * Sessão de revisão (Módulo 11, seção 19) — mesmo padrão do
 * `DiagnosticRunner`: estado local só para navegar pelos itens já
 * carregados; toda correção/SM-2/gamificação acontece nas Server Actions
 * (Módulos 5/9), nunca aqui (seção 19: "não duplicar SM-2").
 */
import { useState } from "react";
import Link from "next/link";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import {
  startReviewSessionAction,
  submitReviewAnswerAction,
  finishReviewSessionAction,
} from "@/server/actions/review-actions";
import { QuestionRenderer, type PublicQuestionViewLike } from "./QuestionRenderer";
import { QuestionFeedback } from "./QuestionFeedback";
import { ProgressBar } from "./ProgressBar";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { CharacterMessage } from "./characters/CharacterMessage";
import { CharacterCelebration } from "./characters/CharacterCelebration";
import { answerReaction, NEUTRAL_CHARACTER } from "./characters/reactions";
import { formatPercentage } from "@/lib/format";
import { now } from "@/lib/time";

interface ReviewItemData {
  reviewItemId: string;
  question: PublicQuestionViewLike;
}

type Phase = "intro" | "loading" | "empty" | "question" | "feedback" | "summary" | "error";

export function ReviewSessionRunner() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItemData[]>([]);
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanation: string | null;
  } | null>(null);
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof finishReviewSessionAction>
  > | null>(null);

  async function handleStart() {
    setPhase("loading");
    try {
      const result = await startReviewSessionAction();
      if (result.items.length === 0) {
        setPhase("empty");
        return;
      }
      setSessionId(result.sessionId);
      setItems(
        result.items.map((item) => ({ reviewItemId: item.reviewItemId, question: item.question })),
      );
      setIndex(0);
      setStartedAt(now());
      setPhase("question");
    } catch {
      setPhase("error");
    }
  }

  async function handleAnswer(answerData: AttemptAnswerData) {
    if (!sessionId) return;
    const item = items[index];
    setPhase("loading");
    try {
      const result = await submitReviewAnswerAction({
        sessionId,
        reviewItemId: item.reviewItemId,
        questionId: item.question.id,
        answerData,
        timeSpentMs: now() - startedAt,
      });
      setFeedback({ isCorrect: result.isCorrect, explanation: result.explanation });
      setPhase("feedback");
    } catch {
      setPhase("error");
    }
  }

  async function handleNext() {
    if (!sessionId) return;
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setStartedAt(now());
      setFeedback(null);
      setPhase("question");
      return;
    }
    setPhase("loading");
    try {
      const finished = await finishReviewSessionAction(sessionId);
      setSummary(finished);
      setPhase("summary");
    } catch {
      setPhase("error");
    }
  }

  if (phase === "error") {
    return (
      <ErrorState message="Não foi possível continuar a sessão de revisão." onRetry={handleStart} />
    );
  }

  if (phase === "empty") {
    return (
      <EmptyState
        title="Nenhum item pronto para revisão agora."
        description="Volte mais tarde ou continue estudando para gerar novos itens de revisão."
      />
    );
  }

  if (phase === "intro") {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>Pronto para revisar?</p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={handleStart}
        >
          Iniciar revisão
        </button>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="card" role="status">
        <p>Carregando…</p>
      </div>
    );
  }

  if (phase === "summary" && summary) {
    return (
      <div className="stack">
        <CharacterCelebration
          character={NEUTRAL_CHARACTER}
          title="Revisão concluída!"
          subtitle={`${summary.summary.correctCount} / ${summary.summary.itemsReviewed} — ${formatPercentage(summary.summary.accuracyPercentage)}`}
        />
        {summary.gamification.xpGrantedNow > 0 ? (
          <p
            className="xp-gain-pop"
            style={{ fontWeight: 800, color: "var(--color-xp)", textAlign: "center" }}
          >
            +{summary.gamification.xpGrantedNow} XP
          </p>
        ) : null}
        <Link
          href="/dashboard/revisao"
          className="btn btn-primary"
          style={{ alignSelf: "center", marginTop: 4 }}
        >
          Voltar para revisão
        </Link>
      </div>
    );
  }

  const item = items[index];
  return (
    <div className="stack">
      <ProgressBar
        value={((phase === "feedback" ? index + 1 : index) / items.length) * 100}
        label={`Item ${index + 1} de ${items.length}`}
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
            {index + 1 < items.length ? "Próximo item" : "Ver resumo"}
          </button>
        </>
      ) : (
        <QuestionRenderer question={item.question} onSubmit={handleAnswer} />
      )}
    </div>
  );
}
