# Módulo 6 — Simulados Completos, Desempenho Acadêmico e Preparação para Provas

> Constrói sobre os Módulos 1–5 sem alterar a arquitetura conceitual aprovada em `docs/ARQUITETURA.md`. Bounded context principal: `src/modules/simulation`. Nenhuma IA/LLM, nenhuma recomendação inexplicável, nenhuma aleatoriedade não controlada. Não implementa UI, dashboard visual, gamificação, biblioteca, notícias, ETL/scraping, integração externa, autenticação/sessão real, ou Módulo 7.

## 1. Objetivo

Transformar `Simulation`/`SimulationQuestion`/`SimulationAttempt` (só schema desde o Módulo 1) num sistema completo de simulados: montagem determinística (personalizada, por prova real, por revisão espaçada), execução segura, correção 100% no servidor, e análise de desempenho (disciplina/conceito/dificuldade/tipo/prova/área pedagógica/evolução), com recomendações explicáveis.

## 2. Escopo

Implementado: as 16 capacidades da seção 2 do prompt (simulados completos e personalizados, filtros por área/disciplina/conceito/dificuldade/quantidade/prova/banca/ano, simulados por prova real, correção detalhada, desempenho por disciplina/conceito, evolução histórica, pontos fortes/lacunas, recomendação determinística, comparação entre simulados).

Fora do escopo (confirmado vazio): UI, dashboard visual, app mobile, chatbot, LLM/IA generativa, scraping/ETL, integração externa, notícias, biblioteca, assinaturas/pagamentos, notificações, gamificação, ranking social, fórum/chat, autenticação/sessão real, Módulo 7 em diante.

## 3. Arquitetura

Bounded context `src/modules/simulation`, dependente de `assessment` (Módulo 3 — `recordAttempt`/`gradeAnswer`/`listQuestions`/`computePerformance`), `pedagogy` (Módulo 4 — travessia read-only do grafo), `review` (Módulo 5 — `getReviewQueue`/`ensureReviewItem`/`pickQuestionForConcept`, só leitura/criação, nunca recálculo), e `curation`/`server/auth` (Módulos 1–2). Nenhuma dependência inversa foi criada — `assessment`/`pedagogy`/`review` não importam nada de `simulation`.

```
src/config/simulation.ts                              — constantes (limites, classificação reaproveitada, pesos de recomendação)
src/modules/simulation/
├── types/
│   └── simulation.schema.ts                          — SimulationFiltersSchema, BuildSimulationInputSchema (3 modos), SubmitSimulationAnswerInputSchema
└── server/services/
    ├── deterministicShuffle.ts                        — PURA: PRNG determinístico (mulberry32) + shuffle seedado
    ├── errors.ts                                       — SimulationValidationError
    ├── privacy.ts                                      — assertOwnSimulationDataOrCurator
    ├── simulation-builder.service.ts                   — buildSimulation (PERSONALIZED/EXAM_EDITION/REVIEW)
    ├── simulation.service.ts                           — createSimulationRecord, createSimulationFromQuestionIds, publish/archive, visibilidade, listSimulations
    ├── simulation-attempt.service.ts                   — startSimulation, submitSimulationAnswer, finishSimulation
    ├── simulation-grading.service.ts                   — calculateSimulationResult
    ├── simulation-performance.service.ts                — getSimulationPerformanceBreakdown, getSimulationEvolution
    ├── simulation-recommendation.service.ts             — getStudyRecommendation, getNextSimulationRecommendation
    └── simulation-query.service.ts                      — getSimulationAttemptDetail, listSimulationAttemptsForUser, listAvailableDisciplines
```

**Duas extrações para eliminar duplicação (seção 4 do prompt — "não crie entidades/lógica duplicada"):**

- `pedagogy-query.service.getPedagogicalContextForConcepts` (novo, Módulo 4) — a travessia Concept→Lesson→Stage→Unit→Area→Track vivia só em `review/reviewContext.ts` (Módulo 5); agora é uma função pública de `pedagogy` (dona do grafo), reaproveitada por `review` (refatorado para delegar) e por `simulation`.
- `questionQuery.service.toPublicQuestionView` (novo, Módulo 3) — existia como cópia idêntica em `diagnostic.service.ts` e `reviewSession.service.ts`; extraída para o dono de `Question`, os dois consumidores antigos foram atualizados para importá-la, e `simulation` é o terceiro consumidor.

## 4. Serviços

