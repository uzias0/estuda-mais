/**
 * Configuração central da gamificação (Módulo 9, seção 5/38: "nenhum número
 * mágico espalhado pelo código"). Toda política de XP/nível/streak/meta
 * muda só aqui.
 */

/**
 * Vocabulário validado em código para `GamificationEvent.type` — mesmo
 * padrão de `AUDIT_ACTIONS` (curation) e `REVIEW_LOG_ORIGINS` (review):
 * cresce sem migration, porque não é um conjunto estrutural fechado.
 */
export const GAMIFICATION_EVENT_TYPES = {
  LESSON_COMPLETED: "LESSON_COMPLETED",
  LESSON_QUESTION_CORRECT: "LESSON_QUESTION_CORRECT",
  REVIEW_SESSION_COMPLETED: "REVIEW_SESSION_COMPLETED",
  REVIEW_QUESTION_CORRECT: "REVIEW_QUESTION_CORRECT",
  SIMULATION_COMPLETED: "SIMULATION_COMPLETED",
  DIAGNOSTIC_COMPLETED: "DIAGNOSTIC_COMPLETED",
  DAILY_GOAL_COMPLETED: "DAILY_GOAL_COMPLETED",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  // Fase "missões semanais" — ver src/config/missions.ts.
  WEEKLY_MISSION_COMPLETED: "WEEKLY_MISSION_COMPLETED",
} as const;
export type GamificationEventType =
  (typeof GAMIFICATION_EVENT_TYPES)[keyof typeof GAMIFICATION_EVENT_TYPES];

/**
 * Política de XP (Módulo 9, seção 5) — valores literais do "exemplo inicial
 * de política" do prompt do módulo. Ajustável aqui, sem tocar em nenhum
 * serviço. XP de conquista NÃO está aqui: vem de `Achievement.xpReward`
 * (schema, Módulo 1), que já é o dono desse valor — mesmo motivo de
 * `WEEKLY_MISSION_COMPLETED` também ficar de fora: o valor vem de
 * `MissionTemplate.xpReward` (`src/config/missions.ts`), que é dono dele.
 */
export const XP_REWARDS: Record<
  Exclude<GamificationEventType, "ACHIEVEMENT_UNLOCKED" | "WEEKLY_MISSION_COMPLETED">,
  number
> = {
  LESSON_COMPLETED: 50,
  LESSON_QUESTION_CORRECT: 10,
  REVIEW_SESSION_COMPLETED: 20,
  REVIEW_QUESTION_CORRECT: 5,
  SIMULATION_COMPLETED: 100,
  DIAGNOSTIC_COMPLETED: 75,
  DAILY_GOAL_COMPLETED: 25,
};

/**
 * Tabela de XP necessário por nível (Módulo 9, seção 9) — gerada por uma
 * fórmula progressiva determinística (o prompt permite explicitamente:
 * "Ou utilizar uma fórmula progressiva caso seja mais adequada. O
 * importante é: XP → nível ser uma função pura e determinística"). O
 * intervalo entre níveis consecutivos cresce 50 XP a cada nível, começando
 * em 100 — não é uma cópia literal do exemplo ilustrativo do prompt (que
 * não seguia uma progressão limpa: 100/150/250/350), decisão registrada em
 * `docs/MODULO-9.md`. `LEVEL_XP_TABLE[i]` = XP necessário para alcançar o
 * nível `i + 1` (índice 0 → nível 1 → 0 XP).
 */
function generateLevelXpTable(maxLevel: number): number[] {
  const table: number[] = [0];
  let delta = 100;
  for (let level = 2; level <= maxLevel; level++) {
    table.push(table[table.length - 1] + delta);
    delta += 50;
  }
  return table;
}

/** Nível máximo modelado — acima disso, o XP requerido cresce apenas conforme o último degrau (ver `level.ts`). */
export const MAX_LEVEL = 50;
export const LEVEL_XP_TABLE = generateLevelXpTable(MAX_LEVEL);

/**
 * Fuso horário usado para decidir "que dia é hoje" (streak/meta diária) —
 * Módulo 9, seção 13: não existe campo de timezone no domínio (`User`/
 * `Profile`) ainda, então esta é a abstração mínima pedida ("não criar
 * sistema gigantesco... usar timezone padrão configurável"), documentada
 * aqui. Offset fixo (minutos a somar ao UTC) — América/São Paulo (UTC-3,
 * sem horário de verão desde 2019). Quando o domínio ganhar timezone por
 * usuário, este valor passa a ser só o fallback.
 */
export const DEFAULT_TIMEZONE_OFFSET_MINUTES = -180;

/** Meta diária de XP padrão — mesmo valor já default no schema (`DailyGoal.targetXp`), repetido aqui só como referência de política, nunca lido em vez do schema. */
export const DEFAULT_DAILY_GOAL_XP = 20;
