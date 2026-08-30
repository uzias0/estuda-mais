/**
 * Consultas de leitura do Módulo 6 que não são sobre o `Simulation` em si
 * (isso é `simulation.service.ts`) — tentativas de um usuário e a lista de
 * disciplinas disponíveis para montar um simulado por disciplina (seção
 * 6.3: "a lista real deve vir do banco", nunca hardcoded).
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { PublicationStatus } from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { assertOwnSimulationDataOrCurator } from "./privacy";

export async function getSimulationAttemptDetail(actor: Actor, attemptId: string) {
  const attempt = await prisma.simulationAttempt.findUnique({
    where: { id: attemptId },
    include: { simulation: true },
  });
  if (!attempt) throw new NotFoundError(`SimulationAttempt "${attemptId}" não encontrado.`);
  assertOwnSimulationDataOrCurator(actor, attempt.userId);
  return attempt;
}

export async function listSimulationAttemptsForUser(
  actor: Actor,
  targetUserId: string,
  params?: { take?: number; skip?: number },
) {
  assertOwnSimulationDataOrCurator(actor, targetUserId);
  return prisma.simulationAttempt.findMany({
    where: { userId: targetUserId },
    orderBy: { startedAt: "desc" },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
  });
}

/** Disciplinas publicadas disponíveis para "simulado por disciplina" (seção 6.3) — sempre do banco, nunca hardcoded. */
export async function listAvailableDisciplines() {
  return prisma.discipline.findMany({
    where: { status: PublicationStatus.PUBLISHED },
    orderBy: { name: "asc" },
  });
}
