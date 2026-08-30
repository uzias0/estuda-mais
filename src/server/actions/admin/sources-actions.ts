"use server";

/**
 * Server Actions administrativas para Fontes/Procedência (Módulo 12) —
 * `Source`, `Citation`, `LegalReference` (Módulo 2). Camada fina, mesmo
 * padrão dos demais arquivos de `src/server/actions/admin/`.
 */
import { redirect } from "next/navigation";
import { requireAdminSessionActor } from "@/server/auth/session";
import { createSource, updateSource } from "@/modules/curation/server/services/source.service";
import {
  createCitation,
  updateCitationNote,
} from "@/modules/curation/server/services/citation.service";
import {
  createLegalReference,
  updateLegalReference,
} from "@/modules/curation/server/services/legalReference.service";

function textOrUndefined(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  return v ? String(v) : undefined;
}

export async function createSourceAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  const source = await createSource(actor, {
    name: String(formData.get("name")),
    sourceType: String(formData.get("sourceType")) as never,
    classification: textOrUndefined(formData, "classification") as never,
    author: textOrUndefined(formData, "author"),
    institution: textOrUndefined(formData, "institution"),
    url: textOrUndefined(formData, "url"),
    license: textOrUndefined(formData, "license"),
    rightsNote: textOrUndefined(formData, "rightsNote"),
  });
  redirect(`/admin/sources/${source.id}`);
}

export async function updateSourceAction(id: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await updateSource(actor, id, {
    name: textOrUndefined(formData, "name"),
    author: textOrUndefined(formData, "author"),
    institution: textOrUndefined(formData, "institution"),
    url: textOrUndefined(formData, "url"),
    license: textOrUndefined(formData, "license"),
    rightsNote: textOrUndefined(formData, "rightsNote"),
  });
}

export async function createCitationAction(
  entityType: string,
  entityId: string,
  redirectPath: string,
  formData: FormData,
) {
  const actor = await requireAdminSessionActor();
  await createCitation(actor, {
    entityType: entityType as never,
    entityId,
    sourceId: String(formData.get("sourceId")),
    note: textOrUndefined(formData, "note"),
  });
}

export async function updateCitationNoteAction(
  id: string,
  redirectPath: string,
  formData: FormData,
) {
  const actor = await requireAdminSessionActor();
  await updateCitationNote(actor, id, { note: textOrUndefined(formData, "note") ?? null });
}

export async function createLegalReferenceAction(sourceId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await createLegalReference(actor, {
    sourceId,
    jurisdiction: textOrUndefined(formData, "jurisdiction"),
    legalStatus: (textOrUndefined(formData, "legalStatus") as never) ?? undefined,
  });
}

export async function updateLegalReferenceAction(sourceId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await updateLegalReference(actor, sourceId, {
    jurisdiction: textOrUndefined(formData, "jurisdiction"),
    legalStatus: (textOrUndefined(formData, "legalStatus") as never) ?? undefined,
  });
}