| Arquivo                                | Funções principais                                                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simulation-builder.service.ts`        | `buildSimulation(actor, input)` — 3 modos: `PERSONALIZED` (filtros livres), `EXAM_EDITION` (prova real), `REVIEW` (fila de revisão + erros anteriores)                     |
| `simulation.service.ts`                | `createSimulationRecord` (baixo nível), `createSimulationFromQuestionIds` (curadoria manual), `publishSimulation`, `archiveSimulation`, `getSimulation`, `listSimulations` |
| `simulation-attempt.service.ts`        | `startSimulation`, `submitSimulationAnswer`, `finishSimulation`                                                                                                            |
| `simulation-grading.service.ts`        | `calculateSimulationResult`                                                                                                                                                |
| `simulation-performance.service.ts`    | `getSimulationPerformanceBreakdown`, `getSimulationEvolution`                                                                                                              |
| `simulation-recommendation.service.ts` | `getStudyRecommendation`, `getNextSimulationRecommendation`                                                                                                                |
| `simulation-query.service.ts`          | `getSimulationAttemptDetail`, `listSimulationAttemptsForUser`, `listAvailableDisciplines`                                                                                  |
| `deterministicShuffle.ts`              | `deterministicShuffle` (PRNG mulberry32 seedado)                                                                                                                           |

Reaproveitados sem alteração de significado: `Actor`/`assertRole`/`CURATOR_ROLES`/`PUBLISHER_ROLES` (Módulo 2), `recordAttempt`/`gradeAnswer` (Módulo 3), `assertArchivable`/`NotFoundError` (Módulo 2), `AUDIT_ACTIONS`/`recordAudit` (Módulo 2), `getReviewQueue`/`ensureReviewItem`/`pickQuestionForConcept` (Módulo 5).

Estendidos (Módulo 3, aditivo — seção 4 do prompt: "reaproveite entidades existentes"):

- `questionQuery.service.listQuestions` ganhou `examBoardId`/`organizationId`/`positionId`/`yearFrom`/`yearTo`/`tagIds` (faltavam para os filtros de simulado da seção 6.1/25 — `examEditionId`/`year`/`difficulty`/conceito etc. já existiam desde o Módulo 3).
- `performance.service.computePerformance` ganhou o filtro opcional `simAttemptId`, permitindo reaproveitar 100% o bucketing por disciplina/conceito/dificuldade/tipo já existente em vez de duplicá-lo em `simulation-performance.service.ts`.

## 5. Fluxo de simulado

```
buildSimulation(actor, input)     — monta Simulation + SimulationQuestion (ordem determinística)
        ↓
startSimulation(actor, id)        — cria SimulationAttempt, devolve composição pública (sem gabarito)
        ↓
submitSimulationAnswer(actor, …)  — delega a recordAttempt/gradeAnswer (Módulo 3), por questão
        ↓
