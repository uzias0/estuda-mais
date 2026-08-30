/**
 * Serviço de domínio para `Lesson` — conteúdo pedagógico reutilizável
 * (Módulo 4). Uma `Lesson` ENSINA um nó da Base de Conhecimento (via
 * `LessonKnowledgeTag`); ela nunca É o nó — `Concept ≠ Lesson`, `Theory ≠
 * Lesson` (docs pedidos do módulo, seção 4). O conteúdo em si vive em
 * `LessonBlock` (ver `lesson-block.service.ts`), não em campos aqui.
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  assertLessonPublishable,
  assertPublishStatusTransition,
  NotFoundError,
} from "./pedagogy-publication.service";
import { AuditableEntityType, PublicationStatus } from "@/generated/prisma/enums";
import { entityExists } from "@/modules/knowledge/server/services/resolveEntity";
import {
  LessonCreateInputSchema,
  LessonUpdateInputSchema,
  LessonKnowledgeTagInputSchema,
  type LessonCreateInput,
  type LessonUpdateInput,
  type LessonKnowledgeTagInput,
} from "@/modules/pedagogy/types/lesson.schema";

type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

export async function createLesson(actor: Actor, input: LessonCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = LessonCreateInputSchema.parse(input);

  const lesson = await prisma.lesson.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: lesson.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: lesson,
  });
  return lesson;
}

export async function updateLesson(actor: Actor, id: string, input: LessonUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = LessonUpdateInputSchema.parse(input);

  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Lesson "${id}" não encontrada.`);

  const lesson = await prisma.lesson.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: lesson,
  });
  return lesson;
}

/**
 * Publica uma Lesson. Diferente de Track/LearningArea/Unit/Stage (gate
 * estrutural puro), Lesson é citável (`CitationEntityType.LESSON`) — exige
 * >=1 Citation (procedência) E >=1 LessonBlock (conteúdo), ver
 * `assertLessonPublishable`.
 */
export async function publishLesson(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Lesson "${id}" não encontrada.`);
  assertPublishStatusTransition(existing.status);
  await assertLessonPublishable(id, existing.status);

  const lesson = await prisma.lesson.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: lesson,
  });
  return lesson;
}

export async function archiveLesson(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.lesson.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Lesson "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const lesson = await prisma.lesson.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: lesson,
  });
  return lesson;
}

/** Associa a lição a um nó de conhecimento (`LessonKnowledgeTag`) — reaproveita `resolveEntity` (Módulo 1/2). */
export async function linkLessonToKnowledge(
  actor: Actor,
  lessonId: string,
  input: LessonKnowledgeTagInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = LessonKnowledgeTagInputSchema.parse(input);

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new NotFoundError(`Lesson "${lessonId}" não encontrada.`);
  if (!(await entityExists(data.entityType, data.entityId))) {
    throw new NotFoundError(`Entidade ${data.entityType}("${data.entityId}") não encontrada.`);
  }

  const tag = await prisma.lessonKnowledgeTag.upsert({
    where: {
      lessonId_entityType_entityId: {
        lessonId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
    create: { lessonId, entityType: data.entityType, entityId: data.entityId },
    update: {},
  });
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: lessonId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: tag,
  });
  return tag;
}

export async function unlinkLessonFromKnowledge(
  actor: Actor,
  lessonId: string,
  input: LessonKnowledgeTagInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = LessonKnowledgeTagInputSchema.parse(input);
  await prisma.lessonKnowledgeTag.delete({
    where: {
      lessonId_entityType_entityId: {
        lessonId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    },
  });
  await recordAudit({
    entityType: AuditableEntityType.LESSON,
    entityId: lessonId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: input,
  });
}

export async function getLesson(id: string) {
  return prisma.lesson.findUnique({
    where: { id },
    include: {
      blocks: { orderBy: { order: "asc" } },
      knowledgeTags: true,
      stages: { include: { stage: true } },
    },
  });
}

export async function listLessons(params?: {
  status?: PublicationStatusValue;
  take?: number;
  skip?: number;
}) {
  return prisma.lesson.findMany({
    where: { status: params?.status },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}
