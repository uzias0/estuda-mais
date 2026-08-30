/**
 * Correção de respostas — sempre no servidor, nunca confiando em `isCorrect`
 * vindo do cliente (Módulo 3, seção 17/31). Função pura: recebe a `Question`
 * armazenada (tipo, alternativas, answerKey) e a resposta enviada, devolve
 * um booleano. Nenhuma leitura/escrita de banco aqui — quem chama
 * (`questionAttempt.service.ts`) já buscou os dados.
 */
import type { QuestionOption } from "@/generated/prisma/client";
import type { QuestionType } from "@/generated/prisma/enums";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";
import type { AnswerKey } from "@/modules/assessment/types/question.schema";
import { AttemptValidationError } from "./errors";

type QuestionTypeValue = (typeof QuestionType)[keyof typeof QuestionType];

/** Normaliza texto para comparação tolerante (maiúsculas/minúsculas, acentos, espaços nas pontas). */
function normalize(text: string): string {
  return text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface GradeAnswerParams {
  questionType: QuestionTypeValue;
  options: QuestionOption[];
  answerKey: AnswerKey | null;
  answerData: AttemptAnswerData;
}

export function gradeAnswer(params: GradeAnswerParams): boolean {
  const { questionType, options, answerKey, answerData } = params;

  if (answerData.type !== questionType) {
    throw new AttemptValidationError(
      `A resposta enviada é do tipo "${answerData.type}", mas a questão é do tipo "${questionType}".`,
    );
  }

  switch (answerData.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE": {
      const selected = options.find((o) => o.id === answerData.selectedOptionId);
      if (!selected) {
        throw new AttemptValidationError(
          "selectedOptionId não corresponde a nenhuma alternativa desta questão.",
        );
      }
      return selected.isCorrect;
    }

    case "MULTI_SELECT": {
      const validIds = new Set(options.map((o) => o.id));
      for (const id of answerData.selectedOptionIds) {
        if (!validIds.has(id)) {
          throw new AttemptValidationError(
            `selectedOptionIds contém "${id}", que não pertence a esta questão.`,
          );
        }
      }
      const correctIds = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));
      const selectedIds = new Set(answerData.selectedOptionIds);
      if (selectedIds.size !== correctIds.size) return false;
      for (const id of selectedIds) if (!correctIds.has(id)) return false;
      return true;
    }

    case "ORDERING": {
      const validIds = new Set(options.map((o) => o.id));
      for (const id of answerData.orderedOptionIds) {
        if (!validIds.has(id)) {
          throw new AttemptValidationError(
            `orderedOptionIds contém "${id}", que não pertence a esta questão.`,
          );
        }
      }
      const correctSequence = [...options].sort((a, b) => a.order - b.order).map((o) => o.id);
      if (answerData.orderedOptionIds.length !== correctSequence.length) return false;
      return answerData.orderedOptionIds.every((id, index) => id === correctSequence[index]);
    }

    case "MATCHING": {
      if (!answerKey || answerKey.kind !== "MATCHING") {
        throw new AttemptValidationError("Questão MATCHING sem answerKey válido armazenado.");
      }
      const correctPairs = new Set(
        answerKey.pairs.map((p) => `${normalize(p.left)}::${normalize(p.right)}`),
      );
      if (answerData.pairs.length !== answerKey.pairs.length) return false;
      return answerData.pairs.every((p) =>
        correctPairs.has(`${normalize(p.left)}::${normalize(p.right)}`),
      );
    }

    case "FILL_BLANK": {
      if (!answerKey || answerKey.kind !== "FILL_BLANK") {
        throw new AttemptValidationError("Questão FILL_BLANK sem answerKey válido armazenado.");
      }
      if (answerData.answers.length !== answerKey.blanks.length) return false;
      return answerData.answers.every((answer, index) =>
        answerKey.blanks[index].accepted.some(
          (accepted) => normalize(accepted) === normalize(answer),
        ),
      );
    }

    case "SHORT_ANSWER": {
      if (!answerKey || answerKey.kind !== "SHORT_ANSWER") {
        throw new AttemptValidationError("Questão SHORT_ANSWER sem answerKey válido armazenado.");
      }
      return answerKey.accepted.some(
        (accepted) => normalize(accepted) === normalize(answerData.text),
      );
    }

    case "CASE_STUDY": {
      if (answerData.selectedOptionId) {
        const selected = options.find((o) => o.id === answerData.selectedOptionId);
        if (!selected) {
          throw new AttemptValidationError(
            "selectedOptionId não corresponde a nenhuma alternativa desta questão.",
          );
        }
        return selected.isCorrect;
      }
      if (answerData.text && answerKey?.kind === "SHORT_ANSWER") {
        return answerKey.accepted.some(
          (accepted) => normalize(accepted) === normalize(answerData.text!),
        );
      }
      throw new AttemptValidationError(
        "CASE_STUDY exige selectedOptionId (quando a questão usa alternativas) ou text (quando usa answerKey do tipo SHORT_ANSWER).",
      );
    }
  }
}
