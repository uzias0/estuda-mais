"use client";

/**
 * Renderiza uma questão e coleta a resposta do aluno (Módulo 11, seções
 * 10/11). Client Component: precisa de estado local para a seleção antes
 * de enviar (seção 45 — interatividade). NUNCA decide se a resposta está
 * certa — só monta o `AttemptAnswerData` exatamente no formato que
 * `gradeAnswer` (Módulo 3) espera e devolve via `onSubmit`; a correção real
 * acontece sempre no servidor (seção 11: "a UI nunca recebe nem exibe
 * resposta correta antes da correção").
 *
 * Limitação documentada (docs/MODULO-11.md): a visão pública da questão
 * (`toPublicQuestionView`, Módulo 3/6) só expõe `options` — nunca a
 * contagem de pares (MATCHING) ou de lacunas (FILL_BLANK), de propósito
 * (não vaza a forma do gabarito). Para esses dois tipos, a UI oferece uma
 * lista dinâmica (adicionar/remover linha) em vez de um número fixo de
 * campos.
 */
import { useState } from "react";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import { questionTypeLabel, difficultyLabel } from "@/lib/format";
import { Badge } from "./Badge";

export interface PublicQuestionViewLike {
  id: string;
  prompt: string;
  type: string;
  difficulty: string;
  options: Array<{ id: string; text: string; order: number }>;
}

export function QuestionRenderer({
  question,
  onSubmit,
  disabled = false,
}: {
  question: PublicQuestionViewLike;
  onSubmit: (answerData: AttemptAnswerData) => void;
  disabled?: boolean;
}) {
  return (
    <div className="card stack">
      <div className="row-wrap" style={{ justifyContent: "space-between" }}>
        <Badge tone="muted">{questionTypeLabel(question.type)}</Badge>
        <Badge tone="brand">{difficultyLabel(question.difficulty)}</Badge>
      </div>
      <p style={{ fontSize: "1.05rem", fontWeight: 600 }}>{question.prompt}</p>
      <QuestionInput question={question} onSubmit={onSubmit} disabled={disabled} />
    </div>
  );
}

function QuestionInput({
  question,
  onSubmit,
  disabled,
}: {
  question: PublicQuestionViewLike;
  onSubmit: (answerData: AttemptAnswerData) => void;
  disabled: boolean;
}) {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
      return <SingleChoiceInput question={question} onSubmit={onSubmit} disabled={disabled} />;
    case "MULTI_SELECT":
      return <MultiSelectInput question={question} onSubmit={onSubmit} disabled={disabled} />;
    case "ORDERING":
      return <OrderingInput question={question} onSubmit={onSubmit} disabled={disabled} />;
    case "MATCHING":
      return <MatchingInput onSubmit={onSubmit} disabled={disabled} />;
    case "FILL_BLANK":
      return <FillBlankInput onSubmit={onSubmit} disabled={disabled} />;
    case "SHORT_ANSWER":
      return <ShortAnswerInput onSubmit={onSubmit} disabled={disabled} />;
    case "CASE_STUDY":
      return <CaseStudyInput question={question} onSubmit={onSubmit} disabled={disabled} />;
    default:
      return <p style={{ color: "var(--color-danger)" }}>Tipo de questão não suportado.</p>;
  }
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={disabled}>
      Responder
    </button>
  );
}

function SingleChoiceInput({
  question,
  onSubmit,
  disabled,
}: {
  question: PublicQuestionViewLike;
  onSubmit: (answerData: AttemptAnswerData) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        // `question.type` é MULTIPLE_CHOICE/TRUE_FALSE (uso normal) ou
        // CASE_STUDY (quando `CaseStudyInput` reaproveita este componente
        // para o caso "com alternativas") — as três formas aceitam
        // `selectedOptionId` no schema real (`AttemptAnswerDataSchema`),
        // então a asserção abaixo é segura mesmo sem um tipo literal.
        if (selected) {
          onSubmit({ type: question.type, selectedOptionId: selected } as AttemptAnswerData);
        }
      }}
    >
      <fieldset className="stack" style={{ border: "none", padding: 0 }}>
        <legend className="visually-hidden">Alternativas</legend>
        {[...question.options]
          .sort((a, b) => a.order - b.order)
          .map((option) => (
            <label key={option.id} className="option-row">
              <input
                type="radio"
                name="option"
                value={option.id}
                checked={selected === option.id}
                onChange={() => setSelected(option.id)}
                disabled={disabled}
              />
              <span>{option.text}</span>
            </label>
          ))}
      </fieldset>
      <SubmitButton disabled={disabled || !selected} />
    </form>
  );
}

