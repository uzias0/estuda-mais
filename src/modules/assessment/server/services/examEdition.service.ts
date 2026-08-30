/**
 * Serviço de domínio para `ExamEdition` — edição específica de uma prova
 * (ex.: "ENADE Psicologia 2024"). Valida existência de `Exam`/`ExamBoard`/
 * `Organization`/`Position`/`Source` quando informados (Módulo 3, seção 11).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  NotFoundError,
} from "@/modules/curation/server/services/publicationPolicy";
import { PublicationStatus } from "@/generated/prisma/enums";
import {
  ExamEditionCreateInputSchema,
  ExamEditionUpdateInputSchema,
  type ExamEditionCreateInput,
  type ExamEditionUpdateInput,
} from "@/modules/assessment/types/exam.schema";

async function assertRelationsExist(data: {
  examId?: string;
  examBoardId?: string;
  organizationId?: string;
  positionId?: string;
  sourceId?: string;
}) {
  if (data.examId) {
    const exam = await prisma.exam.findUnique({ where: { id: data.examId } });
    if (!exam) throw new NotFoundError(`Exam "${data.examId}" não encontrado.`);
  }
  if (data.examBoardId) {
    const board = await prisma.examBoard.findUnique({ where: { id: data.examBoardId } });
    if (!board) throw new NotFoundError(`ExamBoard "${data.examBoardId}" não encontrada.`);
  }
  if (data.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: data.organizationId } });
    if (!org) throw new NotFoundError(`Organization "${data.organizationId}" não encontrada.`);
  }
  if (data.positionId) {
    const position = await prisma.position.findUnique({ where: { id: data.positionId } });
    if (!position) throw new NotFoundError(`Position "${data.positionId}" não encontrada.`);
  }
  if (data.sourceId) {
    const source = await prisma.source.findUnique({ where: { id: data.sourceId } });
    if (!source) throw new NotFoundError(`Source "${data.sourceId}" não encontrada.`);
  }
}

export async function createExamEdition(actor: Actor, input: ExamEditionCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamEditionCreateInputSchema.parse(input);
  await assertRelationsExist(data);

  const edition = await prisma.examEdition.create({ data });
  await recordAudit({
    entityType: "EXAM_EDITION",
    entityId: edition.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: edition,
  });
  return edition;
}

export async function updateExamEdition(actor: Actor, id: string, input: ExamEditionUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamEditionUpdateInputSchema.parse(input);
  await assertRelationsExist(data);

  const existing = await prisma.examEdition.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`ExamEdition "${id}" não encontrada.`);

  const edition = await prisma.examEdition.update({ where: { id }, data });
  await recordAudit({
    entityType: "EXAM_EDITION",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: edition,
  });
  return edition;
}

export async function publishExamEdition(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);
  const existing = await prisma.examEdition.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`ExamEdition "${id}" não encontrada.`);
  if (existing.status === PublicationStatus.ARCHIVED) {
    throw new Error("ExamEdition arquivada não pode ser publicada.");
  }
  if (existing.status === PublicationStatus.PUBLISHED) {
    throw new Error("ExamEdition já está publicada.");
  }

  const edition = await prisma.examEdition.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: "EXAM_EDITION",
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: edition,
  });
  return edition;
}

export async function archiveExamEdition(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);
  const existing = await prisma.examEdition.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`ExamEdition "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const edition = await prisma.examEdition.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: "EXAM_EDITION",
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: edition,
  });
  return edition;
}

export async function getExamEdition(id: string) {
  return prisma.examEdition.findUnique({
    where: { id },
    include: { exam: true, examBoard: true, organization: true, position: true, source: true },
  });
}

export async function listExamEditions(params?: {
  examId?: string;
  year?: number;
  examBoardId?: string;
  take?: number;
  skip?: number;
}) {
  return prisma.examEdition.findMany({
    where: {
      examId: params?.examId,
      year: params?.year,
      examBoardId: params?.examBoardId,
    },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { year: "desc" },
  });
}
