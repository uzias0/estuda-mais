# Módulo 9 — Gamificação, Progresso, XP, Níveis, Streaks, Conquistas e Metas

## 1. Objetivo

Transformar a camada de gamificação já modelada no schema desde o Módulo 1
(`Achievement`, `UserAchievement`, `Streak`, `DailyGoal`, `Challenge` —
nenhuma delas com um único serviço até este módulo) num domínio funcional:
XP determinístico e auditável, nível derivado, streak de estudo real,
metas diárias, conquistas com critério verificável, e uma visão consolidada
de progresso — tudo a partir de eventos REAIS já produzidos pelos Módulos
3/5/6/8, nunca de um valor declarado pelo cliente. Sem IA/LLM, sem UI, sem
ranking, sem monetização.

## 2. Arquitetura analisada

Leitura de `prisma/schema.prisma`, `docs/ARQUITETURA.md`, `docs/MODULO-1.md`
a `docs/MODULO-8.md`, e do código real de `knowledge`/`assessment`/
`pedagogy`/`review`/`simulation`/`curation`.

**Achado central**: `Achievement`/`UserAchievement`/`Streak`/`DailyGoal`/
`Challenge` existem desde o Módulo 1 (confirmado por grep em todo
`src/modules`: zero ocorrências de código consumindo qualquer um deles antes
deste módulo) — só `src/modules/gamification/README.md` os mencionava.
`Profile.xp`/`Profile.level` também existem desde o Módulo 1, igualmente
nunca escritos por nenhum serviço.

**Reaproveitado sem alteração**:

- `recordAttempt`/`gradeAnswer` (Módulo 3) — nenhuma correção paralela.
- `LessonProgress.status` (Módulo 8) — `COMPLETED`/`MASTERED` lidos, nunca
  redefinidos (seção 26 do prompt).
- `computePerformance` (Módulo 3) — `correctCount`/`byDiscipline` para
  estatísticas de conquista e para o resumo consolidado.
- `getStudentLearningOverview` (Módulo 8), `getReviewPerformance` (Módulo
  5), `getSimulationEvolution` (Módulo 6) — compostos, nunca recalculados,
  em `getStudentProgress`.
