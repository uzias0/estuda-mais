/**
 * Serviço de domínio para `Exam` — categoria de avaliação (Vestibular, ENADE,
 * Concurso, Simulado Autoral...). Sem gate de Citation na publicação — mesma
 * lógica de `AcademicWork`/`Question` (Módulo 3, seção 11): a transição fica
 * centralizada e auditada, mas a procedência de uma prova vive em
 * `ExamEdition.sourceId`, não aqui.
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
  ExamCreateInputSchema,
  ExamUpdateInputSchema,
  type ExamCreateInput,
  type ExamUpdateInput,
} from "@/modules/assessment/types/exam.schema";

export async function createExam(actor: Actor, input: ExamCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamCreateInputSchema.parse(input);

  const exam = await prisma.exam.create({ data });
  await recordAudit({
    entityType: "EXAM",
    entityId: exam.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: exam,
  });
  return exam;
}

export async function updateExam(actor: Actor, id: string, input: ExamUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamUpdateInputSchema.parse(input);

  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Exam "${id}" não encontrado.`);

  const exam = await prisma.exam.update({ where: { id }, data });
  await recordAudit({
    entityType: "EXAM",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: exam,
  });
  return exam;
}

export async function publishExam(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);
  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Exam "${id}" não encontrado.`);
  if (existing.status === PublicationStatus.ARCHIVED)
    throw new Error("Exam arquivado não pode ser publicado.");
  if (existing.status === PublicationStatus.PUBLISHED) throw new Error("Exam já está publicado.");

  const exam = await prisma.exam.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: "EXAM",
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: exam,
  });
  return exam;
}

export async function archiveExam(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);
  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Exam "${id}" não encontrado.`);
  assertArchivable(existing.status);

  const exam = await prisma.exam.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: "EXAM",
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: exam,
  });
  return exam;
}

export async function getExam(id: string) {
  return prisma.exam.findUnique({ where: { id }, include: { editions: true } });
}

export async function listExams(params?: { take?: number; skip?: number }) {
  return prisma.exam.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
