# Módulo 5 — Revisão, Memorização e Aprendizagem Adaptativa (determinística)

> Constrói sobre os Módulos 1–4 sem alterar a arquitetura conceitual aprovada em `docs/ARQUITETURA.md`. Bounded context principal: `src/modules/review`. Nenhuma IA/LLM, nenhuma recomendação inexplicável — toda decisão é uma fórmula determinística sobre dados reais já gravados. Não implementa UI, dashboard visual, gamificação funcional, biblioteca, notícias, ETL/scraping, ou autenticação/sessão real.

## 1. Objetivo

Transformar `ReviewItem`/`TopicMastery` (só schema desde o Módulo 1) num sistema funcional de revisão espaçada que responde: "o que este aluno precisa revisar agora, por quê, com que prioridade e com que frequência?" — de forma determinística e explicável, preparando (sem implementar) a base para aprendizagem adaptativa futura.

## 2. Escopo

Implementado: as 27 capacidades da seção 6 do prompt (sistema de itens revisáveis, estados determinísticos, histórico append-only, algoritmo de revisão espaçada, ajuste por dificuldade, prioridade, fila com filtros/limite diário, revisão imediata após erro/acerto, integração com conceitos fracos do diagnóstico, integração com pedagogia, revisão de questões, sessões, segurança, privacidade, auditoria seletiva, desempenho consolidado, recomendação explicável).

Fora do escopo (confirmado vazio): UI, dashboard visual, gamificação funcional, biblioteca, notícias/atualidades, ETL/scraping, integração com API externa, LLM/IA, chatbot, notificações, app mobile, autenticação/sessão real, Módulo 6 em diante. `TopicMastery` continua sem nenhum serviço escrevendo nela (ver seção 17 — limitações).

## 3. Arquitetura

Bounded context `src/modules/review`, dependente de `assessment` (Módulo 3 — reaproveita `recordAttempt`/`gradeAnswer`/`getDiagnosticResult`), `knowledge` (Módulo 2 — `Concept.difficulty`), `pedagogy` (Módulo 4 — travessia read-only de `LessonKnowledgeTag`/`StageLesson`/`UnitStage`/`AreaUnit`/`TrackArea`), e `curation`/`server/auth` (Módulos 1–2 — `NotFoundError`, `Actor`/`assertRole`). Nenhum módulo anterior foi alterado para depender de `review` — a direção de dependência estabelecida em `docs/ARQUITETURA.md` (camadas superiores dependem das inferiores, nunca o inverso) foi preservada.

```
src/config/review.ts                                — constantes da política (staircase, ease factor, pesos de prioridade, limite diário)
src/modules/review/
├── types/
│   ├── review-item.schema.ts                        — já existia (Módulo 1)
│   └── review-session.schema.ts                     — NOVO: EnsureReviewItemInputSchema, SubmitReviewAnswerInputSchema
└── server/services/
    ├── spacedRepetition.ts                           — PURA: computeNextReview, deriveActiveState
    ├── reviewPriority.ts                             — PURA: computeReviewPriority, explainReviewPriority
    ├── reviewContext.ts                               — ponte com dados reais (errorRate, difficulty, weak concept, contexto pedagógico, escolha de questão)
    ├── privacy.ts                                     — assertOwnReviewDataOrAdmin
    ├── errors.ts                                      — ReviewValidationError
    ├── reviewItem.service.ts                          — ensureReviewItem, getReviewItem, listReviewItemsForUser, suspend/resumeReviewItem
    ├── reviewQueue.service.ts                         — getReviewQueue
    ├── reviewSession.service.ts                       — startReviewSession, submitReviewAnswer, finishReviewSession, getReviewSessionSummary
    ├── reviewPerformance.service.ts                   — getReviewPerformance
    ├── reviewRecommendation.service.ts                — getReviewRecommendations
    └── reviewDiagnosticBridge.service.ts               — enqueueWeakConceptsFromDiagnostic
```

## 4. Entidades utilizadas

