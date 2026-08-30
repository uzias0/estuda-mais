/**
 * Serviço de domínio para `Citation` — a utilização de uma `Source` como
 * evidência de uma entidade (Módulo 2, seção 8: "SOURCE ≠ CITATION").
 *
 * `entityId` é polimórfico via `entityType` (`CitationEntityType`), sem FK
 * nativa (docs/RELATORIO_REVISAO_V3.md, seção 5/25 do Módulo 2). A validação
 * de existência reaproveita `resolveEntity()`/`entityExists()` do Módulo 1
 * para os tipos que também são `KnowledgeEntityType` (PERSON/WORK/THEORY/
 * CONCEPT/SCHOOL/DISCIPLINE), e resolve `ACADEMIC_RELATION` diretamente (não
 * é um nó de conhecimento, mas é citável).
 *
 * `LESSON` passou a ser resolvido diretamente a partir do Módulo 4 — o
 * Núcleo Pedagógico agora existe (`prisma.lesson`), então este módulo deixa
 * de rejeitar o tipo e fecha a lacuna que o Módulo 2 já antecipava (o enum
 * `CitationEntityType.LESSON` existe desde o Módulo 1, sem consumidor até
 * agora). `QUESTION`/`EXAM_EDITION` permanecem fora do escopo desta função —
 * não são responsabilidade do Módulo 4, e mudá-los aqui seria retrabalho de
 * um módulo já validado (Módulo 3); citá-los continua explicitamente
 * rejeitado, não ignorado silenciosamente.
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS, toAuditableEntityType } from "./auditLog";
import { CitationEntityType } from "@/generated/prisma/enums";
import { entityExists } from "@/modules/knowledge/server/services/resolveEntity";
import {
  CitationCreateInputSchema,
  CitationUpdateInputSchema,
  type CitationCreateInput,
  type CitationUpdateInput,
} from "@/shared/schemas/citation.schema";
import { NotFoundError } from "./publicationPolicy";

type CitationEntityTypeValue = (typeof CitationEntityType)[keyof typeof CitationEntityType];

const KNOWLEDGE_OVERLAPPING_TYPES = new Set<string>([
  CitationEntityType.PERSON,
  CitationEntityType.WORK,
  CitationEntityType.THEORY,
  CitationEntityType.CONCEPT,
  CitationEntityType.SCHOOL,
  CitationEntityType.DISCIPLINE,
]);

const OUT_OF_SCOPE_TYPES = new Set<string>([
  CitationEntityType.QUESTION,
  CitationEntityType.EXAM_EDITION,
]);

/** Resolve se o alvo de uma Citation existe — ver cabeçalho do arquivo. */
export async function citationTargetExists(
  entityType: CitationEntityTypeValue,
  entityId: string,
): Promise<boolean> {
  if (KNOWLEDGE_OVERLAPPING_TYPES.has(entityType)) {
    return entityExists(entityType, entityId);
  }
  if (entityType === CitationEntityType.ACADEMIC_RELATION) {
    return (await prisma.academicRelation.findUnique({ where: { id: entityId } })) !== null;
  }
  if (entityType === CitationEntityType.LESSON) {
    return (await prisma.lesson.findUnique({ where: { id: entityId } })) !== null;
  }
  if (OUT_OF_SCOPE_TYPES.has(entityType)) {
    throw new Error(
      `Citação para entityType="${entityType}" ainda não é suportada — pertence a um módulo ` +
        "ainda não implementado (fora do escopo do Módulo 2, Base de Conhecimento).",
    );
  }
  return false;
}

export async function createCitation(actor: Actor, input: CitationCreateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = CitationCreateInputSchema.parse(input);

  const source = await prisma.source.findUnique({ where: { id: data.sourceId } });
  if (!source) throw new NotFoundError(`Source "${data.sourceId}" não encontrada.`);

  const targetExists = await citationTargetExists(data.entityType, data.entityId);
  if (!targetExists) {
    throw new NotFoundError(
      `Entidade ${data.entityType}("${data.entityId}") não encontrada — não é possível citar algo inexistente.`,
    );
  }

  const citation = await prisma.citation.create({ data });
  await recordAudit({
    entityType: toAuditableEntityType(data.entityType),
    entityId: data.entityId,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: citation,
  });
  return citation;
}

export async function updateCitationNote(actor: Actor, id: string, input: CitationUpdateInput) {
  assertRole(actor, CURATOR_ROLES);
  const data = CitationUpdateInputSchema.parse(input);

  const existing = await prisma.citation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Citation "${id}" não encontrada.`);

  const citation = await prisma.citation.update({ where: { id }, data });
  await recordAudit({
    entityType: toAuditableEntityType(existing.entityType),
    entityId: existing.entityId,
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    snapshot: citation,
  });
  return citation;
}

export async function listCitationsForEntity(
  entityType: CitationEntityTypeValue,
  entityId: string,
) {
  return prisma.citation.findMany({
    where: { entityType, entityId },
    include: { source: true },
    orderBy: { id: "asc" },
  });
}

export async function getCitation(id: string) {
  return prisma.citation.findUnique({ where: { id }, include: { source: true } });
}

/**
 * Consulta mínima nova (Módulo 12, seção 12 do prompt: "mostrar... conteúdos
 * que utilizam a fonte") — o inverso de `listCitationsForEntity`: dada uma
 * `Source`, lista todas as `Citation` que a usam como evidência. Não existia
 * até aqui porque nenhum consumidor anterior precisava "partir da fonte" —
 * sempre se partia da entidade citada. Leitura pura, sem `Actor`.
 */
export async function listCitationsBySource(sourceId: string) {
  return prisma.citation.findMany({
    where: { sourceId },
    orderBy: { id: "asc" },
  });
}
