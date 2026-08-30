/**
 * `ExamBoard`, `Organization` e `Position` têm exatamente a mesma forma
 * (slug/name/status, sem relações além de `editions[]`). Uma tentativa
 * inicial de generalizar o CRUD via uma interface `Delegate` comum se
 * mostrou incompatível com os tipos estritos gerados pelo Prisma para cada
 * model (perderia a tipagem real de `data`/`status`) — então cada entidade
 * tem seu bloco explícito abaixo. Mais linhas, tipagem correta e clara
 * (Módulo 3, seção 56).
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
  ExamReferenceCreateInputSchema,
  ExamReferenceUpdateInputSchema,
  type ExamReferenceCreateInput,
  type ExamReferenceUpdateInput,
} from "@/modules/assessment/types/exam.schema";

// ============================================================================
// ExamBoard
// ============================================================================

export async function createExamBoard(actor: Actor, input: ExamReferenceCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamReferenceCreateInputSchema.parse(input);
  const board = await prisma.examBoard.create({ data });
  await recordAudit({
    entityType: "EXAM_BOARD",
    entityId: board.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: board,
  });
  return board;
}

export async function updateExamBoard(actor: Actor, id: string, input: ExamReferenceUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamReferenceUpdateInputSchema.parse(input);
  const existing = await prisma.examBoard.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`ExamBoard "${id}" não encontrada.`);
  const board = await prisma.examBoard.update({ where: { id }, data });
  await recordAudit({
    entityType: "EXAM_BOARD",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: board,
  });
  return board;
}

export async function publishExamBoard(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);
  const existing = await prisma.examBoard.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`ExamBoard "${id}" não encontrada.`);
  if (existing.status === PublicationStatus.ARCHIVED)
    throw new Error("ExamBoard arquivada não pode ser publicada.");
  if (existing.status === PublicationStatus.PUBLISHED)
    throw new Error("ExamBoard já está publicada.");
  const board = await prisma.examBoard.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: "EXAM_BOARD",
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: board,
  });
  return board;
}

export async function archiveExamBoard(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);
  const existing = await prisma.examBoard.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`ExamBoard "${id}" não encontrada.`);
  assertArchivable(existing.status);
  const board = await prisma.examBoard.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: "EXAM_BOARD",
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: board,
  });
  return board;
}

export function getExamBoard(id: string) {
  return prisma.examBoard.findUnique({ where: { id } });
}

export function listExamBoards(params?: { take?: number; skip?: number }) {
  return prisma.examBoard.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}

// ============================================================================
// Organization
// ============================================================================

export async function createOrganization(actor: Actor, input: ExamReferenceCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamReferenceCreateInputSchema.parse(input);
  const organization = await prisma.organization.create({ data });
  await recordAudit({
    entityType: "ORGANIZATION",
    entityId: organization.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: organization,
  });
  return organization;
}

export async function updateOrganization(
  actor: Actor,
  id: string,
  input: ExamReferenceUpdateInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamReferenceUpdateInputSchema.parse(input);
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Organization "${id}" não encontrada.`);
  const organization = await prisma.organization.update({ where: { id }, data });
  await recordAudit({
    entityType: "ORGANIZATION",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: organization,
  });
  return organization;
}

export async function publishOrganization(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Organization "${id}" não encontrada.`);
  if (existing.status === PublicationStatus.ARCHIVED) {
    throw new Error("Organization arquivada não pode ser publicada.");
  }
  if (existing.status === PublicationStatus.PUBLISHED)
    throw new Error("Organization já está publicada.");
  const organization = await prisma.organization.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: "ORGANIZATION",
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: organization,
  });
  return organization;
}

export async function archiveOrganization(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Organization "${id}" não encontrada.`);
  assertArchivable(existing.status);
  const organization = await prisma.organization.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: "ORGANIZATION",
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: organization,
  });
  return organization;
}

export function getOrganization(id: string) {
  return prisma.organization.findUnique({ where: { id } });
}

export function listOrganizations(params?: { take?: number; skip?: number }) {
  return prisma.organization.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}

// ============================================================================
// Position
// ============================================================================

export async function createPosition(actor: Actor, input: ExamReferenceCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamReferenceCreateInputSchema.parse(input);
  const position = await prisma.position.create({ data });
  await recordAudit({
    entityType: "POSITION",
    entityId: position.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: position,
  });
  return position;
}

export async function updatePosition(actor: Actor, id: string, input: ExamReferenceUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = ExamReferenceUpdateInputSchema.parse(input);
  const existing = await prisma.position.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Position "${id}" não encontrada.`);
  const position = await prisma.position.update({ where: { id }, data });
  await recordAudit({
    entityType: "POSITION",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: position,
  });
  return position;
}

export async function publishPosition(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);
  const existing = await prisma.position.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Position "${id}" não encontrada.`);
  if (existing.status === PublicationStatus.ARCHIVED)
    throw new Error("Position arquivada não pode ser publicada.");
  if (existing.status === PublicationStatus.PUBLISHED)
    throw new Error("Position já está publicada.");
  const position = await prisma.position.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: "POSITION",
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: position,
  });
  return position;
}

export async function archivePosition(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);
  const existing = await prisma.position.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Position "${id}" não encontrada.`);
  assertArchivable(existing.status);
  const position = await prisma.position.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: "POSITION",
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: position,
  });
  return position;
}

export function getPosition(id: string) {
  return prisma.position.findUnique({ where: { id } });
}

export function listPositions(params?: { take?: number; skip?: number }) {
  return prisma.position.findMany({
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
