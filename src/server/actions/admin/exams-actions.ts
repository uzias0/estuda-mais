"use server";

/**
 * Server Actions administrativas para `ExamEdition` (Módulo 12) — a única
 * entidade da Base de Avaliações fora do registro genérico
 * (`admin-simple-entities.ts`), porque tem múltiplas FKs opcionais
 * (Exam/ExamBoard/Organization/Position/Source) que o formulário genérico
 * não modela. Camada fina sobre `examEdition.service.ts` (Módulo 3).
 */
import { redirect } from "next/navigation";
import { requireAdminSessionActor } from "@/server/auth/session";
import {
  createExamEdition,
  updateExamEdition,
  publishExamEdition,
  archiveExamEdition,
} from "@/modules/assessment/server/services/examEdition.service";

function optionalText(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  return v ? String(v) : undefined;
}

export async function createExamEditionAction(formData: FormData) {
  const actor = await requireAdminSessionActor();
  const edition = await createExamEdition(actor, {
    examId: String(formData.get("examId")),
    name: String(formData.get("name")),
    year: Number(formData.get("year")),
    examBoardId: optionalText(formData, "examBoardId"),
    organizationId: optionalText(formData, "organizationId"),
    positionId: optionalText(formData, "positionId"),
    sourceId: optionalText(formData, "sourceId"),
  });
  redirect(`/admin/exams/editions/${edition.id}`);
}

export async function updateExamEditionAction(id: string, formData: FormData) {
  const actor = await requireAdminSessionActor();
  await updateExamEdition(actor, id, {
    name: optionalText(formData, "name"),
    year: formData.get("year") ? Number(formData.get("year")) : undefined,
    examBoardId: optionalText(formData, "examBoardId"),
    organizationId: optionalText(formData, "organizationId"),
    positionId: optionalText(formData, "positionId"),
    sourceId: optionalText(formData, "sourceId"),
  });
}

export async function publishExamEditionAction(id: string) {
  const actor = await requireAdminSessionActor();
  await publishExamEdition(actor, id);
}

export async function archiveExamEditionAction(id: string) {
  const actor = await requireAdminSessionActor();
  await archiveExamEdition(actor, id);
}
