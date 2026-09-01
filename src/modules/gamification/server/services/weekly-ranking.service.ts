/**
 * Ranking semanal com divisões (ver `src/config/ranking.ts` para a
 * decisão de arquitetura completa: divisão por nível, sem grupos
 * aleatórios/sem cron). Leitura pura — nenhuma recompensa concedida
 * aqui nesta primeira entrega (só o placar em si; promoção/rebaixamento
 * com recompensa fica para uma próxima iteração, se pedido).
 *
 * Custo: agrega `GamificationEvent` por usuário duas vezes (total
 * histórico, pra achar a divisão de cada um; e só da semana, pra
 * ranquear dentro da divisão) — aceitável no volume atual do produto
 * (mesma prioridade de simplicidade sobre otimização prematura já
 * registrada em outros serviços deste módulo); numa base muito maior,
 * isto pediria uma tabela de materialização própria.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { assertOwnGamificationDataOrAdmin } from "./privacy";
import { calculateLevelFromXp } from "./level";
import { currentWeekRange } from "./calendar";
import { RANKING_TOP_SIZE, divisionForLevel, type RankingDivision } from "@/config/ranking";

export interface RankingEntry {
  userId: string;
  name: string;
  xpThisWeek: number;
  rank: number;
  isSelf: boolean;
}

export interface WeeklyRankingResult {
  division: RankingDivision;
  weekKey: string;
  weekEndsAt: Date;
  /** Top colocados (até `RANKING_TOP_SIZE`), sempre incluindo o próprio aluno se ele estiver entre eles. */
  top: RankingEntry[];
  /** A posição do próprio aluno, mesmo quando fora do `top` — nunca `null` (todo aluno tem uma posição, mesmo em último). */
  ownEntry: RankingEntry;
  totalInDivision: number;
}

/** Lê o ranking semanal da divisão do próprio aluno — mesma checagem de privacidade padrão do módulo (seção 32). */
export async function getWeeklyRanking(
  actor: Actor,
  targetUserId: string = actor.userId,
  now: Date = new Date(),
): Promise<WeeklyRankingResult> {
  assertOwnGamificationDataOrAdmin(actor, targetUserId);

  const { weekKey, start, end } = currentWeekRange(now);

  // Nível de CADA aluno (histórico completo, nunca só a semana) decide a
  // divisão — mesmo cálculo de `getXpProgressToNextLevel`, mas só
  // precisamos do nível aqui, não do progresso pro próximo.
  const totals = await prisma.gamificationEvent.groupBy({
    by: ["userId"],
    _sum: { xpAwarded: true },
  });
  const totalsByUser = new Map(totals.map((t) => [t.userId, t._sum.xpAwarded ?? 0]));

  const targetTotalXp = totalsByUser.get(targetUserId) ?? 0;
  const targetLevel = calculateLevelFromXp(targetTotalXp);
  const division = divisionForLevel(targetLevel);

  const peersInDivision = [...totalsByUser.entries()]
    .filter(([, totalXp]) => divisionForLevel(calculateLevelFromXp(totalXp)).id === division.id)
    .map(([userId]) => userId);
  // O próprio aluno pode não ter nenhum GamificationEvent ainda (0 XP,
  // Bronze) — garante que ele sempre está no grupo, mesmo sem histórico.
  if (!peersInDivision.includes(targetUserId)) peersInDivision.push(targetUserId);

  const [weekXpRows, profiles] = await Promise.all([
    prisma.gamificationEvent.groupBy({
      by: ["userId"],
      where: { userId: { in: peersInDivision }, createdAt: { gte: start, lt: end } },
      _sum: { xpAwarded: true },
    }),
    prisma.profile.findMany({
      where: { userId: { in: peersInDivision } },
      select: { userId: true, name: true },
    }),
  ]);

  const weekXpByUser = new Map(weekXpRows.map((r) => [r.userId, r._sum.xpAwarded ?? 0]));
  const nameByUser = new Map(profiles.map((p) => [p.userId, p.name]));

  const ranked = peersInDivision
    .map((userId) => ({
      userId,
      name: nameByUser.get(userId) ?? "Estudante",
      xpThisWeek: weekXpByUser.get(userId) ?? 0,
    }))
    .sort((a, b) => b.xpThisWeek - a.xpThisWeek)
    .map((entry, index) => ({ ...entry, rank: index + 1, isSelf: entry.userId === targetUserId }));

  const ownEntry = ranked.find((e) => e.isSelf)!;
  const top = ranked.slice(0, RANKING_TOP_SIZE);

  return {
    division,
    weekKey,
    weekEndsAt: end,
    // `top` já inclui o próprio aluno quando ele está entre os primeiros
    // `RANKING_TOP_SIZE`; `ownEntry` (acima) cobre o caso de ele estar
    // FORA do top — a UI decide se mostra uma linha extra checando
    // `ownEntry.rank > top.length`.
    top,
    ownEntry,
    totalInDivision: ranked.length,
  };
}