**Reaproveitadas sem alteração de significado:** `ReviewItem` (agora funcional), `Question`/`QuestionOption`/`QuestionAttempt`/`QuestionKnowledgeTag` (Módulo 3), `Concept`/`Discipline`/`School`/`Theory` (Módulo 2), `Track`/`LearningArea`/`Unit`/`Stage`/`Lesson`/`LessonKnowledgeTag`/`StageLesson`/`UnitStage`/`AreaUnit`/`TrackArea` (Módulo 4), `StudySession` (mode `REVISAO`, já existia como valor do enum `StudyMode` desde o Módulo 1, sem consumidor até agora — mesmo padrão do diagnóstico), `ContentAuditLog` (não usado neste módulo — ver seção 12).

**Novas (schema, seção 18 abaixo):** enum `ReviewState`; campo `ReviewItem.state`; model `ReviewLog`.

**Deliberadamente NÃO criadas** (examinadas antes de decidir): uma entidade "ReviewSession" (reaproveita `StudySession`); uma entidade "conceito fraco" (reaproveita o cálculo do diagnóstico, generalizado); um campo de dificuldade paralelo (reaproveita `Difficulty`/`Concept.difficulty`/`Question.difficulty`); contadores de acerto/erro por item persistidos à parte (derivados de `QuestionAttempt`/`ReviewLog` sob demanda).

## 5. Algoritmo de revisão espaçada ("SM-2-lite")

Documentado em detalhe em `config/review.ts` (nenhuma política anterior existia — `easeFactor`/`intervalDays`/`repetitions` eram só schema desde o Módulo 1, sem serviço calculando-os). Escolhida uma variante simplificada do SM-2, **sem os 6 graus de qualidade (0–5)** do original — só o binário acerto/erro que `gradeAnswer` já produz:

- **Acerto:** `repetitions += 1`. Enquanto `repetitions <= 5`, o intervalo segue a escada literal do prompt (`[1, 3, 7, 14, 30]` dias); depois disso, `intervalDays = intervalDays_anterior × easeFactor`. `easeFactor` sobe (+0.05, teto 3.0). Estado: `REVIEW` até a 5ª repetição consecutiva, depois `MASTERED`.
- **Erro:** `repetitions = 0`, `intervalDays` volta ao mínimo (1 dia), `easeFactor` desce (−0.2, piso 1.3), estado volta para `LEARNING`.
- **Ajuste por dificuldade (seção 10 do prompt):** o intervalo calculado é multiplicado por `DIFFICULTY_INTERVAL_MULTIPLIER[difficulty]` — INICIANTE 1.15× (fica mais tempo fora da fila) até DOMINIO 0.7× (volta mais rápido). Dificuldade vem de `Question.difficulty` (scope QUESTION) ou `Concept.difficulty` (scope CONCEPT) — nenhum sistema de dificuldade paralelo.
- Intervalo sempre clampado a `[1, 180]` dias.

Função pura `computeNextReview(current, isCorrect, difficulty, now)` — sem Prisma, sem `Date.now()` implícito, 100% testável (`spacedRepetition.test.ts`, 15 testes).

## 6. Estados (`ReviewState`)

`NEW` (nunca revisado) → `LEARNING` (1ª repetição correta, OU logo após qualquer erro) → `REVIEW` (2ª–4ª repetição consecutiva) → `MASTERED` (≥5ª repetição consecutiva) → `SUSPENDED` (retirado da fila manualmente, nunca produzido pelo algoritmo). Persistido (`ReviewItem.state`) — necessário porque `SUSPENDED` é uma transição administrativa que nenhuma fórmula reconstitui a posteriori; com um campo de estado já necessário para esse caso, os outros 4 valores também são persistidos pela mesma fonte de verdade, gravados pelo servidor a cada transição, nunca pelo cliente (`SubmitReviewAnswerInputSchema` nem aceita um campo `state`). `resumeReviewItem` reconstitui o estado ativo a partir de `repetitions`/`lastReviewedAt` (`deriveActiveState`), nunca "zera" um item por acidente.

## 7. Cálculo de prioridade

