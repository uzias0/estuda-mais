/**
 * Serviço de domínio para `Simulation` — persistência de baixo nível
 * (`createSimulationRecord`, reaproveitada por `simulation-builder.service.ts`
 * e por `createSimulationFromQuestionIds` abaixo) e CRUD/publicação/
 * arquivamento curatorial (Módulo 6, seção 29).
 */
import { prisma } from "@/server/db";
import { Actor, assertRole, CURATOR_ROLES, PUBLISHER_ROLES } from "@/server/auth/authorize";
import { recordAudit, AUDIT_ACTIONS } from "@/modules/curation/server/services/auditLog";
import {
  assertArchivable,
  NotFoundError,
} from "@/modules/curation/server/services/publicationPolicy";
import { AuditableEntityType, PublicationStatus } from "@/generated/prisma/enums";
import { SimulationValidationError } from "./errors";

type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

/**
 * Persiste um `Simulation` + seus `SimulationQuestion` (ordem = índice na
 * lista recebida) numa transação. Baixo nível — não checa autorização nem
 * elegibilidade das questões; quem chama (`buildSimulation`,
 * `createSimulationFromQuestionIds`) já validou tudo isso antes.
 */
export async function createSimulationRecord(params: {
  title: string;
  config: unknown;
  createdByUserId?: string;
  questionIds: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const simulation = await tx.simulation.create({
      data: {
        title: params.title,
        config: params.config as object,
        createdByUserId: params.createdByUserId,
      },
    });
    await tx.simulationQuestion.createMany({
      data: params.questionIds.map((questionId, index) => ({
        simulationId: simulation.id,
        questionId,
        order: index,
      })),
    });
    return simulation;
  });
}

/**
 * Cria um simulado ADMINISTRATIVO a partir de uma lista explícita de
 * questões (seção 29: "CONTENT_EDITOR pode criar/configurar simulados
 * administrativos") — distinto de `buildSimulation` (que monta a partir de
 * filtros/prova/revisão). Exige que todas as questões existam e estejam
 * publicadas; deduplica defensivamente (seção 33).
 */
export async function createSimulationFromQuestionIds(
  actor: Actor,
  input: { title: string; questionIds: string[] },
) {
  assertRole(actor, CURATOR_ROLES);
  const uniqueIds = [...new Set(input.questionIds)];
  if (uniqueIds.length === 0) {
    throw new SimulationValidationError("Informe ao menos uma questão para o simulado.");
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: uniqueIds }, reviewStatus: PublicationStatus.PUBLISHED },
    select: { id: true },
  });
  if (questions.length !== uniqueIds.length) {
    throw new NotFoundError("Uma ou mais questões informadas não existem ou não estão publicadas.");
  }

  const simulation = await createSimulationRecord({
    title: input.title,
    config: { kind: "MANUAL", questionIds: uniqueIds },
    questionIds: uniqueIds,
  });
  await recordAudit({
    entityType: AuditableEntityType.SIMULATION,
    entityId: simulation.id,
    action: AUDIT_ACTIONS.CREATE,
    actorUserId: actor.userId,
    snapshot: simulation,
  });
  return simulation;
}

/** Publica um simulado — exige ao menos uma questão vinculada (gate estrutural, mesmo espírito do Módulo 4). */
export async function publishSimulation(actor: Actor, id: string) {
  assertRole(actor, PUBLISHER_ROLES);

  const existing = await prisma.simulation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Simulation "${id}" não encontrado.`);
  if (existing.status === PublicationStatus.ARCHIVED) {
    throw new SimulationValidationError("Simulado arquivado não pode ser publicado.");
  }
  if (existing.status === PublicationStatus.PUBLISHED) {
    throw new SimulationValidationError("Simulado já está publicado.");
  }

  const questionCount = await prisma.simulationQuestion.count({ where: { simulationId: id } });
  if (questionCount === 0) {
    throw new SimulationValidationError("Simulado sem questões não pode ser publicado.");
  }

  const simulation = await prisma.simulation.update({
    where: { id },
    data: { status: PublicationStatus.PUBLISHED },
  });
  await recordAudit({
    entityType: AuditableEntityType.SIMULATION,
    entityId: id,
    action: AUDIT_ACTIONS.PUBLISH,
    actorUserId: actor.userId,
    snapshot: simulation,
  });
  return simulation;
}

export async function archiveSimulation(actor: Actor, id: string) {
  assertRole(actor, CURATOR_ROLES);

  const existing = await prisma.simulation.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Simulation "${id}" não encontrado.`);
  assertArchivable(existing.status);

  const simulation = await prisma.simulation.update({
    where: { id },
    data: { status: PublicationStatus.ARCHIVED },
  });
  await recordAudit({
    entityType: AuditableEntityType.SIMULATION,
    entityId: id,
    action: AUDIT_ACTIONS.ARCHIVE,
    actorUserId: actor.userId,
    snapshot: simulation,
  });
  return simulation;
}

/**
 * Visibilidade (seção 29/30): um simulado PUBLISHED é visível a qualquer
 * `Actor`; um DRAFT/ARCHIVED só é visível a quem o criou ou a CURATOR_ROLES.
 * Isso é o que permite um aluno iniciar seu próprio simulado personalizado
 * (sempre DRAFT, nunca publicado por um ADMIN) sem expor rascunhos alheios.
 */
function assertSimulationVisible(
  actor: Actor,
  simulation: { status: PublicationStatusValue; createdByUserId: string | null },
) {
  if (simulation.status === PublicationStatus.PUBLISHED) return;
  if (simulation.createdByUserId === actor.userId) return;
  if (CURATOR_ROLES.includes(actor.role)) return;
  throw new SimulationValidationError("Este simulado não está disponível para você.");
}

export { assertSimulationVisible };

export async function getSimulation(actor: Actor, id: string) {
  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" }, include: { question: true } } },
  });
  if (!simulation) throw new NotFoundError(`Simulation "${id}" não encontrado.`);
  assertSimulationVisible(actor, simulation);
  return simulation;
}

export async function listSimulations(
  actor: Actor,
  params?: { status?: PublicationStatusValue; mine?: boolean; take?: number; skip?: number },
) {
  const isCurator = CURATOR_ROLES.includes(actor.role);
  const where = params?.mine
    ? { createdByUserId: actor.userId }
    : isCurator && params?.status
      ? { status: params.status }
      : { status: PublicationStatus.PUBLISHED };

  return prisma.simulation.findMany({
    where,
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
    orderBy: { id: "desc" },
  });
}