finishSimulation(actor, id)       — calculateSimulationResult + ensureReviewItem (Módulo 5) para erros
```

Idêntico ao fluxo pedido na seção 11 do prompt — nenhuma etapa reimplementa correção.

## 6. Tipos de simulado implementados

- **PERSONALIZADO** (6.1): filtros — disciplina, conceito, dificuldade, tipo de questão, quantidade, prova/edição/banca/órgão/cargo, ano/faixa de anos, tags, trilha/área/unidade/etapa/lição, e os 3 flags de "já respondida" (seção 9: `includePreviouslyAnswered`, `excludePreviouslyCorrect`, `includePreviouslyWrong`).
- **POR PROVA** (6.2): a partir de uma `ExamEdition` real — usa todas as questões publicadas da edição por padrão, ou uma amostra determinística se `count` for informado.
- **POR DISCIPLINA/DIFICULDADE** (6.3/6.4): são casos do modo PERSONALIZADO (`filters.disciplineId`/`filters.difficulty`) — nenhum modo/entidade paralela; `listAvailableDisciplines()` devolve a lista real do banco (nunca hardcoded).
- **DE REVISÃO** (6.5): usa `getReviewQueue` (Módulo 5) + questões erradas anteriormente (`QuestionAttempt.isCorrect=false`) — só leitura, nunca recalcula SM-2-lite/prioridade/estado.

## 7. Seleção determinística

Nenhum `Math.random()` em regra de negócio (seção 8). `deterministicShuffle(items, seed)` usa um PRNG determinístico (mulberry32): mesma `seed` → mesma ordem sempre (`DEFAULT_SHUFFLE_SEED = 0` quando o chamador não informa uma). Testado explicitamente (`deterministicShuffle.test.ts`, 5 testes): reprodutibilidade, não perde/duplica itens, não muta o array de entrada.

## 8. Correção

100% delegada a `gradeAnswer`/`recordAttempt` (Módulo 3) — `submitSimulationAnswer` só valida (dono da tentativa, sessão aberta, questão pertence ao simulado, não respondida antes) e repassa com `context=SIMULATION` (já existia desde o Módulo 1) e `simAttemptId`. Nenhum mecanismo de correção paralelo.

## 9. Resultados e desempenho

`calculateSimulationResult` — total (respondidas), corretas, erradas, percentual, classificação. `getSimulationPerformanceBreakdown` — reaproveita `computePerformance(userId, {simAttemptId})` para disciplina/conceito/dificuldade/tipo, e adiciona prova (`byExamEdition`, agrupado por `ExamEdition.name`, com bucket `SEM_PROVA` para questões autorais) e área pedagógica (`byPedagogyTrack`, via `getPedagogicalContextForConcepts`).

## 10. Evolução

`getSimulationEvolution` — histórico cronológico (`startedAt` asc) de `SimulationAttempt.score` (tentativas finalizadas), com primeiro/último/melhor/média/variação/tendência. Tendência (`MELHORANDO`/`PIORANDO`/`ESTAVEL`/`SEM_DADOS`) compara o primeiro e o último resultado com uma margem mínima (`EVOLUTION_TREND_EPSILON = 1` ponto percentual) para não reagir a ruído — determinística, sem IA.

## 11. Classificação de desempenho

**Não criou uma política nova** (seção 18 do prompt: "se já existir, reutilizar"). `classifyPerformance()` (`config/simulation.ts`) reaproveita integralmente `MASTERY_BANDS`/`percentageToMasteryLevel` (Módulo 3, mesmas faixas 0–20/21–40/41–60/61–80/81–100) e só adiciona os rótulos em prosa do prompt ("muito fraco".."excelente") para o mesmo valor.

## 12. Lacunas e recomendações

`getStudyRecommendation` classifica cada conceito (amostra ≥ `MIN_SAMPLE_SIZE_FOR_RECOMMENDATION=3`) em **lacuna crítica** (≤20%, mesma faixa INICIANTE do Módulo 3), **lacuna moderada** (21–40%, `WEAK_CONCEPT_THRESHOLD`) ou **ponto forte** (≥61%, `STRONG_CONCEPT_THRESHOLD`) — reaproveitando os limiares do diagnóstico, não uma segunda régua. Cada item aponta para entidades reais (`Concept`, `ReviewItem` existente — inclusive um criado por `finishSimulation` ao errar —, `Lesson`/`Stage`/`Unit`/`Track` via `getPedagogicalContextForConcepts`) e traz uma justificativa (`"{pct}% de acerto em {n} questão(ões)."`). `getNextSimulationRecommendation` aponta a disciplina de pior desempenho com amostra suficiente, sugerindo quantidade/dificuldade/participação — sem IA, sem criar trilha nova.

## 13. Integração com revisão espaçada (Módulo 5)

`finishSimulation`, ao processar erros, chama **só** `ensureReviewItem(actor, {scope:"QUESTION", questionId})` — cria o `ReviewItem` se não existir; nunca recalcula `intervalDays`/`easeFactor`/`state`/prioridade (isso é exclusivo de `submitReviewAnswer`, Módulo 5). Idempotente: finalizar duas vezes não duplica o `ReviewItem` (testado).

## 14. Integração com diagnóstico (Módulo 3)

Não substituído. `simulation` não importa nada de `diagnostic.service.ts` — o diagnóstico continua o único mecanismo de "primeiro nível". A ponte é indireta: um simulado alimenta `QuestionAttempt`/`ReviewItem`, que por sua vez alimentam `computePerformance`/lacunas — o mesmo dado, sem duplicar a lógica de identificação de lacunas do diagnóstico (que já usa os mesmos `WEAK_CONCEPT_THRESHOLD`/`STRONG_CONCEPT_THRESHOLD` reaproveitados aqui).

## 15. Segurança

`BuildSimulationInputSchema`/`SubmitSimulationAnswerInputSchema` não têm campos `isCorrect`/`score`/`percentage`/`finalResult`/`userId`/`priority`/`state` — mesmo que o cliente os envie (testado explicitamente com um payload forjado), são ignorados: `isCorrect` vem de `gradeAnswer`; `userId` vem sempre de `actor.userId`; `score`/`percentage` são sempre recalculados por `calculateSimulationResult`. A composição pública (`toPublicQuestionView`) nunca inclui `isCorrect`/`answerKey`/gabarito.

- **STUDENT**: monta (`buildSimulation`, para si mesmo), inicia, responde, finaliza, consulta seus próprios resultados/evolução/recomendações. Bloqueado de: `createSimulationFromQuestionIds`, `publishSimulation`, `archiveSimulation`, responder/finalizar tentativa alheia, ler simulado DRAFT de outro aluno.
- **CONTENT_EDITOR**: cria simulados administrativos (`createSimulationFromQuestionIds`), arquiva; não publica. Pode consultar dados de qualquer aluno para curadoria/suporte (mesma convenção do Módulo 3, `getAttempt`) — deliberadamente diferente da restrição do Módulo 5 (ver seção 21, "Divergências").
- **ADMIN**: tudo do CONTENT_EDITOR + publica.

## 16. Auditoria

Gerada por: `createSimulationFromQuestionIds`, `publishSimulation`, `archiveSimulation` (ações administrativas). **Não gerada** por: `buildSimulation` (autosserviço do aluno, mesmo padrão de `ensureReviewItem` no Módulo 5), `startSimulation`, `submitSimulationAnswer`, `finishSimulation` (eventos de uso — seção 31 do prompt, aplicada literalmente).

## 17. Transações e idempotência

`createSimulationRecord` grava `Simulation`+`SimulationQuestion` numa única `$transaction`. `submitSimulationAnswer` reaproveita a transação já existente dentro de `recordAttempt`. `finishSimulation` é idempotente (mesmo padrão de `finishDiagnostic`/`finishReviewSession`): chamar de novo devolve o mesmo resultado, sem duplicar o `ReviewItem` nem sobrescrever `finishedAt`. Duplicação impedida em 3 camadas: `@@id([simulationId, questionId])` (nunca duas linhas da mesma questão no mesmo simulado), checagem explícita de resposta duplicada por questão numa tentativa, e `Set` de deduplicação na composição do builder.

## 18. Banco / Migrations

Uma migration real, aplicada no Postgres real de desenvolvimento:

- `20260819224748_module6_simulation_status_and_owner` — troca `Simulation.isPublished Boolean` por `Simulation.status PublicationStatus @default(DRAFT)` (necessário: um booleano não representa "arquivado", exigido pela seção 29 do prompt); adiciona `Simulation.createdByUserId String?` (distingue simulado curado de personalizado); adiciona `SIMULATION` a `AuditableEntityType` (aditivo). `AttemptContext.SIMULATION` **já existia** desde o Módulo 1 — nenhuma migration foi necessária para o contexto de tentativa (seção 12 do prompt, resolvida sem alteração de schema).

## 19. Testes

**291 testes, 44 arquivos, todos verdes** (243 herdados dos Módulos 1–5, intactos + 48 novos deste módulo, em 7 arquivos novos + extensões em 2 arquivos existentes): `deterministicShuffle.test.ts` (5), `simulation-builder.service.test.ts` (11), `simulation.service.test.ts` (10), `simulation-attempt.service.test.ts` (8), `simulation-performance.service.test.ts` (4), `simulation-recommendation.service.test.ts` (4), `simulation-query.service.test.ts` (3); `questionQuery.service.test.ts` (+3, cobrindo os novos filtros). Cobertura literal da seção 34: construção (filtros válidos/inválidos, quantidade, publicadas/não publicadas, ausência de questões, duplicação), execução (iniciar/responder/responder de novo/questão de outro simulado/usuário errado), segurança (`isCorrect`/`score`/`percentage`/`userId` forjados — todos ignorados), resultado (0%/100%/intermediário/por disciplina/conceito/dificuldade), histórico (primeiro simulado, múltiplos, evolução, melhor, média, tendência), recomendação (lacuna crítica/moderada, ponto forte, ausência de dados, amostra insuficiente), integração Módulo 5 (erro → `ReviewItem`, sem duplicar SM-2-lite).

**Antes → depois:** 243 → 291 (48 testes novos, 0 removidos, 0 regressões de lógica).

**Nota de robustez (transparência exigida pela seção 44 do prompt):** durante a verificação, uma execução paralela completa (`npx vitest run`) mostrou, de forma intermitente, uma falha em `diagnostic.service.test.ts` (Módulo 3) — investigada e confirmada como uma condição de corrida pré-existente: `diagnostic.service.ts.fetchCandidateQuestions()` busca **todas** as questões publicadas+tagueadas do banco de desenvolvimento compartilhado (comportamento correto em produção), sem se restringir às fixtures do próprio teste; quando muitos arquivos de teste rodam em paralelo contra o mesmo Postgres real, esse teste pode escolher uma questão criada por OUTRO arquivo, cuja limpeza (`afterAll`) pode rodar concorrentemente. O Módulo 6 não introduziu esse padrão (existe desde o Módulo 3) mas aumentou sua probabilidade ao acrescentar bastante mais fixtures publicadas+tagueadas ao pool compartilhado. Confirmado com `npx vitest run --no-file-parallelism` (elimina a corrida entre arquivos): **291/291 determinístico**, duas vezes seguidas. Nenhuma linha de `diagnostic.service.test.ts` foi alterada — a fragilidade é pré-existente e fica documentada aqui, não escondida.

## 20. Decisões técnicas

1. **`Simulation.status PublicationStatus` substitui `isPublished Boolean`** — única forma de representar "arquivado" (exigido pela seção 29), consistente com o resto do projeto.
2. **`Simulation.createdByUserId` (novo, opcional)** — necessário para simulados PERSONALIZADOS/DE REVISÃO serem imediatamente iniciáveis pelo próprio autor sem depender de publicação por um ADMIN, sem abrir acesso a rascunhos de outros alunos.
3. **`buildSimulation` sem gate de role** — qualquer `Actor` monta para si mesmo (seção 2 do prompt: "o aluno... faz simulados personalizados"); a curadoria administrativa é uma função distinta (`createSimulationFromQuestionIds`, `CURATOR_ROLES`).
4. **`getPedagogicalContextForConcepts` extraída para `pedagogy`** e **`toPublicQuestionView` extraída para `assessment`** — duas duplicações reais entre módulos anteriores, fechadas na origem em vez de replicadas uma terceira vez (seção 4 do prompt, aplicada retroativamente às duplicatas que o próprio prompt tornou visíveis).
5. **`computePerformance` ganha `simAttemptId`** — evita duplicar o bucketing por disciplina/conceito/dificuldade/tipo em `simulation-performance.service.ts`.
6. **Privacidade de simulado segue a convenção do Módulo 3** (CONTENT_EDITOR pode consultar qualquer aluno), não a do Módulo 5 (que restringe) — o próprio prompt deste módulo (seção 29) descreve poderes de curadoria para CONTENT_EDITOR sem mencionar a restrição explícita que o Módulo 5 tinha; documentado como divergência deliberada, não inconsistência.
7. **`finishSimulation` é idempotente, não um erro em dupla chamada** — mesmo padrão já estabelecido por `finishDiagnostic`/`finishReviewSession`.
8. **Fallback de ordem em simulado por prova** — `Question` não tem hoje um campo de ordem própria dentro de uuma `ExamEdition`; o builder ordena por `id` (determinístico) e grava essa ordem em `SimulationQuestion.order` — se um campo de ordem nativo existir no futuro, só o `orderBy` interno muda.

## 21. Divergências

- Privacidade de simulado (CONTENT_EDITOR com acesso amplo) diverge da privacidade de revisão do Módulo 5 (CONTENT_EDITOR restrito) — deliberado, ver decisão 6.
- `Simulation.isPublished` (Módulo 1) foi removido, não só descontinuado — decisão 1; nenhuma linha de dado real existia para migrar (só fixtures de teste, sempre limpas).

## 22. Limitações

- `byExamEdition` agrupa por `ExamEdition.name` (string), não por id — suficiente para exibição, mas duas edições com nomes iguais colidiriam no mesmo bucket (documentado, não esperado no volume atual).
- `pickQuestionForConcept` (Módulo 5, reaproveitado no modo REVIEW) continua determinístico por `id`, sem lógica de variedade — herdado, não uma limitação nova deste módulo.
- Sem sessão/autenticação real (herdado) — `Actor` explícito.
- Nenhuma rota HTTP/Server Action exposta — só serviços de domínio.
- A corrida de teste descrita na seção 19 é uma fragilidade pré-existente de `diagnostic.service.test.ts` sob alta concorrência de fixtures — não corrigida neste módulo (fora do escopo: exigiria tocar o Módulo 3 sem necessidade funcional deste módulo).

## 23. O que não foi implementado (explícito)

Nenhum avanço para o Módulo 7. Não implementado, de propósito: UI de qualquer tipo; dashboard visual; aplicativo mobile; chatbot; LLM/IA generativa; recomendação por IA; scraping/ETL; integração externa; notícias/atualidades; biblioteca de livros; assinaturas/pagamentos; notificações; gamificação; ranking social; fórum/chat; autenticação/sessão real.

## 24. Conteúdo real

Nenhum conteúdo acadêmico real foi inserido. Toda fixture usa o prefixo `TEST_FIXTURE_`, é criada e removida em cada `afterAll` (`cleanupFixtures`, estendida neste módulo com `simulationIds`/`simulationAttemptIds` e coleta defensiva de `ReviewItem` dinamicamente criado por `finishSimulation`).

## 25. Próximos módulos

Módulo 6 concluído. Módulo 7 não iniciado. Aguardando autorização explícita.