`computeReviewPriority(input, now)` — pura, soma ponderada de: **atraso** (dominante por design — 100 pontos/dia, nunca subvertido pelos outros fatores), **taxa de erro** do item/conceito (derivada de `QuestionAttempt` real, nunca inventada), **dificuldade** (rank 0–4), **recência** (dias desde a última revisão ou criação), e um **bônus fixo** se o conceito é uma lacuna diagnóstica (`isWeakConcept`, seção 16 do prompt). Como o atraso domina a soma, ordenar a fila só por este score já produz "vencidos primeiro, mais atrasados depois, maior prioridade e maior necessidade pedagógica desempatando o resto" (seção 12 do prompt) com um único critério de ordenação — decisão explícita para evitar uma comparação multi-chave frágil. `explainReviewPriority` gera a justificativa textual (seção 24) por interpolação de números já calculados — nenhuma geração de linguagem livre.

## 8. Fila de revisão

`getReviewQueue(actor, targetUserId, filters)` — filtros: `conceptId`, `difficulty` (resolvida), `trackId`/`areaId`/`unitId`/`stageId`/`lessonId` (via `getPedagogicalContextForReviewItem`, travessia read-only do grafo pedagógico do Módulo 4), `dueOnly` (`dueAt <= now`), `overdueOnly` (`dueAt` há mais de 24h), `minPriority`, `limit` (default `DEFAULT_DAILY_REVIEW_LIMIT = 20` — configurável por parâmetro, sem tela de configuração, conforme pedido na seção 13). Itens `SUSPENDED` nunca aparecem. Ordenação: prioridade decrescente (seção 7).

## 9. Sessões de revisão

Mesmo padrão do diagnóstico (Módulo 3): **nenhuma entidade nova** — `StudySession` (mode `REVISAO`) agrupa, `QuestionAttempt` (context `REVIEW`) grava a resposta real.

1. `startReviewSession(actor, options)` — chama `getReviewQueue`, resolve uma `Question` por item (direta para scope `QUESTION`; escolhida deterministicamente entre as tagueadas ao conceito, via `pickQuestionForConcept`, para scope `CONCEPT`), abre a `StudySession`. Itens sem questão publicada disponível são omitidos (limitação documentada, seção 17).
2. `submitReviewAnswer(actor, input)` — valida sessão (própria, aberta, `mode=REVISAO`), item (próprio, não suspenso), `questionId` (deve corresponder ao item — igual para `QUESTION`, tagueado ao conceito para `CONCEPT`), e que o item ainda não foi respondido nesta sessão. Delega a `recordAttempt` (Módulo 3, `context=REVIEW`) para a correção real, chama `computeNextReview`, e grava `ReviewItem` + `ReviewLog` numa transação.
3. `finishReviewSession`/`getReviewSessionSummary` — resumo recalculado sempre a partir dos `ReviewLog` da sessão (determinístico, mesmo princípio do diagnóstico).

## 10. Segurança

Reaproveita `Actor`/`assertRole`/`AuthorizationError` (Módulos 1–2), sem novo primitivo. `SubmitReviewAnswerInputSchema`/`EnsureReviewItemInputSchema` **não têm** campos `isCorrect`/`nextReviewAt`/`priority`/`state`/`userId` — mesmo que o cliente os envie (testado explicitamente enviando um objeto forjado com esses 5 campos), eles são ignorados: `isCorrect` vem de `gradeAnswer` sobre a `Question` real; `userId` vem sempre de `actor.userId`; `nextReviewAt`/`priority`/`state` são sempre recalculados por `computeNextReview`/`computeReviewPriority`.

- **STUDENT:** inicia/responde sua própria revisão, consulta sua própria fila/histórico/desempenho, cria (`ensureReviewItem`) e suspende/reativa seus próprios itens. Bloqueado de tudo isso para outro usuário.
- **CONTENT_EDITOR:** **deliberadamente sem acesso** a fila/histórico/sessão/desempenho de qualquer aluno (seção 20 do prompt: "não deve obter poderes de aluno sobre dados privados") — divergência intencional da convenção do Módulo 3 (`getAttempt`, que permite CONTENT_EDITOR ler qualquer tentativa para curadoria); aqui os dados são pessoais do aluno, não conteúdo curatorial.
- **ADMIN:** mantém acesso a qualquer aluno (`assertOwnReviewDataOrAdmin`), para suporte/operação.

## 11. Privacidade

