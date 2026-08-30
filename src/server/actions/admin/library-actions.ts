"use server";

/**
 * Server Actions administrativas para `LibraryItem` (Módulo 12) — Módulo 7.
 * Camada fina; a regra de "gratuito exige `freeAccessReason`" e o gate de
 * publicação (fonte + URL/licença + >=1 tag de conhecimento) continuam
 * inteiramente em `library.service.ts`/`content-publication.service.ts`.
 */
import { redirect } from "next/navigation";
import { requireAdminSessionActor } from "@/server/auth/session";
import {
  createLibraryItem,
  updateLibraryItem,
  publishLibraryItem,
  archiveLibraryItem,
  restoreLibraryItem,
} from "@/modules/curation/server/services/library.service";
import {
  linkLibraryItemToKnowledge,
  unlinkLibraryItemFromKnowledge,
} from "@/modules/curation/server/services/content-linking.service";

function optionalText(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  return v ? String(v) : undefined;
}

export async function createLibraryItemAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  const item = await createLibraryItem(actor, {
    title: String(formData.get("title")),
    description: optionalText(formData, "description"),
    authorName: optionalText(formData, "authorName"),
    academicWorkId: optionalText(formData, "academicWorkId"),
    materialType: String(formData.get("materialType")) as never,
    year: formData.get("year") ? Number(formData.get("year")) : undefined,
    isFree: formData.get("isFree") === "on",
    freeAccessReason: (optionalText(formData, "freeAccessReason") as never) ?? undefined,
    sourceId: String(formData.get("sourceId")),
  });
  redirect(`/admin/library/${item.id}`);
}

export async function updateLibraryItemAction(id: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await updateLibraryItem(actor, id, {
    title: optionalText(formData, "title"),
    description: optionalText(formData, "description"),
    authorName: optionalText(formData, "authorName"),
    materialType: (optionalText(formData, "materialType") as never) ?? undefined,
    year: formData.get("year") ? Number(formData.get("year")) : undefined,
    isFree: formData.get("isFree") === "on",
    freeAccessReason: (optionalText(formData, "freeAccessReason") as never) ?? undefined,
    sourceId: optionalText(formData, "sourceId"),
  });
}

export async function publishLibraryItemAction(id: string) {
  const actor = await requireAdminSessionActor();
  await publishLibraryItem(actor, id);
}

export async function archiveLibraryItemAction(id: string) {
  const actor = await requireAdminSessionActor();
  await archiveLibraryItem(actor, id);
}

export async function restoreLibraryItemAction(id: string) {
  const actor = await requireAdminSessionActor();
  await restoreLibraryItem(actor, id);
}

export async function linkLibraryItemToKnowledgeAction(itemId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkLibraryItemToKnowledge(actor, itemId, {
    entityType: String(formData.get("entityType")) as never,
    entityId: String(formData.get("entityId")),
  });
}

export async function unlinkLibraryItemFromKnowledgeAction(
  itemId: string,
  entityType: string,
  entityId: string,
) {
  const actor = await requireAdminSessionActor();
  await unlinkLibraryItemFromKnowledge(actor, itemId, {
    entityType: entityType as never,
    entityId,
  });
}
