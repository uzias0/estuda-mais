# gamification — XP, streak, conquistas, metas

Implementado no Módulo 9 (`docs/MODULO-9.md`). Usa `Achievement`,
`UserAchievement`, `Streak`, `DailyGoal` (Módulo 1) — reaproveitados, sem
nenhuma entidade duplicada — mais `GamificationEvent` (novo neste módulo: o
ledger append-only que é a única fonte de verdade para XP).

`Challenge` (DAILY/WEEKLY/EVENT) continua fora de escopo — nenhum serviço o
usa ainda; não fazia parte do que o Módulo 9 pediu.

## Serviços

- `server/services/level.ts` — puro: XP → nível.
- `server/services/streak.ts` — puro: dia calendário, transição de streak.
- `server/services/achievement-evaluator.ts` — puro: critério → desbloqueado?
- `server/services/xp.service.ts` — ledger (`GamificationEvent`), idempotente.
- `server/services/streak.service.ts` — `Streak` persistido.
- `server/services/daily-goal.service.ts` — `DailyGoal` persistido (meta de XP diária).
- `server/services/achievement.service.ts` — avaliação/desbloqueio de `Achievement`.
- `server/services/gamification-events.service.ts` — pontos de entrada por
  evento real (lição/revisão/simulado/diagnóstico concluídos).
- `server/services/student-progress.service.ts` — composição/re-export do
  progresso acadêmico (Módulo 8), sem duplicar nada.
- `server/services/gamification-summary.service.ts` — resumo consolidado do
  estudante.

Sem IA, sem UI, sem ranking/leaderboard, sem monetização de streak — tudo
documentado em `docs/MODULO-9.md`.
