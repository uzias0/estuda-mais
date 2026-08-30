/**
 * Serviço de domínio para `ReviewItem` — criação/consulta/suspensão do item
 * revisável em si (Módulo 5, seção 6.1/7). Não reimplementa uma nova
 * entidade para "conteúdo revisável": reaproveita `ReviewItem` (Módulo 1),
 * apontando para `Question` ou `Concept` já existentes via `scope`.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { ReviewState } from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { deriveActiveState } from "./spacedRepetition";
import { assertOwnReviewDataOrAdmin } from "./privacy";
import { ReviewValidationError } from "./errors";
import {
  EnsureReviewItemInputSchema,
  type EnsureReviewItemInput,
} from "@/modules/review/types/review-session.schema";

async function assertReviewTargetExists(input: EnsureReviewItemInput) {
  if (input.scope === "QUESTION") {
    const question = await prisma.question.findUnique({ where: { id: input.questionId! } });
    if (!question) throw new NotFoundError(`Question "${input.questionId}" não encontrada.`);
  } else {
    const concept = await prisma.concept.findUnique({ where: { id: input.conceptId! } });
    if (!concept) throw new NotFoundError(`Concept "${input.conceptId}" não encontrado.`);
  }
}

/**
 * Cria o item revisável do próprio `actor` se ainda não existir (idempotente
 * — os índices únicos parciais do banco, ver
 * `prisma/migrations/20260818210111_review_item_scope_constraint`, são a
 * última linha de defesa contra duplicata). Estado inicial sempre `NEW`,
 * primeiro vencimento sempre "agora" (o item entra elegível na primeira
 * consulta de fila — seção 28: "estado inicial correto; primeiro vencimento").
 * Nenhuma criação para OUTRO usuário — não é uma ação de curadoria, é
 * autosserviço do próprio aluno sobre seus dados.
 */
export async function ensureReviewItem(actor: Actor, input: EnsureReviewItemInput) {
  const data = EnsureReviewItemInputSchema.parse(input);
  await assertReviewTargetExists(data);

  const existing = await prisma.reviewItem.findFirst({
    where: {
      userId: actor.userId,
      scope: data.scope,
      questionId: data.scope === "QUESTION" ? data.questionId : null,
      conceptId: data.scope === "CONCEPT" ? data.conceptId : null,
    },
  });
  if (existing) return existing;

  return prisma.reviewItem.create({
    data: {
      userId: actor.userId,
      scope: data.scope,
      questionId: data.questionId,
      conceptId: data.conceptId,
      dueAt: new Date(),
      state: ReviewState.NEW,
    },
  });
}

export async function getReviewItem(actor: Actor, id: string) {
  const item = await prisma.reviewItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError(`ReviewItem "${id}" não encontrado.`);
  assertOwnReviewDataOrAdmin(actor, item.userId);
  return item;
}

export async function listReviewItemsForUser(
  actor: Actor,
  targetUserId: string,
  params?: {
    scope?: "QUESTION" | "CONCEPT";
    state?: (typeof ReviewState)[keyof typeof ReviewState];
    take?: number;
    skip?: number;
  },
) {
  assertOwnReviewDataOrAdmin(actor, targetUserId);
  return prisma.reviewItem.findMany({
    where: { userId: targetUserId, scope: params?.scope, state: params?.state },
    take: params?.take ?? 100,
    skip: params?.skip ?? 0,
    orderBy: { dueAt: "asc" },
  });
}

/**
 * Retira um item da fila temporariamente (Módulo 5, seção 7 — `SUSPENDED`).
 * Autosserviço: o próprio dono decide não revisar mais aquele item por ora
 * (ex.: já domina de outra forma); ADMIN também pode, por suporte/operação.
 * Não é uma alteração de conteúdo curatorial — não gera `ContentAuditLog`
 * (seção 22: revisão é evento de uso, não curadoria).
 */
export async function suspendReviewItem(actor: Actor, id: string) {
  const item = await prisma.reviewItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError(`ReviewItem "${id}" não encontrado.`);
  assertOwnReviewDataOrAdmin(actor, item.userId);
  if (item.state === ReviewState.SUSPENDED) {
    throw new ReviewValidationError("Este item já está suspenso.");
  }
  return prisma.reviewItem.update({ where: { id }, data: { state: ReviewState.SUSPENDED } });
}

/** Reativa um item suspenso — o estado reconstituído reflete o histórico real, nunca volta "zerado" por acidente. */
export async function resumeReviewItem(actor: Actor, id: string) {
  const item = await prisma.reviewItem.findUnique({ where: { id } });
  if (!item) throw new NotFoundError(`ReviewItem "${id}" não encontrado.`);
  assertOwnReviewDataOrAdmin(actor, item.userId);
  if (item.state !== ReviewState.SUSPENDED) {
    throw new ReviewValidationError("Este item não está suspenso.");
  }
  const state = deriveActiveState(item.repetitions, item.lastReviewedAt);
  return prisma.reviewItem.update({ where: { id }, data: { state } });
}
