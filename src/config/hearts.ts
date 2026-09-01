/**
 * Configuração central de vidas ("baterias") e joias — fase "vidas/joias"
 * (pedido explícito do usuário: "vinte e cinco baterias... igual ao
 * Duolingo... com essas joias você comprou antes baterias"). Mesmo padrão
 * de `src/config/gamification.ts` (Módulo 9, seção 5): nenhum número
 * mágico espalhado pelo código, toda política muda só aqui.
 */

/** Máximo de baterias — pedido explícito do usuário ("vinte e cinco"). */
export const HEARTS_MAX = 25;

/** Baterias perdidas por resposta ERRADA numa lição (não em revisão/simulado/diagnóstico — ver docs/FASE-VIDAS-JOIAS.md). */
export const HEART_LOSS_PER_WRONG_ANSWER = 1;

/**
 * Intervalo para regenerar 1 bateria sozinha, sem gastar joia — "recarrega
 * sozinha com o tempo", confirmado pelo usuário. 30 minutos por bateria:
 * com o máximo de 25, recarregar do zero ao cheio levaria 12h30 se o
 * jogador ficar totalmente sem jogar nesse meio tempo — rápido o
 * suficiente para não travar um estudante empenhado por muito tempo, lento
 * o suficiente para a recarga com joia continuar tendo valor.
 */
export const HEART_REGEN_INTERVAL_MS = 30 * 60 * 1000;

/** Custo em joias para recarregar 1 bateria na hora (compra instantânea). */
export const GEM_COST_PER_HEART = 20;

/**
 * Vocabulário validado em código para `GemTransaction.type` — mesmo padrão
 * de `GAMIFICATION_EVENT_TYPES` (gamification.ts): cresce sem migration.
 */
export const GEM_EVENT_TYPES = {
  LESSON_COMPLETED: "LESSON_COMPLETED",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  HEART_REFILL: "HEART_REFILL",
} as const;
export type GemEventType = (typeof GEM_EVENT_TYPES)[keyof typeof GEM_EVENT_TYPES];

/**
 * Política de ganho de joia (seção "vidas/joias") — só os dois eventos
 * abaixo concedem joia nesta primeira entrega; `HEART_REFILL` nunca
 * aparece aqui porque é o único evento de GASTO, não de ganho (ver
 * `debitGems` em `gems.service.ts`).
 */
export const GEM_REWARDS: Record<"LESSON_COMPLETED" | "ACHIEVEMENT_UNLOCKED", number> = {
  LESSON_COMPLETED: 10,
  ACHIEVEMENT_UNLOCKED: 25,
};
