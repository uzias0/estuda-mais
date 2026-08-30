/**
 * Serviço de domínio para `Track` — trilha curatorial de topo do Núcleo
 * Pedagógico (Módulo 4). `Track` não é dona de conhecimento acadêmico, só
 * organiza `LearningArea`s numa ordem pedagógica via `TrackArea` (N:N).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  assertPublishStatusTransition,
  assertTrackPublishable,
  NotFoundError,
} from "./pedagogy-publication.service";
import { assertValidReorder } from "./reorder";
import { AuditableEntityType, PublicationStatus, StudyMode } from "@/generated/prisma/enums";
import {
  TrackCreateInputSchema,
  TrackUpdateInputSchema,
  TrackAreaLinkInputSchema,
  type TrackCreateInput,
  type TrackUpdateInput,
  type TrackAreaLinkInput,
} from "@/modules/pedagogy/types/track.schema";

type StudyModeValue = (typeof StudyMode)[keyof typeof StudyMode];
type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

export async function createTrack(actor: Actor, input: TrackCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = TrackCreateInputSchema.parse(input);

  const track = await prisma.track.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.TRACK,
    entityId: track.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: track,
  });
  return track;
}

export async function updateTrack(actor: Actor, id: string, input: TrackUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = TrackUpdateInputSchema.parse(input);

  const existing = await prisma.track.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Track "${id}" não encontrada.`);

  const track = await prisma.track.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.TRACK,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: track,
  });
  return track;
}

export async function publishTrack(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.track.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Track "${id}" não encontrada.`);
  assertPublishStatusTransition(existing.status);
  await assertTrackPublishable(id);

  const track = await prisma.track.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.TRACK,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: track,
  });
  return track;
}

export async function archiveTrack(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.track.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Track "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const track = await prisma.track.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.TRACK,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: track,
  });
  return track;
}

/** Vincula uma `LearningArea` a uma `Track` (`TrackArea`) — idempotente via upsert (repetir o link só reposiciona). */
export async function linkTrackToArea(actor: Actor, trackId: string, input: TrackAreaLinkInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = TrackAreaLinkInputSchema.parse(input);

  const [track, area] = await Promise.all([
    prisma.track.findUnique({ where: { id: trackId } }),
    prisma.learningArea.findUnique({ where: { id: data.areaId } }),
  ]);
  if (!track) throw new NotFoundError(`Track "${trackId}" não encontrada.`);
  if (!area) throw new NotFoundError(`LearningArea "${data.areaId}" não encontrada.`);

  const order = data.order ?? (await prisma.trackArea.count({ where: { trackId } }));
  const link = await prisma.trackArea.upsert({
    where: { trackId_areaId: { trackId, areaId: data.areaId } },
    create: { trackId, areaId: data.areaId, order },
    update: { order },
  });
  await recordAudit({
    entityType: AuditableEntityType.TRACK,
    entityId: trackId,
    action: AUDIT_ACTIONS.LINK,
    actorUserId: actor.userId,
    snapshot: link,
  });
  return link;
}

export async function unlinkTrackFromArea(actor: Actor, trackId: string, areaId: string) {
  assertRole(actor, CURATOR_ROLES);
  await prisma.trackArea.delete({ where: { trackId_areaId: { trackId, areaId } } });
  await recordAudit({
    entityType: AuditableEntityType.TRACK,
    entityId: trackId,
    action: AUDIT_ACTIONS.UNLINK,
    actorUserId: actor.userId,
    snapshot: { unlinkedAreaId: areaId },
  });
}

/** Reordenação segura (Módulo 4, capacidade 11) — ver `reorder.ts`. */
export async function reorderTrackAreas(actor: Actor, trackId: string, orderedAreaIds: string[]) {
  assertRole(actor, CURATOR_ROLES);

  const current = await prisma.trackArea.findMany({ where: { trackId }, select: { areaId: true } });
  assertValidReorder(
    current.map((c) => c.areaId),
    orderedAreaIds,
  );

  await prisma.$transaction(
    orderedAreaIds.map((areaId, index) =>
      prisma.trackArea.update({
        where: { trackId_areaId: { trackId, areaId } },
        data: { order: index },
      }),
    ),
  );
  await recordAudit({
    entityType: AuditableEntityType.TRACK,
    entityId: trackId,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: { reorderedAreaIds: orderedAreaIds },
  });
}

export async function getTrack(id: string) {
  return prisma.track.findUnique({
    where: { id },
    include: { areas: { orderBy: { order: "asc" }, include: { area: true } } },
  });
}

export async function listTracks(params?: {
  mode?: StudyModeValue;
  status?: PublicationStatusValue;
  take?: number;
  skip?: number;
}) {
  return prisma.track.findMany({
    where: { mode: params?.mode, status: params?.status },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { name: "asc" },
  });
}
