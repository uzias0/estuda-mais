/**
 * Ranking semanal com divisões (pedido do usuário, confirmado logo depois
 * de missões semanais na prioridade). Mesmo padrão de `hearts.ts`/
 * `missions.ts`: nenhum número mágico espalhado, toda política muda só
 * aqui.
 *
 * Decisão de arquitetura (documentada em docs/FASE-MISSOES-RANKING.md):
 * o Duolingo real forma grupos de ~30 pessoas aleatórios por semana via um
 * job agendado, que este projeto não tem (mesmo motivo já registrado para
 * bateria/meta diária/missões — sem cron). Em vez de grupos aleatórios,
 * a "divisão" aqui é determinada pelo NÍVEL atual do aluno (`Profile`/
 * `getXpProgressToNextLevel`, Módulo 9) — sempre a mesma divisão pro
 * mesmo nível, sem precisar sortear/persistir nenhum grupo. Dentro da
 * divisão, o ranking ordena por XP ganho NESTA semana (mesmo intervalo
 * calculado em `calendar.ts`).
 */

export interface RankingDivision {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
}

export const RANKING_DIVISIONS: RankingDivision[] = [
  { id: "bronze", name: "Bronze", minLevel: 1, maxLevel: 5 },
  { id: "prata", name: "Prata", minLevel: 6, maxLevel: 10 },
  { id: "ouro", name: "Ouro", minLevel: 11, maxLevel: 20 },
  { id: "platina", name: "Platina", minLevel: 21, maxLevel: 35 },
  { id: "diamante", name: "Diamante", minLevel: 36, maxLevel: 50 },
];

/**
 * Devolve a divisão do nível informado — sempre acha uma. Nível abaixo do
 * mínimo modelado (não deveria acontecer, nível sempre começa em 1, mas
 * um valor por engano/teste não deve quebrar nada) cai na PRIMEIRA
 * divisão; acima do máximo (`MAX_LEVEL`) cai na ÚLTIMA.
 */
export function divisionForLevel(level: number): RankingDivision {
  const exact = RANKING_DIVISIONS.find((d) => level >= d.minLevel && level <= d.maxLevel);
  if (exact) return exact;
  return level < RANKING_DIVISIONS[0].minLevel
    ? RANKING_DIVISIONS[0]
    : RANKING_DIVISIONS[RANKING_DIVISIONS.length - 1];
}

/** Quantos colocados aparecem na lista (além da posição do próprio aluno, sempre incluída). */
export const RANKING_TOP_SIZE = 30;
