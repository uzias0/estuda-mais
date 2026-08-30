"use server";

/**
 * Server Actions genéricas para as 14 entidades administrativas "simples"
 * registradas em `src/config/admin-simple-entities.ts` (Módulo 12). Camada
 * FINA: resolve o `Actor` administrativo e despacha para a função de
 * serviço real da entidade — a mesma disciplina de `lesson-actions.ts`
 * (Módulo 11), só que dirigida por config em vez de uma função por
 * entidade (evita 14 arquivos quase idênticos).
 *
 * `entityKey` chega da URL/formulário (controlada pela própria página, não
 * um valor livre digitado pelo usuário) — mas mesmo assim é validado contra
 * o registro (`getSimpleEntityConfig` lança se desconhecido) antes de
 * qualquer coisa acontecer; nenhum `entityKey` inventado chega a chamar
 * serviço nenhum.
 */
import { redirect } from "next/navigation";
import { requireAdminSessionActor } from "@/server/auth/session";
import { getSimpleEntityConfig, type SimpleFieldConfig } from "@/config/admin-simple-entities";

/**
 * Converte o `FormData` do formulário genérico num objeto de entrada, usando
 * só os campos declarados em `config.fields` (+ `slug` no create, quando
 * aplicável). Não valida NADA aqui — a validação de forma (Zod) é sempre
 * responsabilidade do `create`/`update` real do serviço de domínio; esta
 * função só traduz string→tipo primitivo (texto/número) para o formato que
 * esses serviços esperam antes de fazer o `.parse()` interno deles.
 */
function buildInputFromFormData(
  fields: SimpleFieldConfig[],
  formData: FormData,
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(field.name);
    if (raw === null || raw === "") continue;
    if (field.type === "number") {
      const num = Number(raw);
      if (!Number.isNaN(num)) input[field.name] = num;
    } else {
      input[field.name] = String(raw);
    }
  }
  return input;
}

export async function createSimpleEntityAction(entityKey: string, formData: FormData) {
  const config = getSimpleEntityConfig(entityKey);
  const actor = await requireAdminSessionActor();
  const input = buildInputFromFormData(config.fields, formData);
  if (config.hasSlug) {
    const slug = formData.get("slug");
    if (slug) input.slug = String(slug);
  }
  const created = await config.service.create(actor, input);
  redirect(`${config.basePath}/${created.id}`);
}

export async function updateSimpleEntityAction(entityKey: string, id: string, formData: FormData) {
  const config = getSimpleEntityConfig(entityKey);
  const actor = await requireAdminSessionActor();
  const input = buildInputFromFormData(config.fields, formData);
  await config.service.update(actor, id, input);
}

export async function publishSimpleEntityAction(entityKey: string, id: string) {
  const config = getSimpleEntityConfig(entityKey);
  if (!config.service.publish) {
    throw new Error(`"${config.label}" não possui publicação.`);
  }
  const actor = await requireAdminSessionActor();
  await config.service.publish(actor, id);
}

export async function archiveSimpleEntityAction(entityKey: string, id: string) {
  const config = getSimpleEntityConfig(entityKey);
  if (!config.service.archive) {
    throw new Error(`"${config.label}" não possui arquivamento.`);
  }
  const actor = await requireAdminSessionActor();
  await config.service.archive(actor, id);
}
