"use server";

/**
 * Server Actions administrativas para as entidades ricas da Base de
 * Conhecimento que não cabem no registro genérico (Módulo 12) — Concept,
 * AcademicPerson, AcademicWork, AcademicRelation — todas com relações
 * próprias além dos campos escalares. Camada fina, mesmo padrão de
 * `simple-entity-actions.ts`: resolve o `Actor` administrativo e delega
 * 100% aos serviços reais dos Módulos 1/2.
 */
import { redirect } from "next/navigation";
import { requireAdminSessionActor } from "@/server/auth/session";
import {
  createConcept,
  updateConcept,
  publishConcept,
  archiveConcept,
  linkConceptToWork,
  unlinkConceptFromWork,
  linkConceptToTag,
  unlinkConceptFromTag,
} from "@/modules/knowledge/server/services/concept.service";
import {
  createAcademicPerson,
  updateAcademicPerson,
  publishAcademicPerson,
  archiveAcademicPerson,
  linkPersonToTag,
  unlinkPersonFromTag,
} from "@/modules/knowledge/server/services/academicPerson.service";
import {
  createAcademicWork,
  updateAcademicWork,
  publishAcademicWork,
  archiveAcademicWork,
  addAuthorToWork,
  removeAuthorFromWork,
} from "@/modules/knowledge/server/services/academicWork.service";
import {
  createAcademicRelation,
  archiveAcademicRelation,
  publishAcademicRelation,
} from "@/modules/knowledge/server/services/academicRelation.service";

function textOrUndefined(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  return v ? String(v) : undefined;
}

// ---- Concept ---------------------------------------------------------------

export async function createConceptAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  const concept = await createConcept(actor, {
    slug: String(formData.get("slug")),
    name: String(formData.get("name")),
    definition: String(formData.get("definition")),
    didacticExplanation: textOrUndefined(formData, "didacticExplanation"),
    difficulty: textOrUndefined(formData, "difficulty") as never,
    developmentalStageId: textOrUndefined(formData, "developmentalStageId"),
  });
  redirect(`/admin/knowledge/concepts/${concept.id}`);
}

export async function updateConceptAction(id: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await updateConcept(actor, id, {
    name: textOrUndefined(formData, "name"),
    definition: textOrUndefined(formData, "definition"),
    didacticExplanation: textOrUndefined(formData, "didacticExplanation"),
    difficulty: textOrUndefined(formData, "difficulty") as never,
    developmentalStageId: textOrUndefined(formData, "developmentalStageId"),
  });
}

export async function publishConceptAction(id: string) {
  const actor = await requireAdminSessionActor();
  await publishConcept(actor, id);
}

export async function archiveConceptAction(id: string) {
  const actor = await requireAdminSessionActor();
  await archiveConcept(actor, id);
}

export async function linkConceptToWorkAction(conceptId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkConceptToWork(actor, conceptId, String(formData.get("workId")));
}

export async function unlinkConceptFromWorkAction(conceptId: string, workId: string) {
  const actor = await requireAdminSessionActor();
  await unlinkConceptFromWork(actor, conceptId, workId);
}

export async function linkConceptToTagAction(conceptId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkConceptToTag(actor, conceptId, String(formData.get("tagId")));
}

export async function unlinkConceptFromTagAction(conceptId: string, tagId: string) {
  const actor = await requireAdminSessionActor();
  await unlinkConceptFromTag(actor, conceptId, tagId);
}

// ---- AcademicPerson ---------------------------------------------------------

export async function createPersonAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  const person = await createAcademicPerson(actor, {
    slug: String(formData.get("slug")),
    name: String(formData.get("name")),
    fullName: textOrUndefined(formData, "fullName"),
    bio: textOrUndefined(formData, "bio"),
    periodId: textOrUndefined(formData, "periodId"),
    countryContext: textOrUndefined(formData, "countryContext"),
  });
  redirect(`/admin/knowledge/people/${person.id}`);
}

export async function updatePersonAction(id: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await updateAcademicPerson(actor, id, {
    name: textOrUndefined(formData, "name"),
    fullName: textOrUndefined(formData, "fullName"),
    bio: textOrUndefined(formData, "bio"),
    periodId: textOrUndefined(formData, "periodId"),
    countryContext: textOrUndefined(formData, "countryContext"),
  });
}

export async function publishPersonAction(id: string) {
  const actor = await requireAdminSessionActor();
  await publishAcademicPerson(actor, id);
}

export async function archivePersonAction(id: string) {
  const actor = await requireAdminSessionActor();
  await archiveAcademicPerson(actor, id);
}

export async function linkPersonToTagAction(personId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await linkPersonToTag(actor, personId, String(formData.get("tagId")));
}

export async function unlinkPersonFromTagAction(personId: string, tagId: string) {
  const actor = await requireAdminSessionActor();
  await unlinkPersonFromTag(actor, personId, tagId);
}

// ---- AcademicWork ------------------------------------------------------------

export async function createWorkAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  const work = await createAcademicWork(actor, {
    title: String(formData.get("title")),
    subtitle: textOrUndefined(formData, "subtitle"),
    year: formData.get("year") ? Number(formData.get("year")) : undefined,
    type: String(formData.get("type")) as never,
    sourceId: textOrUndefined(formData, "sourceId"),
  });
  redirect(`/admin/knowledge/works/${work.id}`);
}

export async function updateWorkAction(id: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await updateAcademicWork(actor, id, {
    title: textOrUndefined(formData, "title"),
    subtitle: textOrUndefined(formData, "subtitle"),
    year: formData.get("year") ? Number(formData.get("year")) : undefined,
    sourceId: textOrUndefined(formData, "sourceId"),
  });
}

export async function publishWorkAction(id: string) {
  const actor = await requireAdminSessionActor();
  await publishAcademicWork(actor, id);
}

export async function archiveWorkAction(id: string) {
  const actor = await requireAdminSessionActor();
  await archiveAcademicWork(actor, id);
}

export async function addAuthorToWorkAction(workId: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await addAuthorToWork(actor, {
    workId,
    personId: String(formData.get("personId")),
    role: (textOrUndefined(formData, "role") as never) ?? undefined,
  });
}

export async function removeAuthorFromWorkAction(workId: string, personId: string) {
  const actor = await requireAdminSessionActor();
  await removeAuthorFromWork(actor, personId, workId);
}

// ---- AcademicRelation --------------------------------------------------------

export async function createAcademicRelationAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  await createAcademicRelation(actor, {
    sourceType: String(formData.get("sourceType")) as never,
    sourceId: String(formData.get("sourceId")),
    relationType: String(formData.get("relationType")) as never,
    targetType: String(formData.get("targetType")) as never,
    targetId: String(formData.get("targetId")),
    description: textOrUndefined(formData, "description"),
    citationId: textOrUndefined(formData, "citationId"),
  });
}

export async function publishAcademicRelationAction(id: string) {
  const actor = await requireAdminSessionActor();
  await publishAcademicRelation(actor, id);
}

export async function archiveAcademicRelationAction(id: string) {
  const actor = await requireAdminSessionActor();
  await archiveAcademicRelation(actor, id);
}
