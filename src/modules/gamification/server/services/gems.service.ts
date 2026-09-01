/**
 * Ledger de joias (fase "vidas/joias") — mesmo padrão do ledger de XP
 * (`xp.service.ts`, Módulo 9): `GemTransaction` é a ÚNICA fonte de verdade
 * do saldo (sempre somado, nunca um contador redundante em `User`/
 * `Profile`), toda escrita é idempotente por `idempotencyKey`. Diferença
 * deliberada: `amount` pode ser negativo aqui — joia é moeda que se GASTA
 * (recarregar bateria); XP nunca é reduzido (invariante do Módulo 9, que
 * não se aplica a joia — por isso `creditGems`/`debitGems` são duas
 * funções explícitas, não uma só `amount` livre como em `awardXp`).
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import type { GemTransaction } from "@/generated/prisma/client";
import { assertOwnGamificationDataOrAdmin } from "./privacy";

export interface GemTransactionResult {
  transaction: GemTransaction;
  /** `true` quando a transação já existia (idempotência) — nenhuma joia nova foi movida. */
  alreadyProcessed: boolean;
}

interface WriteGemTransactionInput {
  userId: string;
  type: string;
  idempotencyKey: string;
  amount: number;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

async function writeGemTransaction(input: WriteGemTransactionInput): Promise<GemTransactionResult> {
  const existing = await prisma.gemTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return { transaction: existing, alreadyProcessed: true };

  try {
    const transaction = await prisma.gemTransaction.create({
      data: {
        userId: input.userId,
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        amount: input.amount,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      },
    });
    return { transaction, alreadyProcessed: false };
  } catch (error) {
    // Corrida rara entre o `findUnique` e o `create` — mesmo padrão
    // documentado em `xp.service.ts` (Módulo 9).
    const raced = await prisma.gemTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (raced) return { transaction: raced, alreadyProcessed: true };
    throw error;
  }
}

export interface CreditGemsInput {
  userId: string;
  type: string;
  idempotencyKey: string;
  /** Sempre positivo — representa o quanto GANHAR. */
  amount: number;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

/** Concede joia (ganho) — `amount` deve ser positivo; para gastar, use `debitGems`. */
export async function creditGems(input: CreditGemsInput): Promise<GemTransactionResult> {
  if (input.amount <= 0) {
    throw new RangeError("Crédito de joias deve ser positivo — use debitGems para gastar.");
  }
  return writeGemTransaction(input);
}

export class InsufficientGemsError extends Error {
  constructor(message = "Saldo de joias insuficiente.") {
    super(message);
    this.name = "InsufficientGemsError";
  }
}

export interface DebitGemsInput {
  userId: string;
  type: string;
  idempotencyKey: string;
  /** Sempre positivo — representa o quanto GASTAR (a linha gravada usa o negativo). */
  amount: number;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Gasta joia — falha com `InsufficientGemsError` se o saldo atual for
 * menor que `amount`. A checagem de saldo e a escrita não formam uma
 * transação atômica com um possível gasto concorrente do MESMO usuário em
 * duas abas/dispositivos — mesma classe de corrida rara já aceita e
 * documentada em `lesson-execution.service.ts` (Módulo 8); o volume atual
 * do produto não justifica lock pessimista para isto.
 */
export async function debitGems(input: DebitGemsInput): Promise<GemTransactionResult> {
  if (input.amount <= 0) {
    throw new RangeError("Débito de joias deve ser positivo (representa o quanto gastar).");
  }

  const existing = await prisma.gemTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return { transaction: existing, alreadyProcessed: true };

  const balance = await getGemBalance(input.userId);
  if (balance < input.amount) {
    throw new InsufficientGemsError(
      `Saldo de joias insuficiente: você tem ${balance}, precisa de ${input.amount}.`,
    );
  }

  return writeGemTransaction({ ...input, amount: -input.amount });
}

/** Soma de todas as transações — SEMPRE derivada do ledger, nunca de um contador redundante. Sem checagem de privacidade (uso interno, ex.: `debitGems`); para leitura por um Actor, use `getGemBalanceForActor`. */
export async function getGemBalance(userId: string): Promise<number> {
  const result = await prisma.gemTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/** Mesma leitura de `getGemBalance`, mas com a checagem de privacidade padrão do módulo (seção 32). */
export async function getGemBalanceForActor(
  actor: Actor,
  targetUserId: string = actor.userId,
): Promise<number> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);
  return getGemBalance(targetUserId);
}

export type GemHistoryEntry = GemTransaction;

/** Histórico de transações, mais recente primeiro — dá a origem de cada ganho/gasto. */
export async function listGemHistory(
  actor: Actor,
  targetUserId: string = actor.userId,
  params?: { take?: number; skip?: number },
): Promise<GemHistoryEntry[]> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);
  return prisma.gemTransaction.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: "desc" },
    take: params?.take ?? 50,
    skip: params?.skip ?? 0,
  });
}
