/**
 * Regras de publicação/arquivamento do Núcleo Pedagógico (Módulo 4,
 * capacidades 15/16/17 — "publicação controlada", "arquivamento controlado",
 * "validação estrutural"). Centralizada aqui, não espalhada pelos serviços
 * de cada entidade — mesma filosofia de `curation/server/services/
 * publicationPolicy.ts` (Módulo 2), mas com uma regra DIFERENTE:
 *
 * `Track`/`LearningArea`/`Unit`/`Stage` NÃO estão em `CitationEntityType`
 * (nunca estiveram, mesmo na v2 do schema) — são curadoria pedagógica, não
 * conteúdo acadêmico citável; sua "procedência" vem do que referenciam
 * (Concept/Theory/School/Discipline via a Unit, Question via LessonBlock),
 * não de uma Citation própria. O gate aqui é ESTRUTURAL: um container só
 * pode ser publicado se tiver ao menos um filho já PUBLICADO — evita expor
 * ao aluno uma trilha/área/unidade/etapa vazia ou que só aponta para
 * rascunho. Isso também força o fluxo bottom-up natural: publica-se Lesson
 * antes de Stage, Stage antes de Unit, Unit antes de LearningArea, e
 * LearningArea antes de Track.
 *
 * `Lesson`, ao contrário, JÁ estava em `CitationEntityType` desde o Módulo 1
 * (o enum antecipava este módulo) — publicar uma Lesson reaproveita o MESMO
 * gate de procedência do Módulo 2 (`assertPublishable`, exige >=1 Citation),
 * mais uma checagem estrutural própria (>=1 `LessonBlock` — não publica
 * lição sem conteúdo).
 */
import { prisma } from "@/server/db";
import { CitationEntityType, PublicationStatus } from "@/generated/prisma/enums";
import { assertPublishable } from "@/modules/curation/server/services/publicationPolicy";
import { PedagogyValidationError } from "./errors";

type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

export {
  assertArchivable,
  NotFoundError,
} from "@/modules/curation/server/services/publicationPolicy";

/**
 * Guarda de transição comum a Track/LearningArea/Unit/Stage — equivalente à
 * primeira metade de `assertPublishable`, sem o gate de Citation (que não se
 * aplica a essas 4 entidades).
 */
export function assertPublishStatusTransition(currentStatus: PublicationStatusValue): void {
  if (currentStatus === PublicationStatus.ARCHIVED) {
    throw new PedagogyValidationError("Entidade arquivada não pode ser publicada.");
  }
  if (currentStatus === PublicationStatus.PUBLISHED) {
    throw new PedagogyValidationError("Entidade já está publicada.");
  }
}

export async function assertStagePublishable(stageId: string): Promise<void> {
  const publishedLessonCount = await prisma.stageLesson.count({
    where: { stageId, lesson: { status: PublicationStatus.PUBLISHED } },
  });
  if (publishedLessonCount === 0) {
    throw new PedagogyValidationError(
      "Stage só pode ser publicada com ao menos uma Lesson publicada vinculada.",
    );
  }
}

export async function assertUnitPublishable(unitId: string): Promise<void> {
  const publishedStageCount = await prisma.unitStage.count({
    where: { unitId, stage: { status: PublicationStatus.PUBLISHED } },
  });
  if (publishedStageCount === 0) {
    throw new PedagogyValidationError(
      "Unit só pode ser publicada com ao menos uma Stage publicada vinculada.",
    );
  }
}

export async function assertLearningAreaPublishable(areaId: string): Promise<void> {
  const publishedUnitCount = await prisma.areaUnit.count({
    where: { areaId, unit: { status: PublicationStatus.PUBLISHED } },
  });
  if (publishedUnitCount === 0) {
    throw new PedagogyValidationError(
      "LearningArea só pode ser publicada com ao menos uma Unit publicada vinculada.",
    );
  }
}

export async function assertTrackPublishable(trackId: string): Promise<void> {
  const publishedAreaCount = await prisma.trackArea.count({
    where: { trackId, area: { status: PublicationStatus.PUBLISHED } },
  });
  if (publishedAreaCount === 0) {
    throw new PedagogyValidationError(
      "Track só pode ser publicada com ao menos uma LearningArea publicada vinculada.",
    );
  }
}

export async function assertLessonPublishable(
  lessonId: string,
  currentStatus: PublicationStatusValue,
): Promise<void> {
  await assertPublishable(CitationEntityType.LESSON, lessonId, currentStatus);

  const blockCount = await prisma.lessonBlock.count({ where: { lessonId } });
  if (blockCount === 0) {
    throw new PedagogyValidationError("Lesson só pode ser publicada com ao menos um LessonBlock.");
  }
}
