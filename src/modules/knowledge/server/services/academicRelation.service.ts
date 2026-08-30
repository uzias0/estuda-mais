/**
 * Serviço de domínio para `AcademicRelation` — o grafo de conhecimento
 * genérico (Módulo 2, seção 11/12). `sourceId`/`targetId` são polimórficos,
 * sem FK nativa — toda escrita passa por `resolveEntity()`/`entityExists()`
 * do Módulo 1 (reaproveitado, não duplicado). `relationType` é validado
 * pela allow-list existente (`src/config/relation-types.ts`), sem virar
 * enum de banco.
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  NotFoundError,
  PublicationPolicyError,
} from "@/modules/curation/server/services/publicationPolicy";
import {
  AuditableEntityType,
  CitationEntityType,
  KnowledgeEntityType,
  PublicationStatus,
} from "@/generated/prisma/enums";
import { assertValidRelationType } from "@/config/relation-types";
import {
  resolveEntity,
  type ResolvedKnowledgeEntity,
} from "@/modules/knowledge/server/services/resolveEntity";
import {
  AcademicRelationCreateInputSchema,
  AcademicRelationUpdateInputSchema,
  type AcademicRelationCreateInput,
  type AcademicRelationUpdateInput,
} from "@/modules/knowledge/types/academic-relation.schema";

type KnowledgeEntityTypeValue = (typeof KnowledgeEntityType)[keyof typeof KnowledgeEntityType];

/** Tipos de nó que NÃO têm `status`/curadoria própria — sempre tratados como "aprovados". */
const NODE_TYPES_WITHOUT_STATUS = new Set<string>([
  KnowledgeEntityType.PERIOD,
  KnowledgeEntityType.DEVELOPMENTAL_STAGE,
]);

const APPROVED_OR_BETTER = new Set<string>([
  PublicationStatus.APPROVED,
  PublicationStatus.PUBLISHED,
]);

async function assertNodeExists(type: string, id: string, label: "source" | "target") {
  const entity = await resolveEntity(type, id);
  if (!entity) {
    throw new NotFoundError(`Entidade ${label} ${type}("${id}") não encontrada.`);
  }
  return entity;
}

/** `true` se o nó não tiver curadoria (sempre aprovado) ou estiver em status >= APPROVED. */
function isNodeApproved(type: string, entity: ResolvedKnowledgeEntity): boolean {
  if (NODE_TYPES_WITHOUT_STATUS.has(type)) return true;
  const status = "status" in entity ? entity.status : undefined;
  return !!status && APPROVED_OR_BETTER.has(status);
}

export async function createAcademicRelation(actor: Actor, input: AcademicRelationCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = AcademicRelationCreateInputSchema.parse(input);
  assertValidRelationType(data.relationType);

  await assertNodeExists(data.sourceType, data.sourceId, "source");
  await assertNodeExists(data.targetType, data.targetId, "target");

  if (data.citationId) {
    const citation = await prisma.citation.findUnique({ where: { id: data.citationId } });
    if (!citation) throw new NotFoundError(`Citation "${data.citationId}" não encontrada.`);
  }

  const existingDuplicate = await prisma.academicRelation.findUnique({
    where: {
      uniqRelationEdge: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        relationType: data.relationType,
        targetType: data.targetType,
        targetId: data.targetId,
      },
    },
  });
  if (existingDuplicate) {
    throw new PublicationPolicyError(
      "Esta relação (mesma origem, tipo e destino) já existe — não é permitido duplicar a mesma aresta.",
    );
  }

  const relation = await prisma.academicRelation.create({ data });
  await recordAudit({
    entityType: AuditableEntityType.ACADEMIC_RELATION,
    entityId: relation.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: relation,
  });
  return relation;
}

export async function updateAcademicRelation(
  actor: Actor,
  id: string,
  input: AcademicRelationUpdateInput,
) {
  assertRole(actor, CURATOR_ROLES);
  const data = AcademicRelationUpdateInputSchema.parse(input);

  const existing = await prisma.academicRelation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`AcademicRelation "${id}" não encontrada.`);

  if (data.citationId) {
    const citation = await prisma.citation.findUnique({ where: { id: data.citationId } });
    if (!citation) throw new NotFoundError(`Citation "${data.citationId}" não encontrada.`);
  }

  const relation = await prisma.academicRelation.update({ where: { id }, data });
  await recordAudit({
    entityType: AuditableEntityType.ACADEMIC_RELATION,
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: relation,
  });
  return relation;
}

export async function archiveAcademicRelation(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.academicRelation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`AcademicRelation "${id}" não encontrada.`);
  assertArchivable(existing.status);

  const relation = await prisma.academicRelation.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.ACADEMIC_RELATION,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: relation,
  });
  return relation;
}

/**
 * Publica uma AcademicRelation — regra própria (Módulo 2, seção 11/docs/
 * RELATORIO_REVISAO_V3.md seção 5): exige (1) evidência — `citationId` OU
 * uma `Citation` com `entityType=ACADEMIC_RELATION,entityId=<esta relação>`
 * — e (2) que os nós de origem e destino existam e estejam aprovados
 * (status >= APPROVED, quando aplicável).
 */
export async function publishAcademicRelation(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.academicRelation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`AcademicRelation "${id}" não encontrada.`);
  if (existing.status === PublicationStatus.ARCHIVED) {
    throw new PublicationPolicyError("Relação arquivada não pode ser publicada.");
  }
  if (existing.status === PublicationStatus.PUBLISHED) {
    throw new PublicationPolicyError("Relação já está publicada.");
  }

  let hasEvidence = !!existing.citationId;
  if (!hasEvidence) {
    const citationCount = await prisma.citation.count({
      where: { entityType: CitationEntityType.ACADEMIC_RELATION, entityId: id },
    });
    hasEvidence = citationCount > 0;
  }
  if (!hasEvidence) {
    throw new PublicationPolicyError(
      "Publicação requer evidência: citationId preenchido ou ao menos uma Citation associada.",
    );
  }

  const [sourceEntity, targetEntity] = await Promise.all([
    assertNodeExists(existing.sourceType, existing.sourceId, "source"),
    assertNodeExists(existing.targetType, existing.targetId, "target"),
  ]);
  if (!isNodeApproved(existing.sourceType, sourceEntity)) {
    throw new PublicationPolicyError(
      `Nó de origem (${existing.sourceType}) precisa estar em status APPROVED ou PUBLISHED antes desta relação ser publicada.`,
    );
  }
  if (!isNodeApproved(existing.targetType, targetEntity)) {
    throw new PublicationPolicyError(
      `Nó de destino (${existing.targetType}) precisa estar em status APPROVED ou PUBLISHED antes desta relação ser publicada.`,
    );
  }

  const relation = await prisma.academicRelation.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.ACADEMIC_RELATION,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: relation,
  });
  return relation;
}

/** Todas as relações em que a entidade participa, como origem OU destino. */
export async function listRelationsForEntity(type: KnowledgeEntityTypeValue, id: string) {
  return prisma.academicRelation.findMany({
    where: {
      OR: [
        { sourceType: type, sourceId: id },
        { targetType: type, targetId: id },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAcademicRelation(id: string) {
  return prisma.academicRelation.findUnique({ where: { id }, include: { citation: true } });
}
