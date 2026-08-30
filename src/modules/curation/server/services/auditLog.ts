/**
 * Auditoria de curadoria — usa o `ContentAuditLog` já existente no schema
 * (Módulo 1). Não cria um segundo mecanismo paralelo (seção 24/9 do Módulo 2).
 */
import { prisma } from "@/server/db";
import { AuditableEntityType } from "@/generated/prisma/enums";

/**
 * Vocabulário centralizado de ações de auditoria. `ContentAuditLog.action` é
 * `String` no banco (assim como `AcademicRelation.relationType`), então a
 * validação/consistência de valores vive aqui, não em enum de banco.
 */
export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  PUBLISH: "PUBLISH",
  ARCHIVE: "ARCHIVE",
  LINK: "LINK",
  UNLINK: "UNLINK",
  // Adicionado no Módulo 7 (docs/MODULO-7.md, "Decisões técnicas") —
  // "restaurar quando permitido" (seção 20 do prompt) é uma transição nova,
  // sem equivalente nos Módulos 2-6 (arquivar sempre foi tratado como
  // definitivo até aqui); vocabulário de string, não enum de banco, mesmo
  // motivo de todos os valores acima.
  RESTORE: "RESTORE",
} as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditableEntityTypeValue =
  (typeof AuditableEntityType)[keyof typeof AuditableEntityType];

const AUDITABLE_ENTITY_TYPE_VALUES = new Set<string>(Object.values(AuditableEntityType));

/**
 * `CitationEntityType`/`KnowledgeEntityType` são conjuntos DISTINTOS de
 * `AuditableEntityType`, mas todos os seus valores também são valores válidos
 * de `AuditableEntityType` (que é deliberadamente mais amplo — ver schema).
 * Esta conversão é uma checagem em runtime, não um cast às cegas.
 */
export function toAuditableEntityType(value: string): AuditableEntityTypeValue {
  if (!AUDITABLE_ENTITY_TYPE_VALUES.has(value)) {
    throw new Error(`"${value}" não é um AuditableEntityType válido.`);
  }
  return value as AuditableEntityTypeValue;
}

export interface RecordAuditInput {
  entityType: AuditableEntityTypeValue;
  entityId: string;
  action: AuditAction;
  actorUserId: string;
  snapshot?: unknown;
}

/** Registra uma entrada de auditoria — chamado pelos serviços de domínio após cada mutação relevante. */
export async function recordAudit(input: RecordAuditInput) {
  return prisma.contentAuditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorUserId: input.actorUserId,
      snapshot: input.snapshot === undefined ? undefined : (input.snapshot as object),
    },
  });
}

/**
 * Consulta mínima de LEITURA sobre `ContentAuditLog` (Módulo 12, seção 12 do
 * prompt: "criar uma experiência administrativa clara"). Até este módulo só
 * existia a escrita (`recordAudit`) — nenhum serviço lia o log de volta;
 * cada teste anterior consultava `prisma.contentAuditLog.findMany` direto.
 * Esta função não introduz nenhuma regra nova: só pagina/filtra o que
 * `recordAudit` já grava, na mesma tabela, sem duplicar auditoria em
 * nenhuma outra estrutura. Leitura pura — sem `Actor`/`assertRole` aqui, a
 * mesma convenção de `getConcept`/`getDiscipline`/etc. (a autorização de
 * quem pode VER `/admin/audit` é responsabilidade do guard do layout
 * administrativo, não desta consulta).
 */
export interface AuditLogQueryParams {
  entityType?: AuditableEntityTypeValue;
  entityId?: string;
  action?: AuditAction;
  take?: number;
  skip?: number;
}

export async function listAuditLogEntries(params: AuditLogQueryParams = {}) {
  const { entityType, entityId, action, take = 50, skip = 0 } = params;
  return prisma.contentAuditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(action ? { action } : {}),
    },
    include: { actor: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
}