- `getTrackProgress`/`getLearningAreaProgress`/`getUnitProgress`/
  `getStageProgress` (Módulo 8) — **re-exportados diretamente**, nenhuma
  reimplementação (seção 21/26 do prompt: "não duplicar a lógica do Módulo
  8").
- `Actor`/`assertRole`/`AuthorizationError` (Módulo 1) — mesma autorização
  de sempre; nenhum sistema novo.
- Convenções: `*.service.ts` (Prisma) + pura sem sufixo (`level.ts`,
  `streak.ts`, `achievement-evaluator.ts`) + `types/*.schema.ts`;
  `TEST_FIXTURE_*`; erro de domínio próprio por bounded context
  (`GamificationValidationError`); guarda de privacidade própria
  (`assertOwnGamificationDataOrAdmin`, mesmo padrão mais restritivo do
  Módulo 5/8 — CONTENT_EDITOR sem acesso automático a dado privado de aluno).

**Entidades novas**: uma só — `GamificationEvent` (ver seção 14).

## 3. Entidades reutilizadas

`Achievement`, `UserAchievement`, `Streak`, `DailyGoal` — todas com o
schema exato já definido desde o Módulo 1 (ver `prisma/schema.prisma`,
seção GAMIFICAÇÃO), sem nenhum campo adicionado ou alterado. `Challenge`
permanece **fora de escopo** — nenhum serviço o usa; o prompt do módulo não
pediu desafios diários/semanais, só XP/nível/streak/meta/conquista/progresso.
`Profile.xp`/`Profile.level` também permanecem **deliberadamente intocados**
(ver seção 18, decisão técnica sobre fonte única de verdade).

## 4. Entidades novas

Um único modelo, aditivo:

```prisma
model GamificationEvent {
  id             String   @id @default(cuid())
  userId         String
  type           String
  idempotencyKey String   @unique
  xpAwarded      Int
  referenceType  String?
  referenceId    String?
  metadata       Json?
  createdAt      DateTime @default(now())
}
```

`type` é vocabulário validado em código (`GAMIFICATION_EVENT_TYPES`,
`src/config/gamification.ts`), não um enum do Postgres — mesmo padrão de
`ContentAuditLog.action`/`ReviewLog.origin`, porque a lista de origens de
XP deve poder crescer sem migration. `idempotencyKey` é o mecanismo de
idempotência (seção 8/40 do prompt).

## 5. XP

Política centralizada em `src/config/gamification.ts` (`XP_REWARDS`):
`LESSON_COMPLETED=50`, `LESSON_QUESTION_CORRECT=10`,
`REVIEW_SESSION_COMPLETED=20`, `REVIEW_QUESTION_CORRECT=5`,
`SIMULATION_COMPLETED=100`, `DIAGNOSTIC_COMPLETED=75`,
`DAILY_GOAL_COMPLETED=25` — valores literais do "exemplo inicial de
política" do prompt. XP de conquista vem de `Achievement.xpReward`, não
desta config (é o próprio dono desse valor). `xp.service.ts.awardXp()` é o
ÚNICO ponto de escrita no ledger; nunca aceita `amount < 0` (`RangeError`).

## 6. Níveis

`level.ts` (puro) — `LEVEL_XP_TABLE` (`src/config/gamification.ts`) gerada
por uma fórmula progressiva determinística (o prompt permite
explicitamente essa alternativa ao exemplo ilustrativo): cada nível exige
50 XP a mais de intervalo que o anterior, começando em 100 (nível 1 = 0 XP,
nível 2 = 100 XP, nível 3 = 250 XP, nível 4 = 450 XP, ...). Não é uma cópia
literal do exemplo do prompt (100/250/500/850) — decisão registrada na
seção 18. `calculateLevelFromXp`, `getXpRequiredForLevel`,
`getXpProgressToNextLevel` são funções puras, testadas sem banco.
`MAX_LEVEL=50`; acima disso, `nextLevel`/`nextLevelXp`/`xpRemaining` ficam
`null` e `progressPercentage=100`.

## 7. Streak

`streak.ts` (puro) — "dia estudado" nunca usa `Date.getDate()` do processo:
`getStudyDayKey(date, offsetMinutes)` desloca o timestamp por um offset
fixo (`DEFAULT_TIMEZONE_OFFSET_MINUTES=-180`, América/São Paulo) e extrai
`YYYY-MM-DD` via `getUTC*`, determinístico independente do TZ do host. Não
existe timezone por usuário no domínio ainda (`User`/`Profile` não têm esse
campo) — a abstração mínima pedida pelo prompt (seção 13) é exatamente essa
constante centralizada, documentada como fallback para quando o domínio
ganhar timezone por usuário. `deriveNextStreakState` (puro): mesmo dia não
soma; dia seguinte soma 1; qualquer lacuna reinicia em 1; `longestStreak`
nunca diminui. `streak.service.ts.recordStudyActivity(userId, now)`
persiste em `Streak` (Módulo 1) — primeiro serviço a escrever nele.
`minutesStudied` é **deliberadamente nunca escrito** (seção 15: nenhum
módulo anterior mede duração de estudo de forma confiável).

## 8. Metas

`Streak`/`DailyGoal` — só uma meta modelada pelo schema: "ganhar N XP hoje"
(`DailyGoal.targetXp`/`todayXp`/`lastResetAt`, Módulo 1). Metas por
contagem (10 questões, 1 lição) ou por tempo exigiriam campos que o schema
não tem — decisão registrada na seção 18, não implementadas.
`daily-goal.service.ts.applyXpToDailyGoal(userId, xpAmount, now)`: reinicia
`todayXp` quando o dia (seção 13) virou, soma o XP recebido, e — só na
PRIMEIRA vez que isso cruza o alvo neste dia — concede a recompensa da meta
(idempotente por `DAILY_GOAL_COMPLETED:<userId>:<dayKey>`). O bônus da meta
não é somado de volta a `todayXp` (evita circularidade).

## 9. Conquistas

`Achievement.criteria` (Json, Módulo 1) validado em runtime por
`AchievementCriteriaSchema` (`types/achievement-criteria.schema.ts`) contra
7 tipos de critério: `LESSONS_COMPLETED`, `LESSONS_MASTERED`,
`QUESTIONS_ANSWERED_CORRECT`, `STREAK_DAYS`, `SIMULATIONS_COMPLETED`,
`REVIEW_SESSIONS_COMPLETED`, `DISCIPLINES_STUDIED` — cobrindo literalmente
os exemplos do prompt (seção 18). `STREAK_DAYS` usa o **melhor streak
histórico**, não o atual — uma conquista, uma vez alcançada, nunca é
revogada por uma quebra de streak posterior. `achievement.service.ts`:
`gatherStudentGamificationStats(userId)` reúne os números reais (Módulos
3/5/6/8); `evaluateAndUnlockAchievements(userId)` avalia todas as não
desbloqueadas e desbloqueia (com XP) as que atingiram o critério;
`listAchievementsForUser` é leitura pura (desbloqueadas + próximas com
progresso), nunca desbloqueia nada. Critério malformado é ignorado, não
quebra a avaliação das demais.

## 10. Progresso acadêmico

`student-progress.service.ts`: `getTrackProgress`/`getLearningAreaProgress`/
`getUnitProgress`/`getStageProgress` são **re-exports literais** de
`pedagogy/server/services/learning-progress.service.ts` (Módulo 8) — zero
reimplementação. `getStudentProgress(actor, targetUserId?)` é a única peça
nova: compõe `getStudentLearningOverview` (lições, Módulo 8),
`getReviewPerformance` (revisão, Módulo 5) e `getSimulationEvolution`
(simulados, Módulo 6) num único retorno, sem recalcular nenhuma das três.

## 11. Idempotência

Mecanismo único e central: `GamificationEvent.idempotencyKey` (`@unique`).
Cada tipo de evento usa uma chave determinística sobre a entidade real de
origem — nunca um UUID aleatório:

```
LESSON_COMPLETED:<lessonProgressId>
LESSON_QUESTION_CORRECT:<lessonBlockCompletionId>
REVIEW_SESSION_COMPLETED:<studySessionId>
REVIEW_QUESTION_CORRECT:<reviewLogId>
SIMULATION_COMPLETED:<simulationAttemptId>
DIAGNOSTIC_COMPLETED:<studySessionId>
DAILY_GOAL_COMPLETED:<userId>:<dayKey>
ACHIEVEMENT_UNLOCKED:<userId>:<achievementId>
```

`xp.service.ts.awardXp` pré-checa por `idempotencyKey` antes de criar, e
trata falha de criação (corrida rara) buscando de novo — mesmo padrão
documentado em `lesson-execution.service.ts` (Módulo 8). Conquistas têm uma
segunda camada de idempotência: `@@id([userId, achievementId])` em
`UserAchievement` — impossível desbloquear duas vezes mesmo sem depender só
do ledger. Testado explicitamente (evento 1 → XP concedido; evento 2 igual
→ XP não duplicado) para lição, revisão, simulado, diagnóstico, meta e
conquista.

## 12. Segurança

Nenhuma função de gamificação aceita `xp`/`totalXp`/`level`/`streak`/
`achievementUnlocked`/`goalCompleted` como entrada — os pontos de entrada
(`gamification-events.service.ts`) só recebem o ID da entidade REAL já
concluída (`lessonProgressId`/`reviewSessionId`/`simulationAttemptId`/
`diagnosticSessionId`) e todo valor concedido é sempre recalculado a partir
dela. Testado explicitamente (`gamification-events.service.test.ts`, teste
"anti-fraude" análogo ao do Módulo 8): payload com `isCorrect`/`score`/
`completed`/`mastered`/`userId` forjados continua sendo ignorado porque a
correção em si (`recordAttempt`/`gradeAnswer`, Módulo 3) não foi tocada por
este módulo — a fraude já não passava antes, e a gamificação não abre uma
segunda porta. `xp: 999999`/`level: 100`/`currentStreak: 999`/
`longestStreak: 999` não têm nenhum parâmetro de entrada correspondente em
nenhuma função pública deste módulo — não há como enviá-los.

## 13. Autorização

Reaproveita `Actor`/`assertRole`/`AuthorizationError` (Módulo 1). Nenhum
sistema novo. `assertOwnGamificationDataOrAdmin` (`privacy.ts`) — STUDENT só
os próprios dados; ADMIN pode consultar/processar em nome de qualquer
usuário; CONTENT_EDITOR **não** recebe acesso automático a dado privado de
aluno (seção 32 do prompt) — mesmo padrão mais restritivo já usado no
Módulo 5 (`review/privacy.ts`) e Módulo 8 (`pedagogy/learning-privacy.ts`).

## 14. Auditoria

`ContentAuditLog` (curadoria) **não** é usado por este módulo — ganhar XP,
manter streak, completar meta e desbloquear conquista são eventos de USO do
estudante, não mutação de conteúdo curado (seção 33 do prompt, mesmo
critério já aplicado em Revisão/Simulados/Execução de Lição). O histórico
de `GamificationEvent` (append-only, nunca atualizado após criado) já é
suficiente para rastreabilidade — cada linha tem `type`, `referenceType`/
`referenceId` e `metadata` (ex.: título da lição no momento da concessão),
respondendo "de onde veio este XP" sem precisar de auditoria curatorial.

## 15. Banco / Migrations

Uma migration, **aditiva** (nenhuma tabela/campo/enum existente alterado ou
removido):

```
20260823123146_module9_gamification_event
```

Cria a tabela `GamificationEvent` + índice único em `idempotencyKey` +
índices `(userId, createdAt)` e `type` + FK para `User`. Aplicada e testada
contra o Postgres real de desenvolvimento (`npm run db:start` +
`npx prisma migrate dev`).

## 16. Testes

- Testes anteriores (Módulos 1–8): **384**.
- Testes novos (Módulo 9): **57**, em 9 arquivos:
  - `level.test.ts` (9, puro).
  - `streak.test.ts` (8, puro).
  - `achievement-evaluator.test.ts` (5, puro).
  - `xp.service.test.ts` (6 — concessão, valores, idempotência, payload
    forjado, histórico, privacidade).
  - `streak.service.test.ts` (6 — primeiro dia, consecutivo, mesmo dia,
    quebra, melhor streak, privacidade).
  - `daily-goal.service.test.ts` (5 — progresso, conclusão, recompensa
    única, virada de dia, privacidade).
  - `achievement.service.test.ts` (5 — critério verdadeiro/falso,
    idempotência, listagem desbloqueadas/próximas, privacidade).
  - `gamification-events.service.test.ts` (9 — fluxo completo real de
    lição/revisão/simulado/diagnóstico, cada um com idempotência e
    segurança).
  - `gamification-summary.service.test.ts` (4 — resumo consolidado,
    composição de progresso, re-export, privacidade).
- **Total final: 441.**

Todos executados de verdade (`npx vitest run`) contra o Postgres real,
seis vezes seguidas para confirmar estabilidade sob paralelismo. Cinco das
seis rodadas passaram 441/441; a sexta reproduziu, isoladamente, a mesma
race condition sob execução paralela já documentada em `docs/MODULO-6.md`
(`diagnostic.service.test.ts`) — confirmada como pré-existente (passa
sozinha, `npx vitest run` só daquele arquivo) e não introduzida por este
módulo. Uma segunda categoria de instabilidade sob paralelismo foi
encontrada e **corrigida de verdade** durante este módulo: como
`Achievement` é um catálogo GLOBAL (por design, não é escopado por teste),
duas suítes concorrentes criando `Achievement` de fixture com critérios
alcançáveis por qualquer usuário (ex.: "1 lição concluída") podem, de fato,
desbloquear uma conquista "de outro teste" para o usuário de fixture de um
terceiro arquivo — comportamento correto do sistema, mas que tornava
algumas asserções de XP exato frágeis; os testes foram ajustados para
verificar o mínimo garantido (`toBeGreaterThanOrEqual`) nesses pontos,
preservando a verificação exata de idempotência e do XP específico de cada
atividade (`result.xpGrantedNow`, imune a essa concorrência).

## 17. Typecheck / Lint / Format / Build

```
npm run db:validate   → OK
npm run db:format     → OK
npm run db:generate   → OK
npm run typecheck     → OK (next typegen + tsc --noEmit, sem erros)
npm run lint          → OK (0 erros, 0 warnings)
npm run format:check  → OK (após `npm run format`, que só formatou os arquivos novos/alterados)
npm run test          → 441/441 (ver seção 16)
npm run build         → OK (next build, compilado com sucesso)
```

## 18. Decisões técnicas

- **`Profile.xp`/`Profile.level` permanecem intocados** — `GamificationEvent`
  (ledger, soma agregada) é a ÚNICA fonte de verdade para XP (regra
  explícita do prompt, seção 2: "não criar uma segunda fonte de verdade
  para progresso"); persistir também em `Profile` duplicaria essa verdade e
  exigiria manter os dois sincronizados. Os campos ficam reservados para uma
  futura otimização de cache de leitura, se o volume um dia justificar.
- **`LEVEL_XP_TABLE` usa uma fórmula progressiva própria**, não os números
  ilustrativos do prompt (100/250/500/850) — o prompt permite
  explicitamente essa alternativa ("O importante é: XP → nível ser uma
  função pura e determinística"); a progressão de +50 XP por degrau é mais
  simples de auditar e estender que replicar uma sequência sem padrão
  aritmético limpo.
- **`DailyGoal` só modela meta de XP** — o schema (Módulo 1) não tem campos
  para meta por contagem de atividade ou por minutos; inventar esses
  campos seria uma migration não pedida e um dado (minutos de estudo) sem
  fonte confiável (seção 15 do prompt, aplicada por analogia às metas por
  contagem também).
- **Backfill de XP por questão correta sem tocar no Módulo 8/5** —
  `processLessonCompletionEvent`/`processReviewSessionCompletionEvent` não
  hookam `submitLessonActivity`/`submitReviewAnswer`; leem
  `LessonBlockCompletion`/`ReviewLog` já persistidos e usam o id de cada
  linha como âncora de idempotência. Zero alteração em código do Módulo 5/8.
- **`STREAK_DAYS` usa o melhor streak, não o atual** — consistente com "uma
  conquista já desbloqueada nunca é revertida" (seção 20 do prompt).
- **Hardening de `unlockAchievementOnce`**: se a `Achievement` foi removida
  entre a listagem e a tentativa de desbloqueio (curadoria concorrente, ou —
  como descoberto pelos próprios testes deste módulo sob paralelismo — o
  fim de vida de uma fixture de outro arquivo de teste), a violação de FK é
  tratada como "nada a desbloquear", não como erro fatal — processar
  gamificação de um evento real não deve quebrar por causa de uma conquista
  que já não existe mais.

## 19. Limitações

- Sem timezone por usuário no domínio ainda — `DEFAULT_TIMEZONE_OFFSET_MINUTES`
  (`src/config/gamification.ts`) é um fallback fixo para todos os
  usuários, documentado como tal.
- `minutesStudied` (`Streak`) nunca é escrito — nenhuma fonte de dado
  confiável de duração de estudo existe ainda em nenhum módulo anterior.
- Metas diárias são só "ganhar N XP" — sem meta por contagem de atividade
  específica (questões/lições/revisões) ou por tempo.
- `Challenge` (desafios diários/semanais/de evento) permanece inteiramente
  fora de escopo — nenhum serviço o usa.
- Não há um "gatilho automático": os quatro `processXCompletionEvent` são
  chamados explicitamente por quem orquestra o fluxo, depois da ação real
  concluída — não há barramento de eventos/hooks (consistente com o projeto
  não ter camada HTTP própria ainda em nenhum módulo).

## 20. Divergências

Nenhuma.

## 21. Integração com módulos anteriores

- **Módulo 3** (avaliações/diagnóstico): `computePerformance`,
  `AttemptContext.DIAGNOSTIC`, `finishDiagnostic`.
- **Módulo 5** (revisão): `StudyMode.REVISAO`, `ReviewLog`,
  `finishReviewSession`.
- **Módulo 6** (simulados): `SimulationAttempt.finishedAt`,
  `finishSimulation`, `getSimulationEvolution`.
- **Módulo 8** (execução de lição): `LessonProgress`/`LessonBlockCompletion`,
  `completeLesson`, `getStudentLearningOverview`,
  `learning-progress.service.ts` (re-exportado, não duplicado).

## 22. Arquivos principais

```
prisma/schema.prisma                         (+ enum/model aditivos)
prisma/migrations/20260823123146_module9_gamification_event/
src/config/gamification.ts
src/modules/gamification/
  README.md
  types/achievement-criteria.schema.ts
  server/services/
    errors.ts
    privacy.ts
    level.ts (+ .test.ts)
    streak.ts (+ .test.ts)
    achievement-evaluator.ts (+ .test.ts)
    xp.service.ts (+ .test.ts)
    streak.service.ts (+ .test.ts)
    daily-goal.service.ts (+ .test.ts)
    achievement.service.ts (+ .test.ts)
    gamification-events.service.ts (+ .test.ts)
    student-progress.service.ts
    gamification-summary.service.ts (+ .test.ts)
src/test/fixtures.ts                         (createFixtureAchievement + cleanup)
docs/MODULO-9.md
docs/ARQUITETURA.md                          (apêndice de status, aditivo)
```

## 23. O que não foi implementado

UI completa, dashboard visual, login/autenticação real (JWT/OAuth),
pagamentos/assinaturas, ranking/leaderboard, notificações, app mobile,
IA/chatbot/LLM, scraping/ETL, conteúdo de biblioteca/atualidades novo,
conteúdo acadêmico real — nada disso foi antecipado, por instrução
explícita do prompt do módulo.

## 24. Conteúdo real

Nenhum conteúdo real foi inserido — nenhuma conquista de produto
("Primeira Lição", "Estudante Dedicado" etc.) foi cadastrada de verdade;
só fixtures `TEST_FIXTURE_*`, removidas por cada teste ao final
(`cleanupFixtures`).

## 25. Regressão

Todos os 384 testes dos Módulos 1–8 continuam passando, junto com os 57
novos (441 no total) — executados de verdade seis vezes seguidas contra o
Postgres real (ver seção 16).

## 26. Próximo passo

Módulo 9 concluído. Módulo 10 NÃO foi iniciado. Aguardando autorização
explícita.
