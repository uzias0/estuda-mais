/**
 * Regra de publicação centralizada (docs/RELATORIO_REVISAO_V3.md, seção 6 —
 * "política definitiva de procedência/citação"; Módulo 2, seções 7 e 9).
 *
 * Para AcademicPerson, Theory, Concept, School e Discipline: publicar exige
 * pelo menos uma `Citation` associada. A regra fica AQUI, não espalhada nos
 * serviços de cada entidade nem em componentes de UI — cada serviço só
 * chama `assertPublishable`.
 */
import { prisma } from "@/server/db";
import type { CitationEntityType } from "@/generated/prisma/enums";
import { PublicationStatus } from "@/generated/prisma/enums";

export type CitationEntityTypeValue = (typeof CitationEntityType)[keyof typeof CitationEntityType];
type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

export class PublicationPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationPolicyError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** `true` se existir ao menos uma `Citation` apontando para `entityType`+`entityId`. */
export async function hasCitation(
  entityType: CitationEntityTypeValue,
  entityId: string,
): Promise<boolean> {
  const count = await prisma.citation.count({ where: { entityType, entityId } });
  return count > 0;
}

/**
 * Guarda central de publicação: lança se a entidade já estiver arquivada,
 * já estiver publicada (transição redundante — publicar de novo não deve
 * "passar em silêncio"), ou não possuir citação.
 */
export async function assertPublishable(
  entityType: CitationEntityTypeValue,
  entityId: string,
  currentStatus: PublicationStatusValue,
): Promise<void> {
  if (currentStatus === PublicationStatus.ARCHIVED) {
    throw new PublicationPolicyError("Entidade arquivada não pode ser publicada.");
  }
  if (currentStatus === PublicationStatus.PUBLISHED) {
    throw new PublicationPolicyError("Entidade já está publicada.");
  }
  if (!(await hasCitation(entityType, entityId))) {
    throw new PublicationPolicyError(
      "Publicação requer ao menos uma Citation associada (procedência obrigatória).",
    );
  }
}

/** Guarda de arquivamento: idempotência simples — não "arquiva" o que já está arquivado. */
export function assertArchivable(currentStatus: PublicationStatusValue): void {
  if (currentStatus === PublicationStatus.ARCHIVED) {
    throw new PublicationPolicyError("Entidade já está arquivada.");
  }
}