`assertOwnReviewDataOrAdmin(actor, targetUserId)` (`privacy.ts`) é o único portão, chamado por todo serviço que lê/escreve dado de um aluno específico (`getReviewItem`, `listReviewItemsForUser`, `getReviewQueue`, `getReviewPerformance`, `assertOwnReviewSession`, `submitReviewAnswer`, `suspend/resumeReviewItem`). Testado explicitamente: aluno tentando ler fila/histórico/sessão/desempenho de outro aluno (rejeitado com `AuthorizationError` em cada serviço).

## 12. Auditoria

`ContentAuditLog` **não é gerado** por nenhuma operação deste módulo — nem `submitReviewAnswer` (evento de uso, seção 22 do prompt), nem `suspendReviewItem`/`resumeReviewItem` (reclassificado como autosserviço do próprio aluno sobre seus dados, não curadoria de conteúdo — ver seção 15, decisão 4). O histórico imutável de revisão é o próprio `ReviewLog`, que já cumpre a função de auditoria factual do que aconteceu, sem sobrepor o mecanismo de curadoria dos Módulos 1–4.

## 13. Integração

- **Questões (Módulo 3):** `submitReviewAnswer` delega 100% da correção a `recordAttempt`/`gradeAnswer` — nenhuma lógica de correção duplicada. `QuestionKnowledgeTag` valida que uma questão pode representar um item `CONCEPT`.
- **Diagnóstico (Módulo 3):** `enqueueWeakConceptsFromDiagnostic(actor, sessionId)` chama `getDiagnosticResult` integralmente e usa `weakConceptIds` para `ensureReviewItem` — idempotente. A prioridade generaliza o mesmo limiar (`WEAK_CONCEPT_THRESHOLD`) para todo o histórico do usuário, não só a sessão de diagnóstico.
- **Pedagogia (Módulo 4):** `getPedagogicalContextForReviewItem` traduz um `ReviewItem` em `{conceptIds, lessonIds, stageIds, unitIds, areaIds, trackIds}`, navegando só pelos relacionamentos já existentes (`LessonKnowledgeTag`, `LessonBlock.questionId`, `StageLesson`, `UnitStage`, `AreaUnit`, `TrackArea`) — nenhum dado de lição é copiado para dentro do item de revisão.

## 14. Testes

**243 testes, 37 arquivos, todos verdes** (179 herdados dos Módulos 1–4, intactos + 64 novos deste módulo, em 8 arquivos): `spacedRepetition.test.ts` (15, puro), `reviewPriority.test.ts` (10, puro), `reviewItem.service.test.ts` (12), `reviewQueue.service.test.ts` (9), `reviewSession.service.test.ts` (11), `reviewPerformance.service.test.ts` (4), `reviewRecommendation.service.test.ts` (2), `reviewDiagnosticBridge.service.test.ts` (1). Cobertura literal da seção 28/29 do prompt: criação (item novo/estado inicial/primeiro vencimento), acerto (histórico/intervalo maior/novo vencimento), erro (intervalo menor/estado LEARNING/repetitions zerado), repetição (sequência de acertos até MASTERED, sequência de erros, alternância), fila (vencidos/futuros/ordenação/prioridade/limite diário), segurança (dono vs. outro aluno vs. ADMIN; campos forjados `isCorrect`/`nextReviewAt`/`priority`/`state`/`userId` ignorados), integração completa `Question→QuestionAttempt→Review→próxima revisão` e `Concept→QuestionKnowledgeTag→erro→prioridade→revisão`.

## 15. Decisões técnicas

