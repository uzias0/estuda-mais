/**
 * Serviço de domínio para `Question` — o banco de questões (Módulo 3, seção
 * 5/6). `sourceId` é sempre obrigatório (seção 9); a estrutura exigida
 * (alternativas ou `answerKey`) depende do `type`, validada aqui, não
 * espalhada pela UI (que nem existe neste módulo).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  NotFoundError,
} from "@/modules/curation/server/services/publicationPolicy";
import { PublicationStatus, QuestionType } from "@/generated/prisma/enums";
import { entityExists } from "@/modules/knowledge/server/services/resolveEntity";
import {
  QuestionCreateInputSchema,
  QuestionUpdateInputSchema,
  QuestionKnowledgeTagInputSchema,
  type QuestionCreateInput,
  type QuestionUpdateInput,
  type QuestionOptionInput,
  type AnswerKey,
} from "@/modules/assessment/types/question.schema";
import { QuestionValidationError } from "./errors";

/**
 * Valida que a "forma" da questão (alternativas vs. answerKey) é coerente
 * com seu `type` — regra de domínio cruzando campos (Módulo 3, seção 6),
 * não expressável só em Zod.
 */
export function assertQuestionShapeValid(
  type: string,
  options: QuestionOptionInput[] | undefined,
  answerKey: AnswerKey | undefined,
): void {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE: {
      if (!options || options.length < 2) {
        throw new QuestionValidationError("MULTIPLE_CHOICE exige ao menos 2 alternativas.");
      }
      if (options.filter((o) => o.isCorrect).length !== 1) {
        throw new QuestionValidationError(
          "MULTIPLE_CHOICE exige exatamente uma alternativa correta.",
        );
      }
      break;
    }
    case QuestionType.TRUE_FALSE: {
      if (!options || options.length !== 2) {
        throw new QuestionValidationError(
          "TRUE_FALSE exige exatamente 2 alternativas (verdadeiro/falso).",
        );
      }
      if (options.filter((o) => o.isCorrect).length !== 1) {
        throw new QuestionValidationError("TRUE_FALSE exige exatamente uma alternativa correta.");
      }
      break;
    }
    case QuestionType.MULTI_SELECT: {
      if (!options || options.length < 2) {
        throw new QuestionValidationError("MULTI_SELECT exige ao menos 2 alternativas.");
      }
      if (options.filter((o) => o.isCorrect).length < 1) {
        throw new QuestionValidationError(
          "MULTI_SELECT exige ao menos uma alternativa correta — nenhuma pode estar totalmente incorreta.",
        );
      }
      break;
    }
    case QuestionType.ORDERING: {
      if (!options || options.length < 2) {
        throw new QuestionValidationError("ORDERING exige ao menos 2 itens para ordenar.");
      }
      const orders = options.map((o) => o.order);
      if (new Set(orders).size !== orders.length) {
        throw new QuestionValidationError("ORDERING exige valores de order únicos entre os itens.");
      }
      break;
    }
    case QuestionType.MATCHING: {
      if (!answerKey || answerKey.kind !== "MATCHING") {
        throw new QuestionValidationError(
          "MATCHING exige answerKey do tipo MATCHING com pares left/right.",
        );
      }
      break;
    }
    case QuestionType.FILL_BLANK: {
      if (!answerKey || answerKey.kind !== "FILL_BLANK") {
        throw new QuestionValidationError(
          "FILL_BLANK exige answerKey do tipo FILL_BLANK com lacunas.",
        );
      }
      if (options?.length) {
        throw new QuestionValidationError(
          "FILL_BLANK não deve possuir estrutura de múltipla escolha (options).",
        );
      }
      break;
    }
    case QuestionType.SHORT_ANSWER: {
      if (!answerKey || answerKey.kind !== "SHORT_ANSWER") {
        throw new QuestionValidationError("SHORT_ANSWER exige answerKey do tipo SHORT_ANSWER.");
      }
      if (options?.length) {
        throw new QuestionValidationError(
          "SHORT_ANSWER não deve exigir estrutura de alternativas (options).",
        );
      }
      break;
    }
    case QuestionType.CASE_STUDY: {
      const hasOptions = !!options?.length;
      const hasAnswerKey = !!answerKey;
      if (!hasOptions && !hasAnswerKey) {
        throw new QuestionValidationError(
          "CASE_STUDY exige options (alternativas) OU answerKey para ser corrigível.",
        );
      }
      if (hasOptions && options!.filter((o) => o.isCorrect).length < 1) {
        throw new QuestionValidationError(
          "CASE_STUDY com alternativas exige ao menos uma correta.",
        );
      }
      break;
    }
    default:
      throw new QuestionValidationError(`Tipo de questão desconhecido: "${type}".`);
  }
}

async function assertExamEditionExists(examEditionId?: string) {
  if (!examEditionId) return;
  const edition = await prisma.examEdition.findUnique({ where: { id: examEditionId } });
  if (!edition) throw new NotFoundError(`ExamEdition "${examEditionId}" não encontrada.`);
}

async function assertSourceExists(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw new NotFoundError(`Source "${sourceId}" não encontrada.`);
}

export async function createQuestion(actor: Actor, input: QuestionCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = QuestionCreateInputSchema.parse(input);
  assertQuestionShapeValid(data.type, data.options, data.answerKey);
  await assertSourceExists(data.sourceId);
  await assertExamEditionExists(data.examEditionId);

  const { options, answerKey, ...scalarData } = data;
  const question = await prisma.question.create({
    data: {
      ...scalarData,
      answerKey: answerKey ?? undefined,
      options: options
        ? { create: options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })) }
        : undefined,
    },
    include: { options: true },
  });

  await recordAudit({
    entityType: "QUESTION",
    entityId: question.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: question,
  });
  return question;
}

