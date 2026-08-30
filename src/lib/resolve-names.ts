/**
 * Pequena função de integração para exibição (Módulo 11, seção 1.6) —
 * várias telas recebem só `conceptId`/`disciplineId` dos serviços de
 * domínio (de propósito: eles não duplicam nome de conceito/disciplina) e
 * precisam do NOME para mostrar ao aluno. Só resolve nomes reais via os
 * `getX` já existentes — nunca inventa um rótulo.
 */
import { getConcept } from "@/modules/knowledge/server/services/concept.service";
import { getDiscipline } from "@/modules/knowledge/server/services/discipline.service";
import { resolveEntity } from "@/modules/knowledge/server/services/resolveEntity";

export async function resolveConceptNames(conceptIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(conceptIds)];
  const concepts = await Promise.all(unique.map((id) => getConcept(id)));
  const map = new Map<string, string>();
  concepts.forEach((concept, index) => {
    if (concept) map.set(unique[index], concept.name);
  });
  return map;
}

/**
 * Rótulo genérico de um nó do grafo de conhecimento (Módulo 2), qualquer
 * `KnowledgeEntityType` — usa `resolveEntity` (já existente) e lê `name`
 * (a maioria dos nós) ou `title` (`AcademicWork`, que não tem `name`).
 */
export async function resolveKnowledgeEntityLabel(
  entityType: string,
  entityId: string,
): Promise<string> {
  const entity = await resolveEntity(entityType, entityId);
  if (!entity) return entityId;
  if ("name" in entity && typeof entity.name === "string") return entity.name;
  if ("title" in entity && typeof entity.title === "string") return entity.title;
  return entityId;
}

export async function resolveDisciplineNames(
  disciplineIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(disciplineIds)];
  const disciplines = await Promise.all(unique.map((id) => getDiscipline(id)));
  const map = new Map<string, string>();
  disciplines.forEach((discipline, index) => {
    if (discipline) map.set(unique[index], discipline.name);
  });
  return map;
}