1. **`ReviewState` persistido, não puramente derivado** — `SUSPENDED` não é reconstituível por fórmula; uma vez necessário um campo de estado, os 5 valores vivem na mesma fonte de verdade (mesmo padrão de `PublicationStatus` já usado em todo o projeto).
2. **`ReviewLog` como model novo** (não reaproveitou só `QuestionAttempt`) — `QuestionAttempt` não tem `intervalDays`/`state`/`dueAt` anterior/novo, informação explicitamente pedida (seção 8 do prompt) e que não pertence a um evento genérico de tentativa (usado também por LESSON/CHALLENGE/SIMULATION/DIAGNOSTIC). `isCorrect` foi denormalizado deliberadamente (mesmo padrão de `Question.correctRate`/`answerCount` já usado no projeto) para evitar join em toda consulta de desempenho; `difficulty` NÃO foi denormalizado (derivável via join, sem necessidade real de leitura quente).
3. **`citation.service.ts` não foi tocado neste módulo** — `Lesson` já resolve `LESSON` desde o Módulo 4; nada aqui dependia de mudar aquele arquivo.
4. **Suspender/reativar é autosserviço, não curadoria** — decisão explícita de NÃO adicionar `REVIEW_ITEM` a `AuditableEntityType`: um aluno pausar seu próprio item é dado pessoal (como pular uma revisão), não uma alteração de conteúdo administrada.
5. **Prioridade como único score de ordenação** (em vez de comparação multi-chave) — mais simples, mais testável, e satisfaz literalmente "quanto mais atrasado, maior a prioridade" ao tornar o atraso o termo dominante da soma.
6. **`TopicMastery` continua sem consumidor** — não era pedido explicitamente neste módulo, e as informações equivalentes (erro por conceito, lacunas) já são derivadas sob demanda de `QuestionAttempt`/`ReviewLog`, sem necessidade de um cache de mastery paralelo agora.
7. **Seleção de questão por conceito é determinística** (`orderBy id asc`), não aleatória — coerente com "nenhuma recomendação inexplicável"; a variedade de seleção fica para um módulo futuro dedicado a isso, se necessário.
8. **`z.input`, não `z.infer`**, mantido onde há `.default(...)` — mesma convenção dos Módulos 2/3.

## 16. Banco / Migrations

Uma migration real, aditiva (nenhum dado/coluna existente alterado ou removido), aplicada no Postgres real de desenvolvimento, com `prisma generate` executado em seguida:

- `20260819221702_module5_review_state_and_log` — cria o enum `ReviewState`; adiciona `ReviewItem.state ReviewState @default(NEW)`; cria a tabela `ReviewLog` (FKs para `ReviewItem`, `User`, `QuestionAttempt`; `questionAttemptId` único).

## 17. Limitações

- `listLessonsByDifficulty`-equivalente para revisão (`resolveItemDifficulty`) só enxerga dificuldade via `Question.difficulty`/`Concept.difficulty` diretos — um item `CONCEPT` cujo `Concept.difficulty` é nulo entra na fila com dificuldade `null` (multiplicador neutro, sem bônus de prioridade por dificuldade).
- `pickQuestionForConcept` escolhe deterministicamente a primeira questão publicada tagueada (`orderBy id`) — não há ainda lógica de variedade/rotação entre múltiplas questões do mesmo conceito.
- `TopicMastery` permanece sem nenhum serviço escrevendo nela (heranca do Módulo 1–4, não uma lacuna introduzida aqui) — todo cálculo de desempenho é feito sob demanda a partir de `QuestionAttempt`/`ReviewLog`.
- Sem sessão/autenticação real (herdado dos Módulos 1–4) — `Actor` continua explícito.
- Nenhuma rota HTTP/Server Action exposta — só serviços de domínio.
- `getPedagogicalContextForReviewItem` faz várias consultas sequenciais por item (sem cache/materialização) — aceitável na escala deste módulo (sem conteúdo real), documentado como oportunidade de otimização futura caso o volume cresça.

## 18. O que não foi implementado (explícito)

Nenhum avanço para o Módulo 6 ou posteriores. Não implementado, de propósito: UI de qualquer tipo; dashboard visual; gamificação funcional (XP por revisão, streak, conquistas); biblioteca de livros gratuitos; sistema de atualidades/notícias; ETL/importação em massa/scraping; integração com API externa; qualquer uso de LLM/IA/chatbot/recomendação por IA; notificações; aplicativo mobile; autenticação/sessão real; assinaturas; analytics avançado.

## 19. Conteúdo real

Nenhum conteúdo real foi inserido. Toda fixture de teste usa o prefixo `TEST_FIXTURE_`, é criada e removida dentro de cada arquivo de teste (`cleanupFixtures`), e não representa nenhum aluno, questão, prova, conceito ou trilha reais.

## 20. Próximo passo

Módulo 5 concluído. Módulo 6 não iniciado. Aguardando autorização explícita.
