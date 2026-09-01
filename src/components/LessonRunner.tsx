"use client";

/**
 * Fluxo de execução de lição (Módulo 11, seções 15-17): Título → Bloco de
 * conteúdo → Atividade → Feedback → Próximo bloco → Conclusão. Client
 * Component: precisa de estado local para navegar entre blocos já
 * carregados; toda mutação passa pelas Server Actions
 * (`lesson-actions.ts`), que só delegam ao Módulo 8/9/10 — nenhum
 * progresso/XP é calculado aqui (seção 16/17: "o percentual/XP deve vir do
 * servidor").
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import {
  startLessonAction,
  submitLessonActivityAction,
  completeLessonAction,
  refillHeartsWithGemsAction,
} from "@/server/actions/lesson-actions";
import type { HeartsState } from "@/modules/gamification/server/services/hearts.service";
import { GEM_COST_PER_HEART } from "@/config/hearts";
import { QuestionRenderer, type PublicQuestionViewLike } from "./QuestionRenderer";
import { QuestionFeedback } from "./QuestionFeedback";
import { ProgressBar } from "./ProgressBar";
import { ErrorState } from "./ErrorState";
import { CharacterMessage } from "./characters/CharacterMessage";
import { CharacterCelebration } from "./characters/CharacterCelebration";
import {
  answerReaction,
  lessonStartReaction,
  LESSON_START_REACTION_FALLBACK,
  LESSON_COMPLETE_REACTION,
  NEUTRAL_CHARACTER,
  type Reaction,
} from "./characters/reactions";
import { blockTypeLabel, formatPercentage } from "@/lib/format";
import { now } from "@/lib/time";
import type { CharacterDef } from "@/config/characters";
import { XP_REWARDS } from "@/config/gamification";

export interface LessonBlockData {
  id: string;
  order: number;
  type: string;
  content: string | null;
  question: PublicQuestionViewLike | null;
}

export interface LessonSessionSnapshot {
  status: string;
  blocksTotal: number;
  blocksCompleted: number;
  percentage: number;
  currentBlock: { id: string; order: number } | null;
  accuracy: number | null;
}

type Phase =
  "not-started" | "block" | "feedback" | "completing" | "completed" | "error" | "hearts-exhausted";

export function LessonRunner({
  lessonId,
  lessonTitle,
  blocks,
  initialSession,
  initialHearts,
  initialGemBalance,
  character = NEUTRAL_CHARACTER,
}: {
  lessonId: string;
  lessonTitle: string;
  blocks: LessonBlockData[];
  initialSession: LessonSessionSnapshot;
  /** Estado de baterias no momento em que a página carregou (fase "vidas/joias"). */
  initialHearts: HeartsState;
  /** Saldo de joias no momento em que a página carregou — só para mostrar se dá para recarregar. */
  initialGemBalance: number;
  /** Personagem associado à escola/teoria do conteúdo (`resolveCharacterForLesson`,
   * `src/lib/characters.ts`) — cai no neutro quando não houver associação real. */
  character?: CharacterDef;
}) {
  const [session, setSession] = useState(initialSession);
  const [phase, setPhase] = useState<Phase>(
    initialHearts.current <= 0
      ? "hearts-exhausted"
      : initialSession.status === "NOT_STARTED" && initialSession.blocksCompleted === 0
        ? "not-started"
        : "block",
  );
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanation: string | null;
  } | null>(null);
  const [blockStartedAt, setBlockStartedAt] = useState<number>(now());
  const [completionResult, setCompletionResult] = useState<Awaited<
    ReturnType<typeof completeLessonAction>
  > | null>(null);
  const [hearts, setHearts] = useState<HeartsState>(initialHearts);
  const [gemBalance, setGemBalance] = useState(initialGemBalance);
  const [refillError, setRefillError] = useState<string | null>(null);
  const [refilling, setRefilling] = useState(false);
  // Valor inicial FIXO (nunca `Math.random()` durante o render — causaria
  // erro de hidratação, servidor e cliente sorteando mensagens diferentes
  // na mesma renderização inicial; ver comentário completo em
  // `LESSON_START_REACTION_FALLBACK`). A troca para uma saudação de
  // verdade aleatória só acontece DEPOIS de montado (`useEffect` abaixo,
  // só no cliente) — e só uma vez por montagem, não a cada re-render.
  const [greeting, setGreeting] = useState<Reaction>(LESSON_START_REACTION_FALLBACK);
  useEffect(() => {
    // Exceção deliberada à regra (setState direto em efeito, de resto
    // desencorajado): é exatamente o padrão recomendado para "sortear um
    // valor só depois de montado no cliente" sem erro de hidratação — uma
    // única atualização pontual na montagem, não um loop nem algo caro.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(lessonStartReaction());
  }, []);

  const currentBlock = session.currentBlock
    ? blocks.find((b) => b.id === session.currentBlock!.id)
    : null;

  async function handleStart() {
    setPhase("block");
    try {
      const started = await startLessonAction(lessonId);
      setSession(started);
      setBlockStartedAt(now());
    } catch {
      setPhase("error");
    }
  }

  async function handleAdvance(answerData?: AttemptAnswerData) {
    if (!currentBlock) return;
    try {
      const result = await submitLessonActivityAction({
        lessonId,
        blockId: currentBlock.id,
        answerData,
        timeSpentMs: now() - blockStartedAt,
      });
      setHearts(result.hearts);
      if (result.blocked) {
        setPhase("hearts-exhausted");
        return;
      }
      setSession(result);
      if (currentBlock.type === "QUESTION") {
        setFeedback({ isCorrect: !!result.isCorrect, explanation: result.explanation });
        setPhase("feedback");
      } else {
        setBlockStartedAt(now());
        setPhase("block");
      }
    } catch {
      setPhase("error");
    }
  }

  /** Compra 1 bateria com joia (fase "vidas/joias") — só chamada a partir da tela de "sem baterias". */
  async function handleRefillHearts() {
    setRefilling(true);
    setRefillError(null);
    try {
      const result = await refillHeartsWithGemsAction({
        count: 1,
        idempotencyKey: crypto.randomUUID(),
      });
      setHearts(result.hearts);
      setGemBalance(result.gemBalance);
      if (result.hearts.current > 0) {
        setBlockStartedAt(now());
        setPhase(
          session.status === "NOT_STARTED" && session.blocksCompleted === 0
            ? "not-started"
            : "block",
        );
      }
    } catch {
      setRefillError("Não foi possível recarregar — confira se você tem joias suficientes.");
    } finally {
      setRefilling(false);
    }
  }

  function handleContinueAfterFeedback() {
    setFeedback(null);
    setBlockStartedAt(now());
    setPhase("block");
  }

  async function handleComplete() {
    setPhase("completing");
    try {
      const result = await completeLessonAction(lessonId);
      setCompletionResult(result);
      setPhase("completed");
    } catch {
      setPhase("error");
    }
  }

  if (phase === "error") {
    return <ErrorState message="Não foi possível continuar esta lição." />;
  }

  if (phase === "hearts-exhausted") {
    const canAfford = gemBalance >= GEM_COST_PER_HEART;
    return (
      <div className="card stack" style={{ textAlign: "center" }}>
        <span style={{ fontSize: "2.5rem" }} aria-hidden="true">
          💔
        </span>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Você ficou sem baterias</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Espere a recarga automática (1 bateria a cada 30 minutos) ou use joia para continuar agora
          mesmo.
        </p>
        <p style={{ fontWeight: 700 }}>💎 Você tem {gemBalance} joia(s)</p>
        {refillError ? (
          <p role="alert" style={{ color: "var(--color-danger)" }}>
            {refillError}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canAfford || refilling}
          onClick={handleRefillHearts}
        >
          {refilling ? "Recarregando…" : `Recarregar 1 bateria (${GEM_COST_PER_HEART} 💎)`}
        </button>
        <Link href="/dashboard" className="btn btn-secondary">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (phase === "not-started") {
    return (
      <div className="stack">
        <CharacterMessage
          character={character}
          expression={greeting.expression}
          message={greeting.message}
        />
        <div className="card" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>{lessonTitle}</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: 8 }}>
            {blocks.length} bloco(s) de conteúdo.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={handleStart}
          >
            Começar lição
          </button>
        </div>
      </div>
    );
  }

  if (phase === "completing") {
    return (
      <div className="card" role="status">
        <p>Concluindo lição…</p>
      </div>
    );
  }

  if (phase === "completed" && completionResult) {
    const { completed, gamification, nextAction } = completionResult;
    return (
      <div className="stack">
        <CharacterCelebration
          character={character}
          title={LESSON_COMPLETE_REACTION.message}
          subtitle={
            completed.accuracy !== null
              ? `Aproveitamento: ${formatPercentage(completed.accuracy)}`
              : undefined
          }
        />
        {gamification && gamification.xpGrantedNow > 0 ? (
          <p
            className="xp-gain-pop"
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--color-xp)",
              textAlign: "center",
            }}
          >
            +{gamification.xpGrantedNow} XP
          </p>
        ) : null}
        {gamification && gamification.gemsGrantedNow > 0 ? (
          <p
            className="xp-gain-pop"
            style={{
              fontSize: "1.1rem",
              fontWeight: 800,
              color: "var(--color-brand)",
              textAlign: "center",
            }}
          >
            +{gamification.gemsGrantedNow} 💎
          </p>
        ) : null}
        {nextAction ? (
          <div className="card" style={{ textAlign: "center" }}>
            <p className="card-title">Próximo passo</p>
            <p style={{ marginTop: 6 }}>{nextAction.reason}</p>
          </div>
        ) : null}
        <Link
          href="/dashboard/estudar"
          className="btn btn-primary"
          style={{ alignSelf: "center", marginTop: 4 }}
        >
          Ver plano de estudo
        </Link>
      </div>
    );
  }

  if (!currentBlock) {
    // Todos os blocos concluídos, mas a lição ainda não foi finalizada.
    return (
      <div className="stack">
        <ProgressBar
          value={session.percentage}
          label={`${session.blocksCompleted} de ${session.blocksTotal} blocos`}
        />
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 700 }}>Você concluiu todos os blocos desta lição.</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            onClick={handleComplete}
          >
            Concluir lição
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProgressBar
            value={session.percentage}
            label={`Bloco ${currentBlock.order + 1} de ${session.blocksTotal} — ${formatPercentage(session.percentage)}`}
          />
        </div>
        <span
          className="badge badge-muted"
          style={{ flexShrink: 0 }}
          title={`${hearts.current} de ${hearts.max} baterias`}
          aria-label={`${hearts.current} de ${hearts.max} baterias`}
        >
          ❤️ {hearts.current}
        </span>
      </div>

      {phase === "feedback" && feedback ? (
        <>
          {(() => {
            const reaction = answerReaction(feedback.isCorrect);
            return (
              <CharacterMessage
                character={character}
                expression={reaction.expression}
                message={reaction.message}
              />
            );
          })()}
          {feedback.isCorrect ? (
            // "Porção de XP" (pedido do usuário) por questão certa — mesmo
            // valor que `processLessonCompletionEvent` de fato credita ao
            // concluir a lição (`XP_REWARDS.LESSON_QUESTION_CORRECT`,
            // reaproveitado, não um número solto novo); só uma prévia
            // visual imediata, o crédito real continua batendo na
            // conclusão (Módulo 9), como já era.
            <p
              key={`${currentBlock.id}-xp-pop`}
              className="xp-gain-pop"
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                color: "var(--color-xp)",
                textAlign: "center",
              }}
            >
              +{XP_REWARDS.LESSON_QUESTION_CORRECT} XP
            </p>
          ) : null}
          <QuestionFeedback isCorrect={feedback.isCorrect} explanation={feedback.explanation} />
          <button type="button" className="btn btn-primary" onClick={handleContinueAfterFeedback}>
            Continuar
          </button>
        </>
      ) : currentBlock.type === "QUESTION" && currentBlock.question ? (
        <QuestionRenderer question={currentBlock.question} onSubmit={handleAdvance} />
      ) : (
        <div className="card stack">
          <span className="badge badge-muted" style={{ alignSelf: "flex-start" }}>
            {blockTypeLabel(currentBlock.type)}
          </span>
          <p style={{ whiteSpace: "pre-wrap" }}>{currentBlock.content}</p>
          <button type="button" className="btn btn-primary" onClick={() => handleAdvance()}>
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
