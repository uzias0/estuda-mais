/**
 * Regras de publicação de `LibraryItem`/`CurrentAffair` (Módulo 7, seção
 * 21) — centralizadas aqui, mesma filosofia de `publicationPolicy.ts`
 * (Módulo 2) e `pedagogy-publication.service.ts` (Módulo 4), mas com uma
 * regra DIFERENTE das duas: nem o gate de Citation (Concept/Theory/School/
 * Discipline/Person/Lesson) nem o gate estrutural puro de "filho publicado"
 * (Track/Area/Unit/Stage) se aplicam aqui. `LibraryItem`/`CurrentAffair` têm
 * `sourceId` próprio e obrigatório (mesmo padrão de `Question`, Módulo 3) —
 * a procedência já está garantida na criação; o que falta validar na
 * publicação é que essa `Source` tem o mínimo necessário para o conteúdo
 * fazer sentido publicamente (URL/licença) e que o item não fica "órfão"
 * (sem nenhum relacionamento com a Base de Conhecimento).
 */
import { prisma } from "@/server/db";
import { FreeAccessReason, PublicationStatus } from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { ContentValidationError } from "./errors";

type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

/** Guarda de transição comum — mesmo espírito de `assertPublishStatusTransition` (Módulo 4). */
export function assertContentPublishStatusTransition(currentStatus: PublicationStatusValue): void {
  if (currentStatus === PublicationStatus.ARCHIVED) {
    throw new ContentValidationError(
      "Conteúdo arquivado não pode ser publicado diretamente — restaure primeiro.",
    );
  }
  if (currentStatus === PublicationStatus.PUBLISHED) {
    throw new ContentValidationError("Conteúdo já está publicado.");
  }
}

async function loadSourceOrThrow(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw new NotFoundError(`Source "${sourceId}" não encontrada.`);
  return source;
}

/**
 * Publicação de `LibraryItem` (seção 21): fonte válida (com URL quando
 * `isFree`, e com licença quando `freeAccessReason=OPEN_LICENSE`) +
 * relacionamento com a Base de Conhecimento (>=1 tag) — nunca publica um
 * material "gratuito" sem indicar onde/como acessá-lo, nem um item
 * completamente desconectado do conhecimento acadêmico.
 */
export async function assertLibraryItemPublishable(item: {
  id: string;
  sourceId: string;
  isFree: boolean;
  freeAccessReason: (typeof FreeAccessReason)[keyof typeof FreeAccessReason] | null;
  status: PublicationStatusValue;
}): Promise<void> {
  assertContentPublishStatusTransition(item.status);
  const source = await loadSourceOrThrow(item.sourceId);

  if (item.isFree) {
    if (!item.freeAccessReason) {
      throw new ContentValidationError(
        "Material gratuito exige freeAccessReason (procedência do acesso gratuito).",
      );
    }
    if (!source.url) {
      throw new ContentValidationError(
        "Material gratuito exige uma Source com URL de acesso oficial preenchida.",
      );
    }
    if (item.freeAccessReason === FreeAccessReason.OPEN_LICENSE && !source.license) {
      throw new ContentValidationError(
        'freeAccessReason="OPEN_LICENSE" exige Source.license preenchida.',
      );
    }
  }

  const tagCount = await prisma.libraryItemKnowledgeTag.count({
    where: { libraryItemId: item.id },
  });
  if (tagCount === 0) {
    throw new ContentValidationError(
      "Publicação exige ao menos um relacionamento com a Base de Conhecimento (conceito/teoria/escola/disciplina/pessoa/obra/período/estágio).",
    );
  }
}

/**
 * Publicação de `CurrentAffair` (seção 21): fonte válida com URL oficial +
 * relacionamento com a Base de Conhecimento (>=1 tag) — uma atualidade sem
 * URL oficial não é rastreável, e sem relacionamento não contextualiza nada.
 */
export async function assertCurrentAffairPublishable(item: {
  id: string;
  sourceId: string;
  status: PublicationStatusValue;
}): Promise<void> {
  assertContentPublishStatusTransition(item.status);
  const source = await loadSourceOrThrow(item.sourceId);

  if (!source.url) {
    throw new ContentValidationError("Atualidade exige uma Source com URL oficial preenchida.");
  }

  const tagCount = await prisma.currentAffairKnowledgeTag.count({
    where: { currentAffairId: item.id },
  });
  if (tagCount === 0) {
    throw new ContentValidationError(
      "Publicação exige ao menos um relacionamento com a Base de Conhecimento (conceito/teoria/escola/disciplina/pessoa/obra/período/estágio).",
    );
  }
}
