/**
 * Serviço de domínio para `LessonBlock` — o conteúdo real de uma `Lesson`,
 * em blocos ordenados e tipados (INTRO/CONCEPT/EXAMPLE/QUESTION/CONCLUSION).
 * `questionId` é a associação de questões às lições (Módulo 4, capacidade
 * 14) — aponta para uma `Question` real do Módulo 3 (FK nativa, não
 * polimórfica), nunca duplica o enunciado dentro do bloco.
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import { NotFoundError } from "./pedagogy-publication.service";
import { assertValidReorder } from "./reorder";
import { PedagogyValidationError } from "./errors";
import { AuditableEntityType, BlockType } from "@/generated/prisma/enums";
import {
  LessonBlockCreateInputSchema,
  LessonBlockUpdateInputSchema,
  type LessonBlockCreateInput,
  type LessonBlockUpdateInput,
} from "@/modules/pedagogy/types/lesson-block.schema";

type BlockTypeValue = (typeof BlockType)[keyof typeof BlockType];

/**
 * Validação estrutural por tipo de bloco (Módulo 4, capacidade 17) —
 * mesmo espírito de `assertQuestionShapeValid` (Módulo 3): QUESTION exige
 * `questionId` (e não deve reproduzir o enunciado em `content`); os demais
 * tipos exigem `content` e não devem referenciar uma questão.
 */
export function assertLessonBlockShapeValid(
  type: BlockTypeValue,
  content?: string | null,
  questionId?: string | null,
): void {
  if (type === BlockType.QUESTION) {
    if (!questionId) {
      throw new PedagogyValidationError("Bloco do tipo QUESTION exige questionId.");
    }
    return;
  }
  if (questionId) {
    throw new PedagogyValidationError(
      `Bloco do tipo ${type} não deve referenciar questionId — isso é exclusivo de blocos QUESTION.`,
    );
  }
  if (!content || !content.trim()) {
    throw new PedagogyValidationError(`Bloco do tipo ${type} exige conteúdo (content).`);
  }
}

async function assertQuestionExists(questionId?: string) {
  if (!questionId) return;
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) throw new NotFoundError(`Question "${questionId}" não encontrada.`);
}

export async function createLessonBlock(
  actor: Actor,
  lessonId: string,
  input: LessonBlockCreateInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = LessonBlockCreateInputSchema.parse(input);
  assertLessonBlockShapeValid(data.type, data.content, data.questionId);

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new NotFoundError(`Lesson "${lessonId}" não encontrada.`);
  await assertQuestionExists(data.questionId);

  const block = await prisma.lessonBlock.create({ data: { ...data, lessonId } });
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: lessonId,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: block,
  });
  return block;
}

export async function updateLessonBlock(actor: Actor, id: string, input: LessonBlockUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = LessonBlockUpdateInputSchema.parse(input);

  const existing = await prisma.lessonBlock.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LessonBlock "${id}" não encontrado.`);

  const nextType = data.type ?? existing.type;
  const nextContent = data.content !== undefined ? data.content : existing.content;
  const nextQuestionId = data.questionId !== undefined ? data.questionId : existing.questionId;
  assertLessonBlockShapeValid(nextType, nextContent, nextQuestionId);
  if (data.questionId) await assertQuestionExists(data.questionId);

  const block = await prisma.lessonBlock.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: existing.lessonId,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: block,
  });
  return block;
}

export async function deleteLessonBlock(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.lessonBlock.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`LessonBlock "${id}" não encontrado.`);

  await prisma.lessonBlock.delete({ where: { id } });
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: existing.lessonId,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: { deletedLessonBlockId: id },
  });
}

/**
 * Reordenação segura (Módulo 4, capacidade 11) — ver `reorder.ts`. Passa
 * por uma posição intermediária negativa antes de gravar a ordem final:
 * `@@unique([lessonId, order])` (schema.prisma) rejeitaria uma troca direta
 * de posições (ex.: 0↔1) dentro da mesma transação, já que a posição
 * intermediária colidiria com uma linha ainda não atualizada.
 */
export async function reorderLessonBlocks(
  actor: Actor,
  lessonId: string,
  orderedBlockIds: string[],
) {
  assertRole(actor, CURATOR_ROLES);

  const current = await prisma.lessonBlock.findMany({
    where: { lessonId },
    select: { id: true },
  });
  assertValidReorder(
    current.map((c) => c.id),
    orderedBlockIds,
  );

  await prisma.$transaction([
    ...orderedBlockIds.map((id, index) =>
      prisma.lessonBlock.update({ where: { id }, data: { order: -1 * (index + 1) } }),
    ),
    ...orderedBlockIds.map((id, index) =>
      prisma.lessonBlock.update({ where: { id }, data: { order: index } }),
    ),
  ]);
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: lessonId,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: { reorderedBlockIds: orderedBlockIds },
  });
}

export async function getLessonBlock(id: string) {
  return prisma.lessonBlock.findUnique({ where: { id }, include: { question: true } });
}

export async function listLessonBlocks(lessonId: string) {
  return prisma.lessonBlock.findMany({ where: { lessonId }, orderBy: { order: "asc" } });
}