export async function updateQuestion(actor: Actor, id: string, input: QuestionUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = QuestionUpdateInputSchema.parse(input);

  const existing = await prisma.question.findUnique({ where: { id }, include: { options: true } });
  if (!existing) throw new NotFoundError(`Question "${id}" não encontrada.`);

  if (data.sourceId) await assertSourceExists(data.sourceId);
  if (data.examEditionId) await assertExamEditionExists(data.examEditionId);

  // Revalida a forma com o resultado final (existente + patch), usando o
  // `type` já gravado — `type` não é atualizável (ver question.schema.ts).
  const nextOptions = data.options ?? undefined;
  const nextAnswerKey = data.answerKey ?? (existing.answerKey as AnswerKey | null) ?? undefined;
  if (data.options || data.answerKey) {
    assertQuestionShapeValid(existing.type, nextOptions, nextAnswerKey);
  }

  const { options, answerKey, ...scalarData } = data;
  const question = await prisma.$transaction(async (tx) => {
    if (options) {
      await tx.questionOption.deleteMany({ where: { questionId: id } });
      await tx.questionOption.createMany({
        data: options.map((o) => ({
          questionId: id,
          text: o.text,
          isCorrect: o.isCorrect,
          order: o.order,
        })),
      });
    }
    return tx.question.update({
      where: { id },
      data: { ...scalarData, answerKey: answerKey ?? undefined },
      include: { options: true },
    });
  });

  await recordAudit({
    entityType: "QUESTION",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: question,
  });
  return question;
}

/**
 * Publica uma questão. Diferente das entidades da Base de Conhecimento
 * (Módulo 2), não exige Citation — a procedência de uma Question é
 * `sourceId` (sempre obrigatório desde a criação); o gate aqui é
 * estrutural: a forma precisa continuar válida para o tipo (Módulo 3, seção 16).
 */
export async function publishQuestion(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.question.findUnique({ where: { id }, include: { options: true } });
  if (!existing) throw new NotFoundError(`Question "${id}" não encontrada.`);
  if (existing.reviewStatus === PublicationStatus.ARCHIVED) {
    throw new QuestionValidationError("Questão arquivada não pode ser publicada.");
  }
  if (existing.reviewStatus === PublicationStatus.PUBLISHED) {
    throw new QuestionValidationError("Questão já está publicada.");
  }
  assertQuestionShapeValid(
    existing.type,
    existing.options,
    (existing.answerKey as AnswerKey | null) ?? undefined,
  );

  const question = await prisma.question.update({
    where: { id },
    data: { reviewStatus: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: "QUESTION",
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: question,
  });
  return question;
}

export async function archiveQuestion(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Question "${id}" não encontrada.`);
  assertArchivable(existing.reviewStatus);

  const question = await prisma.question.update({
    where: { id },
    data: { reviewStatus: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: "QUESTION",
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: question,
  });
  return question;
}

/** Associa a questão a um nó de conhecimento (`QuestionKnowledgeTag`) — reaproveita `resolveEntity`. */
export async function linkQuestionToKnowledge(
  actor: Actor,
  questionId: string,
  input: { entityType: string; entityId: string },
) {
  assertRole(actor, CURATOR_ROLES);
  const data = QuestionKnowledgeTagInputSchema.parse(input);

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) throw new NotFoundError(`Question "${questionId}" não encontrada.`);
  if (!(await entityExists(data.entityType, data.entityId))) {
    throw new NotFoundError(`Entidade ${data.entityType}("${data.entityId}") não encontrada.`);
  }

  const tag = await prisma.questionKnowledgeTag.upsert({
    where: {
      questionId_entityType_entityId: {
        questionId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
    create: { questionId, entityType: data.entityType, entityId: data.entityId },
    update: {},
  });
  await recordAudit({
    entityType: "QUESTION",
    entityId: questionId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: tag,
  });
  return tag;
}

export async function unlinkQuestionFromKnowledge(
  actor: Actor,
  questionId: string,
  input: { entityType: string; entityId: string },
) {
  assertRole(actor, CURATOR_ROLES);
  const data = QuestionKnowledgeTagInputSchema.parse(input);
  await prisma.questionKnowledgeTag.delete({
    where: {
      questionId_entityType_entityId: {
        questionId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
  });
  await recordAudit({
    entityType: "QUESTION",
    entityId: questionId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: input,
  });
}

export async function linkQuestionToTag(actor: Actor, questionId: string, tagId: string) {
  assertRole(actor, CURATOR_ROLES);
  const [question, tag] = await Promise.all([
    prisma.question.findUnique({ where: { id: questionId } }),
    prisma.tag.findUnique({ where: { id: tagId } }),
  ]);
  if (!question) throw new NotFoundError(`Question "${questionId}" não encontrada.`);
  if (!tag) throw new NotFoundError(`Tag "${tagId}" não encontrada.`);

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: { tags: { connect: { id: tagId } } },
    include: { tags: true },
  });
  await recordAudit({
    entityType: "QUESTION",
    entityId: questionId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: { linkedTagId: tagId },
  });
  return updated;
}

export async function getQuestion(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: { options: true, knowledgeTags: true, tags: true, source: true, examEdition: true },
  });
}
