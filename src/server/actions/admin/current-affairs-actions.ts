"use server";

/**
 * Server Actions administrativas para `CurrentAffair` (Módulo 12) — Módulo 7.
 * `eventDate` é sempre a data do acontecimento (nunca `createdAt`) — o
 * formulário só coleta essa data explicitamente, nunca a infere.
 */
import { redirect } from "next/navigation";
import { requireAdminSessionActor } from "@/server/auth/session";
import {
  createCurrentAffair,
  updateCurrentAffair,
  publishCurrentAffair,
  archiveCurrentAffair,
  restoreCurrentAffair,
} from "@/modules/curation/server/services/current-affairs.service";
import {
  linkCurrentAffairToKnowledge,
  unlinkCurrentAffairFromKnowledge,
  linkCurrentAffairToTag,
  unlinkCurrentAffairFromTag,
} from "@/modules/curation/server/services/content-linking.service";

function optionalText(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  return v ? String(v) : undefined;
}

export async function createCurrentAffairAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  const affair = await createCurrentAffair(actor, {
    title: String(formData.get("title")),
    summary: String(formData.get("summary")),
    educationalContent: optionalText(formData, "educationalContent"),
    eventDate: String(formData.get("eventDate")) as never,
    relevance: (optionalText(formData, "relevance") as never) ?? undefined,
    sourceId: String(formData.get("sourceId")),
  });
  redirect(`/admin/current-affairs/${affair.id}`);
}

export async function updateCurrentAffairAction(id: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await updateCurrentAffair(actor, id, {
    title: optionalText(formData, "title"),
    summary: optionalText(formData, "summary"),
    educationalContent: optionalText(formData, "educationalContent"),
    eventDate: (optionalText(formData, "eventDate") as never) ?? undefined,
    relevance: (optionalText(formData, "relevance") as never) ?? undefined,
    sourceId: optionalText(formData, "sourceId"),
  });
}

export async function publishCurrentAffairAction(id: string) {
  const actor = await requireAdminSessionActor();
  await publishCurrentAffair(actor, id);
}

export async function archiveCurrentAffairAction(id: string) {
  const actor = await requireAdminSessionActor();
  await archiveCurrentAffair(actor, id);
}

export async function restoreCurrentAffairAction(id: string) {
  const actor = await requireAdminSessionActor();
  await restoreCurrentAffair(actor, id);
}

export async function linkCurrentAffairToKnowledgeAction(affairId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkCurrentAffairToKnowledge(actor, affairId, {
    entityType: String(formData.get("entityType")) as never,
    entityId: String(formData.get("entityId")),
  });
}

export async function unlinkCurrentAffairFromKnowledgeAction(
  affairId: string,
  entityType: string,
  entityId: string,
) {
  const actor = await requireAdminSessionActor();
  await unlinkCurrentAffairFromKnowledge(actor, affairId, {
    entityType: entityType as never,
    entityId,
  });
}

export async function linkCurrentAffairToTagAction(affairId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkCurrentAffairToTag(actor, affairId, String(formData.get("tagId")));
}

export async function unlinkCurrentAffairFromTagAction(affairId: string, tagId: string) {
  const actor = await requireAdminSessionActor();
  await unlinkCurrentAffairFromTag(actor, affairId, tagId);
}
