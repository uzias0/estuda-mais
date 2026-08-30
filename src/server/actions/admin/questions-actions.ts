"use server";

/**
 * Server Actions administrativas para `Question` (Módulo 12) — a entidade
 * mais rica do domínio (8 tipos, `QuestionOption`/`answerKey` variáveis por
 * tipo). Camada fina: só traduz `FormData` → o formato de entrada que
 * `question.service.ts` já espera; TODA validação de forma continua em
 * `assertQuestionShapeValid` (Módulo 3) — esta Server Action nunca decide
 * se uma questão está bem formada, só monta o objeto e deixa o serviço
 * aceitar ou rejeitar.
 */
import { redirect } from "next/navigation";
import { requireAdminSessionActor } from "@/server/auth/session";
import {
  createQuestion,
  updateQuestion,
  publishQuestion,
  archiveQuestion,
  linkQuestionToKnowledge,
  unlinkQuestionFromKnowledge,
  linkQuestionToTag,
} from "@/modules/assessment/server/services/question.service";

const MAX_OPTION_ROWS = 8;
const MAX_PAIR_ROWS = 6;

function linesToArray(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Monta `options`/`answerKey` a partir do formulário genérico de questão,
 * conforme `type` — espelha exatamente a tabela de "estrutura exigida" de
 * `docs/MODULO-3.md`, seção 5, mas SÓ para montar o payload; quem valida de
 * verdade é `assertQuestionShapeValid` no serviço.
 */
function buildOptionsAndAnswerKey(type: string, formData: FormData) {
  if (type === "ORDERING") {
    const options = [];
    for (let i = 0; i < MAX_OPTION_ROWS; i++) {
      const text = formData.get(`option_text_${i}`);
      if (text) options.push({ text: String(text), order: i, isCorrect: false });
    }
    return { options, answerKey: undefined };
  }
  if (
    type === "MULTIPLE_CHOICE" ||
    type === "TRUE_FALSE" ||
    type === "MULTI_SELECT" ||
    type === "CASE_STUDY"
  ) {
    const options = [];
    for (let i = 0; i < MAX_OPTION_ROWS; i++) {
      const text = formData.get(`option_text_${i}`);
      if (text) {
        options.push({
          text: String(text),
          order: i,
          isCorrect: formData.get(`option_correct_${i}`) === "on",
        });
      }
    }
    return { options: options.length > 0 ? options : undefined, answerKey: undefined };
  }
  if (type === "MATCHING") {
    const pairs = [];
    for (let i = 0; i < MAX_PAIR_ROWS; i++) {
      const left = formData.get(`pair_left_${i}`);
      const right = formData.get(`pair_right_${i}`);
      if (left && right) pairs.push({ left: String(left), right: String(right) });
    }
    return { options: undefined, answerKey: { kind: "MATCHING" as const, pairs } };
  }
  if (type === "FILL_BLANK") {
    const accepted = linesToArray(formData.get("accepted_answers"));
    return {
      options: undefined,
      answerKey: { kind: "FILL_BLANK" as const, blanks: [{ accepted }] },
    };
  }
  if (type === "SHORT_ANSWER") {
    const accepted = linesToArray(formData.get("accepted_answers"));
    return { options: undefined, answerKey: { kind: "SHORT_ANSWER" as const, accepted } };
  }
  return { options: undefined, answerKey: undefined };
}

export async function createQuestionAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  const type = String(formData.get("type"));
  const { options, answerKey } = buildOptionsAndAnswerKey(type, formData);
  const question = await createQuestion(actor, {
    prompt: String(formData.get("prompt")),
    type: type as never,
    explanation: (formData.get("explanation") && String(formData.get("explanation"))) || undefined,
    difficulty: String(formData.get("difficulty")) as never,
    sourceId: String(formData.get("sourceId")),
    examEditionId:
      (formData.get("examEditionId") && String(formData.get("examEditionId"))) || undefined,
    reproductionAllowed: formData.get("reproductionAllowed") === "on",
    options: options as never,
    answerKey: answerKey as never,
  });
  redirect(`/admin/questions/${question.id}`);
}

export async function updateQuestionAction(id: string, currentType: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  const { options, answerKey } = buildOptionsAndAnswerKey(currentType, formData);
  await updateQuestion(actor, id, {
    prompt: String(formData.get("prompt")),
    explanation: (formData.get("explanation") && String(formData.get("explanation"))) || undefined,
    difficulty: String(formData.get("difficulty")) as never,
    sourceId: String(formData.get("sourceId")),
    examEditionId:
      (formData.get("examEditionId") && String(formData.get("examEditionId"))) || undefined,
    reproductionAllowed: formData.get("reproductionAllowed") === "on",
    options: options as never,
    answerKey: answerKey as never,
  });
}

export async function publishQuestionAction(id: string) {
  const actor = await requireAdminSessionActor();
  await publishQuestion(actor, id);
}

export async function archiveQuestionAction(id: string) {
  const actor = await requireAdminSessionActor();
  await archiveQuestion(actor, id);
}

export async function linkQuestionToKnowledgeAction(questionId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkQuestionToKnowledge(actor, questionId, {
    entityType: String(formData.get("entityType")) as never,
    entityId: String(formData.get("entityId")),
  });
}

export async function unlinkQuestionFromKnowledgeAction(
  questionId: string,
  entityType: string,
  entityId: string,
) {
  const actor = await requireAdminSessionActor();
  await unlinkQuestionFromKnowledge(actor, questionId, {
    entityType: entityType as never,
    entityId,
  });
}

export async function linkQuestionToTagAction(questionId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkQuestionToTag(actor, questionId, String(formData.get("tagId")));
}