function MultiSelectInput({
  question,
  onSubmit,
  disabled,
}: {
  question: PublicQuestionViewLike;
  onSubmit: (answerData: AttemptAnswerData) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.size > 0) {
          onSubmit({ type: "MULTI_SELECT", selectedOptionIds: [...selected] });
        }
      }}
    >
      <fieldset className="stack" style={{ border: "none", padding: 0 }}>
        <legend className="visually-hidden">Alternativas (selecione uma ou mais)</legend>
        {[...question.options]
          .sort((a, b) => a.order - b.order)
          .map((option) => (
            <label key={option.id} className="option-row">
              <input
                type="checkbox"
                checked={selected.has(option.id)}
                disabled={disabled}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(option.id);
                  else next.delete(option.id);
                  setSelected(next);
                }}
              />
              <span>{option.text}</span>
            </label>
          ))}
      </fieldset>
      <SubmitButton disabled={disabled || selected.size === 0} />
    </form>
  );
}

function OrderingInput({
  question,
  onSubmit,
  disabled,
}: {
  question: PublicQuestionViewLike;
  onSubmit: (answerData: AttemptAnswerData) => void;
  disabled: boolean;
}) {
  const [order, setOrder] = useState<string[]>(
    [...question.options].sort((a, b) => a.order - b.order).map((o) => o.id),
  );
  const byId = new Map(question.options.map((o) => [o.id, o.text]));

  function move(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ type: "ORDERING", orderedOptionIds: order });
      }}
    >
      <ol className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {order.map((id, index) => (
          <li key={id} className="option-row" style={{ justifyContent: "space-between" }}>
            <span>
              {index + 1}. {byId.get(id)}
            </span>
            <span className="row-wrap">
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 44, minWidth: 44, padding: "4px 10px" }}
                onClick={() => move(index, -1)}
                disabled={disabled || index === 0}
                aria-label={`Mover "${byId.get(id)}" para cima`}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 44, minWidth: 44, padding: "4px 10px" }}
                onClick={() => move(index, 1)}
                disabled={disabled || index === order.length - 1}
                aria-label={`Mover "${byId.get(id)}" para baixo`}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
      <SubmitButton disabled={disabled} />
    </form>
  );
}

function MatchingInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (answerData: AttemptAnswerData) => void;
  disabled: boolean;
}) {
  const [pairs, setPairs] = useState<Array<{ left: string; right: string }>>([
    { left: "", right: "" },
    { left: "", right: "" },
  ]);

  function updatePair(index: number, field: "left" | "right", value: string) {
    setPairs(pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  const valid = pairs.every((p) => p.left.trim() && p.right.trim());

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ type: "MATCHING", pairs });
      }}
    >
      {pairs.map((pair, index) => (
        <div key={index} className="row-wrap">
          <input
            className="text-input"
            aria-label={`Item ${index + 1}`}
            placeholder="Item"
            value={pair.left}
            disabled={disabled}
            onChange={(e) => updatePair(index, "left", e.target.value)}
          />
          <span aria-hidden="true">↔</span>
          <input
            className="text-input"
            aria-label={`Correspondência do item ${index + 1}`}
            placeholder="Corresponde a"
            value={pair.right}
            disabled={disabled}
            onChange={(e) => updatePair(index, "right", e.target.value)}
          />
        </div>
      ))}
      <div className="row-wrap">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled}
          onClick={() => setPairs([...pairs, { left: "", right: "" }])}
        >
          + Adicionar par
        </button>
        <SubmitButton disabled={disabled || !valid} />
      </div>
    </form>
  );
}

function FillBlankInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (answerData: AttemptAnswerData) => void;
  disabled: boolean;
}) {
  const [answers, setAnswers] = useState<string[]>([""]);
  const valid = answers.every((a) => a.trim().length > 0);

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ type: "FILL_BLANK", answers });
      }}
    >
      {answers.map((value, index) => (
        <input
          key={index}
          className="text-input"
          aria-label={`Lacuna ${index + 1}`}
          placeholder={`Resposta da lacuna ${index + 1}`}
          value={value}
          disabled={disabled}
          onChange={(e) => setAnswers(answers.map((a, i) => (i === index ? e.target.value : a)))}
        />
      ))}
      <div className="row-wrap">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled}
          onClick={() => setAnswers([...answers, ""])}
        >
          + Adicionar lacuna
        </button>
        <SubmitButton disabled={disabled || !valid} />
      </div>
    </form>
  );
}

function ShortAnswerInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (answerData: AttemptAnswerData) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit({ type: "SHORT_ANSWER", text });
      }}
    >
      <input
        className="text-input"
        aria-label="Sua resposta"
        placeholder="Sua resposta"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
      />
      <SubmitButton disabled={disabled || !text.trim()} />
    </form>
  );
}

function CaseStudyInput({
  question,
  onSubmit,
  disabled,
}: {
  question: PublicQuestionViewLike;
  onSubmit: (answerData: AttemptAnswerData) => void;
  disabled: boolean;
}) {
  if (question.options.length > 0) {
    return (
      <SingleChoiceInput
        question={{ ...question, type: "CASE_STUDY" }}
        onSubmit={onSubmit}
        disabled={disabled}
      />
    );
  }
  return (
    <ShortAnswerInput
      onSubmit={(data) => onSubmit({ type: "CASE_STUDY", text: (data as { text: string }).text })}
      disabled={disabled}
    />
  );
}
