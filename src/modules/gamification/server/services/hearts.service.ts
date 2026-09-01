/**
 * Vidas ("baterias") — fase "vidas/joias" (pedido do usuário: 25
 * baterias, perde 1 por resposta errada numa lição, recarrega sozinha com
 * o tempo, joia extra recarrega na hora — igual ao Duolingo). Diferente
 * do ledger de XP/joias: `HeartState` é um CONTADOR mutável (não um
 * ledger append-only) — vida não tem histórico que valha a pena guardar,
 * só o valor atual e QUANDO foi a última mudança, para calcular a
 * regeneração sob demanda (nunca via cron/job — este projeto não roda
 * nenhum processo em segundo plano, mesmo motivo já documentado em outros
 * módulos). Um registro por usuário, criado sob demanda na primeira
 * leitura (mesmo padrão de `Streak`/`DailyGoal`).
 *
 * Design deliberado: perder uma bateria REINICIA a contagem para a
 * próxima recarga automática (`lastChangedAt = now`) — mais simples de
 * raciocinar e testar que um relógio contínuo por bateria individual, e
 * suficiente para o pedido original ("recarrega sozinha com o tempo").
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { assertOwnGamificationDataOrAdmin } from "./privacy";
import { HEARTS_MAX, HEART_REGEN_INTERVAL_MS } from "@/config/hearts";

export interface HeartsState {
  current: number;
  max: number;
  /** `null` quando já está no máximo — não há próxima recarga a esperar. */
  nextRegenAt: string | null;
}

async function loadOrCreateHeartState(userId: string) {
  const existing = await prisma.heartState.findUnique({ where: { userId } });
  if (existing) return existing;
  try {
    return await prisma.heartState.create({ data: { userId } });
  } catch {
    // Corrida: outra requisição concorrente já criou o estado inicial deste
    // usuário — a PK (`userId`) garante que só uma linha sobrevive, mesmo
    // padrão de corrida já documentado em `xp.service.ts`/`achievement.service.ts`.
    const raced = await prisma.heartState.findUnique({ where: { userId } });
    if (raced) return raced;
    throw new Error("Falha ao inicializar o estado de baterias.");
  }
}

/** Aplica, em memória, toda a regeneração acumulada desde `lastChangedAt` até `now`. */
function computeRegeneration(
  current: number,
  lastChangedAt: Date,
  now: Date,
): { current: number; lastChangedAt: Date; changed: boolean } {
  if (current >= HEARTS_MAX) return { current: HEARTS_MAX, lastChangedAt, changed: false };

  const elapsedMs = now.getTime() - lastChangedAt.getTime();
  const regenerated = Math.floor(elapsedMs / HEART_REGEN_INTERVAL_MS);
  if (regenerated <= 0) return { current, lastChangedAt, changed: false };

  const nextCurrent = Math.min(HEARTS_MAX, current + regenerated);
  // Só avança o relógio pelo tempo de fato "gasto" nas baterias regeneradas
  // — preserva o progresso parcial acumulado rumo à próxima recarga.
  const nextLastChangedAt = new Date(
    lastChangedAt.getTime() + regenerated * HEART_REGEN_INTERVAL_MS,
  );
  return { current: nextCurrent, lastChangedAt: nextLastChangedAt, changed: true };
}

function toPublicState(current: number, lastChangedAt: Date): HeartsState {
  const nextRegenAt =
    current >= HEARTS_MAX
      ? null
      : new Date(lastChangedAt.getTime() + HEART_REGEN_INTERVAL_MS).toISOString();
  return { current, max: HEARTS_MAX, nextRegenAt };
}

/** Lê o estado atual, aplicando (e persistindo) a regeneração acumulada desde a última mudança. */
export async function getHeartsState(
  actor: Actor,
  targetUserId: string = actor.userId,
  now: Date = new Date(),
): Promise<HeartsState> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);
  const state = await loadOrCreateHeartState(targetUserId);
  const regen = computeRegeneration(state.current, state.lastChangedAt, now);
  if (regen.changed) {
    await prisma.heartState.update({
      where: { userId: targetUserId },
      data: { current: regen.current, lastChangedAt: regen.lastChangedAt },
    });
  }
  return toPublicState(regen.current, regen.lastChangedAt);
}

/**
 * Consome 1 bateria (resposta errada numa lição). Só o próprio usuário
 * perde a própria bateria — quem chama (`lesson-actions.ts`) já é sempre
 * o dono da submissão, não há alvo de terceiro aqui. Nunca fica negativo.
 *
 * Idempotência: responsabilidade de quem chama, via `isNewCompletion` do
 * retorno de `submitLessonActivity` — um bloco de lição só é concluído
 * PELA PRIMEIRA VEZ uma única vez (garantido pelo
 * `@@unique([lessonProgressId, lessonBlockId])` do Módulo 8), então
 * reenviar o mesmo bloco já respondido nunca chama `loseHeart` de novo.
 */
export async function loseHeart(userId: string, now: Date = new Date()): Promise<HeartsState> {
  const state = await loadOrCreateHeartState(userId);
  const regen = computeRegeneration(state.current, state.lastChangedAt, now);
  const nextCurrent = Math.max(0, regen.current - 1);
  await prisma.heartState.update({
    where: { userId },
    data: { current: nextCurrent, lastChangedAt: now },
  });
  return toPublicState(nextCurrent, now);
}

/** Recarrega `count` bateria(s) na hora — só deve ser chamada DEPOIS de um `debitGems` bem-sucedido (nunca sozinha). */
export async function refillHearts(
  userId: string,
  count: number,
  now: Date = new Date(),
): Promise<HeartsState> {
  if (count <= 0) {
    throw new RangeError("Quantidade de baterias a recarregar deve ser positiva.");
  }
  const state = await loadOrCreateHeartState(userId);
  const regen = computeRegeneration(state.current, state.lastChangedAt, now);
  const nextCurrent = Math.min(HEARTS_MAX, regen.current + count);
  await prisma.heartState.update({
    where: { userId },
    data: { current: nextCurrent, lastChangedAt: regen.lastChangedAt },
  });
  return toPublicState(nextCurrent, regen.lastChangedAt);
}
