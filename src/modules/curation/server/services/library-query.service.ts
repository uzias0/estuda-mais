/**
 * Consultas de leitura da biblioteca (Módulo 7, seção 9/31) — nenhuma muta
 * estado. Descoberta de relação com a árvore PEDAGÓGICA é derivada em
 * tempo de consulta (`getLibraryItemPedagogicalContext`), reaproveitando
 * `getPedagogicalContextForConcepts` (Módulo 6) — nenhuma FK direta de
 * `LibraryItem` para `Track`/`Area`/`Unit`/`Stage`/`Lesson`.
 */
import { prisma } from "@/server/db";
import {
  KnowledgeEntityType,
  LibraryMaterialType,
  PublicationStatus,
} from "@/generated/prisma/enums";
import { getPedagogicalContextForConcepts } from "@/modules/pedagogy/server/services/pedagogy-query.service";

type KnowledgeEntityTypeValue = (typeof KnowledgeEntityType)[keyof typeof KnowledgeEntityType];
type LibraryMaterialTypeValue = (typeof LibraryMaterialType)[keyof typeof LibraryMaterialType];

export interface LibraryQueryParams {
  /** `false` inclui rascunhos/arquivados — só para uso de curadoria; consultas públicas nunca passam isto. */
  publishedOnly?: boolean;
  take?: number;
  skip?: number;
}

function statusFilter(params?: LibraryQueryParams) {
  return params?.publishedOnly === false ? undefined : PublicationStatus.PUBLISHED;
}

export async function listPublishedLibraryItems(params?: { take?: number; skip?: number }) {
  return prisma.libraryItem.findMany({
    where: { status: PublicationStatus.PUBLISHED },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}

/** Busca textual determinística (título/descrição/autor) — nenhum ranqueamento por IA. */
export async function searchLibrary(query: string, params?: LibraryQueryParams) {
  return prisma.libraryItem.findMany({
    where: {
      status: statusFilter(params),
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { authorName: { contains: query, mode: "insensitive" } },
      ],
    },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}

/** Livros gratuitos (Módulo 7, seção 6) — sempre `isFree=true`, cada um com `freeAccessReason` (garantido na criação/publicação). */
export async function listFreeBooks(
  params?: LibraryQueryParams & { materialType?: LibraryMaterialTypeValue },
) {
  return prisma.libraryItem.findMany({
    where: { isFree: true, status: statusFilter(params), materialType: params?.materialType },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}

async function listLibraryItemsByKnowledgeEntity(
  entityType: KnowledgeEntityTypeValue,
  entityId: string,
  params?: LibraryQueryParams,
) {
  return prisma.libraryItem.findMany({
    where: {
      knowledgeTags: { some: { entityType, entityId } },
      status: statusFilter(params),
    },
    include: { knowledgeTags: true },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { title: "asc" },
  });
}

export function listLibraryByConcept(conceptId: string, params?: LibraryQueryParams) {
  return listLibraryItemsByKnowledgeEntity(KnowledgeEntityType.CONCEPT, conceptId, params);
}
export function listLibraryByDiscipline(disciplineId: string, params?: LibraryQueryParams) {
  return listLibraryItemsByKnowledgeEntity(KnowledgeEntityType.DISCIPLINE, disciplineId, params);
}
export function listLibraryByTheory(theoryId: string, params?: LibraryQueryParams) {
  return listLibraryItemsByKnowledgeEntity(KnowledgeEntityType.THEORY, theoryId, params);
}

/** Entrada genérica para tipos de nó não cobertos pelos atalhos acima (SCHOOL/PERSON/WORK/PERIOD/DEVELOPMENTAL_STAGE). */
export function listRelatedMaterials(
  entityType: KnowledgeEntityTypeValue,
  entityId: string,
  params?: LibraryQueryParams,
) {
  return listLibraryItemsByKnowledgeEntity(entityType, entityId, params);
}

/** "Este material pertence a qual parte do curso?" (Módulo 7, seção 32) — via conceitos tagueados, nunca FK direta à árvore pedagógica. */
export async function getLibraryItemPedagogicalContext(libraryItemId: string) {
  const tags = await prisma.libraryItemKnowledgeTag.findMany({
    where: { libraryItemId, entityType: KnowledgeEntityType.CONCEPT },
    select: { entityId: true },
  });
  return getPedagogicalContextForConcepts(tags.map((t) => t.entityId));
}
