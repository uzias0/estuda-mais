/**
 * Ledger de XP (Módulo 9, seções 6-8/27) — `GamificationEvent` é a ÚNICA
 * fonte de verdade para XP; `awardXp` é o único ponto de escrita, sempre
 * idempotente por `idempotencyKey`. Nenhuma função deste serviço confia em
 * `xp`/`totalXp` vindo do cliente — o valor concedido vem sempre de
 * `XP_REWARDS`/`Achievement.xpReward` (servidor), nunca de um payload
 * (seção 6: "o cliente poderá enviar somente dados referentes à ação").
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import type { GamificationEvent } from "@/generated/prisma/client";
import { assertOwnGamificationDataOrAdmin } from "./privacy";

export interface AwardXpInput {
  userId: string;
  type: string;
  idempotencyKey: string;
  amount: number;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface AwardXpResult {
  event: GamificationEvent;
  /** `true` quando o evento já existia (idempotência) — nenhum XP novo foi concedido. */
  alreadyAwarded: boolean;
}

/**
 * Concede XP de forma idempotente (seção 8): se `idempotencyKey` já
 * existir, devolve o evento já gravado sem duplicar nada. `amount` nunca é
 * negativo (seção 30: XP nunca é reduzido por erro/streak perdido/etc.).
 */
export async function awardXp(input: AwardXpInput): Promise<AwardXpResult> {
  if (input.amount < 0) {
    throw new RangeError("XP concedido não pode ser negativo.");
  }

  const existing = await prisma.gamificationEvent.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return { event: existing, alreadyAwarded: true };

  try {
    const event = await prisma.gamificationEvent.create({
      data: {
        userId: input.userId,
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        xpAwarded: input.amount,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      },
    });
    return { event, alreadyAwarded: false };
  } catch (error) {
    // Corrida rara entre o `findUnique` e o `create` — outra chamada
    // concorrente já gravou o mesmo `idempotencyKey`; a constraint única
    // garante que só uma linha sobrevive, então basta buscá-la de novo
    // (mesmo padrão documentado em `lesson-execution.service.ts`, Módulo 8).
    const raced = await prisma.gamificationEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (raced) return { event: raced, alreadyAwarded: true };
    throw error;
  }
}

/** Soma de todo o XP já concedido — SEMPRE derivada do ledger, nunca de um contador redundante. */
export async function getTotalXp(
  actor: Actor,
  targetUserId: string = actor.userId,
): Promise<number> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);
  const result = await prisma.gamificationEvent.aggregate({
    where: { userId: targetUserId },
    _sum: { xpAwarded: true },
  });
  return result._sum.xpAwarded ?? 0;
}

export type XpHistoryEntry = GamificationEvent;

/** Histórico de concessões, mais recente primeiro — dá a origem de cada XP (seção 27). */
export async function listXpHistory(
  actor: Actor,
  targetUserId: string = actor.userId,
  params?: { take?: number; skip?: number },
): Promise<XpHistoryEntry[]> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);
  return prisma.gamificationEvent.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: "desc" },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
  });
}
