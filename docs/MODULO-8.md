# Módulo 8 — Experiência de Aprendizagem, Execução de Lições e Progresso Acadêmico

## 1. Objetivo

Transformar o Núcleo Pedagógico do Módulo 4 (`Track → ... → Lesson →
LessonBlock`, puro conteúdo curado) numa experiência de aprendizagem
executável: um estudante inicia uma lição, consome blocos, responde
atividades avaliativas (corrigidas de verdade pelo Módulo 3), o servidor
deriva progresso/conclusão/domínio, deriva desbloqueio do próximo conteúdo, e
tudo isso se integra com diagnóstico (Módulo 3), revisão (Módulo 5),
simulados (Módulo 6) e biblioteca/atualidades (Módulo 7) — sempre
reaproveitando o que já existe, nunca duplicando. Sem IA/LLM em nenhuma
decisão.

## 2. Análise inicial (antes de qualquer código)

Feita por leitura direta de `prisma/schema.prisma`, `docs/ARQUITETURA.md`,
`docs/MODULO-1.md` a `docs/MODULO-7.md`, e do código real de
`pedagogy`/`assessment`/`review`/`simulation`/`curation`.

**A. O que já existia:**

- `Lesson`/`LessonBlock` (Módulo 4) — conteúdo curado, com `BlockType`
  (INTRO/CONCEPT/EXAMPLE/QUESTION/CONCLUSION) e `LessonBlock.questionId`
  apontando para `Question` real.
- `AttemptContext.LESSON` já existia no enum desde antes do Módulo 3 —
  reservado exatamente para este módulo, nunca usado até aqui.
- `gradeAnswer`/`recordAttempt` (Módulo 3) — mecanismo de correção completo e
  reaproveitável sem alteração.
- `getReviewQueue` (Módulo 5), já com filtro por `lessonId`.
- `getComplementaryContentForConcept`, `getRecentCurrentAffairs`,
  `getRecentQuestions` (Módulo 7) — biblioteca/atualidades/questões
  recentes, por conceito.
- `getDiagnosticResult` (Módulo 3) — nível, conceitos fortes/fracos e
  recomendação de conceitos de partida, sempre recomputado a partir de
  `QuestionAttempt`, nunca persistido.
- `Progress` (por `Stage`, `ProgressStatus` LOCKED/AVAILABLE/IN_PROGRESS/
  COMPLETED) e `TopicMastery` (por conceito) — **existem desde o Módulo 1,
  mas nenhum serviço em nenhum módulo (1-7) nunca leu nem escreveu neles**,
  confirmado por grep em todo `src/modules`. Documentados como reservados a
  um futuro módulo de gamificação/trilha visual
  (`src/modules/gamification/README.md`).

**B. O que estava faltando:**

- Qualquer mecanismo de "o aluno consumiu este bloco" — não existe em nenhum
  lugar do schema (`Progress` é por Stage, não por Lesson/Bloco).
- Qualquer status de execução por lição (NOT_STARTED/IN_PROGRESS/COMPLETED/
  MASTERED) — `ProgressStatus` não tem NOT_STARTED nem MASTERED, e é de
  outro dono (`Stage`).
- Qualquer noção de desbloqueio/pré-requisito persistido.
- Qualquer serviço que transformasse a estrutura pedagógica em navegação
  concreta ("próximo passo").

**C. O que foi reaproveitado, sem alteração:**

- `recordAttempt`/`gradeAnswer` (correção de atividades QUESTION).
- `AttemptContext.LESSON` (nenhuma alteração de enum necessária).
- `getFullTrack`, `getPedagogicalContextForConcepts`, `listLessonsByConcept`
  (`pedagogy-query.service.ts`).
- `getDiagnosticResult` (ponto de partida).
- `getReviewQueue` (revisão pendente por lição).
- `getComplementaryContentForConcept` (biblioteca + atualidades + questões
  recentes, já compostos no Módulo 7).
- `computePerformance`, `WEAK_CONCEPT_THRESHOLD`/`STRONG_CONCEPT_THRESHOLD`
  (Módulo 3) para a evolução do estudante.
- Convenções de módulo: `Actor`/`assertRole`, erros de domínio por bounded
  context, `*.service.ts` + `*.schema.ts`, fixtures `TEST_FIXTURE_*`.

**D. Entidades alteradas:** nenhuma entidade existente foi alterada — só
relações adicionadas (`User.lessonProgress`, `Lesson.progress`,
`LessonBlock.completions`, `QuestionAttempt.lessonBlockCompletion`).

**E. O que exigiu migration:** duas tabelas novas (`LessonProgress`,
`LessonBlockCompletion`) e um enum novo (`LessonProgressStatus`) — ver seção 17. Nenhum campo/tabela existente foi alterado ou removido.

**F. O que foi resolvido só em serviço, sem migration:**

- Desbloqueio (LOCKED/AVAILABLE/COMPLETED/MASTERED) — inteiramente derivado
  da ordem já persistida em `StageLesson.order` (etc.) + `LessonProgress`;
  não existe (e não foi criado) nenhum campo de "pré-requisito".
- "Próximo passo" — navegação sobre a disponibilidade derivada.
- Progresso agregado por Track/Area/Unit/Stage — soma de `LessonProgress`
  sobre os ids de lição resolvidos pelas junções existentes.
- Evolução do estudante — agregação de `LessonProgress` + `computePerformance`.

## 3. Arquitetura encontrada (resumo)

4 núcleos desacoplados (Conhecimento, Avaliações, Pedagógico, Curadoria),
`Actor { userId, role }` sem sessão real, `assertRole`/`AuthorizationError`
centralizados em `src/server/auth/authorize.ts`, auditoria só para mutação
curatorial (`ContentAuditLog`/`recordAudit`, nunca para eventos de uso),
serviços `*.service.ts` (Prisma) + funções puras sem sufixo (`*.ts`) + Zod em
`types/*.schema.ts`. Módulo 8 respeitou integralmente esse padrão, dentro do
módulo `pedagogy` (o "núcleo pedagógico" é o dono natural da execução de
lição — não se criou um módulo novo).

## 4. Funcionalidades implementadas

- Início/continuação de lição (`startLesson`), com resumo de progresso.
- Consumo de bloco / resposta de atividade (`submitLessonActivity`), com
  correção real via Módulo 3 para blocos QUESTION.
- Conclusão explícita (`completeLesson`), determinística e idempotente.
- Estado de sessão sob demanda (`getLessonSession`), sem gravar nada numa
  simples leitura.
- Derivação pura de status/progresso por bloco (`lesson-progress.ts`).
- Desbloqueio de lições dentro de uma trilha publicada
  (`learning-unlock.service.ts`).
- Próximo passo pedagógico e ponto de partida via diagnóstico
  (`next-learning-step.service.ts`).
- Progresso agregado por Track/LearningArea/Unit/Stage
  (`learning-progress.service.ts`).
- Evolução do estudante (`learning-performance.service.ts`).
- Conteúdo relacionado a uma lição — revisão pendente, biblioteca,
  atualidades, questões recentes (`learning-content.service.ts`).
- Guarda de privacidade dedicada (`learning-privacy.ts`).

## 5. Progresso — como foi implementado

Dois modelos novos, aditivos:

- `LessonProgress` (`userId`+`lessonId` único): `status`
  (`LessonProgressStatus`), `startedAt`, `completedAt`, `masteredAt`,
  `lastActivityAt`, `totalActivities`, `correctActivities`. Tudo escrito
  exclusivamente pelo servidor.
- `LessonBlockCompletion` (`lessonProgressId`+`lessonBlockId` único):
  marca o consumo de UM bloco; para blocos QUESTION, carrega `isCorrect` e
  `questionAttemptId` (prova de correção real, nunca um booleano do
  cliente).

`status`/`blocksCompleted`/`blocksTotal`/`percentage`/`currentBlock`/
`accuracy` nunca são persistidos redundantemente onde evitável — só
`status`/`totalActivities`/`correctActivities`/`completedAt`/`masteredAt`
são gravados (para não recalcular em toda leitura de listagem); os demais
são sempre recomputados a partir de `LessonBlockCompletion`
(`lesson-progress.ts`, funções puras `deriveLessonProgressStatus` e
`computeLessonProgressSummary`, testáveis sem banco).

## 6. Execução de lições — fluxo completo

```
startLesson(actor, lessonId)
  → valida Lesson existente e PUBLISHED
  → upsert LessonProgress (não reinicia se já existir)
  → devolve resumo (status, blocksTotal, blocksCompleted, currentBlock, ...)

submitLessonActivity(actor, { lessonId, blockId, answerData?, timeSpentMs? })
  → valida lição publicada, bloco pertence à lição, lição já iniciada
  → se já concluído: idempotente, devolve o estado já gravado
  → se QUESTION: exige answerData/timeSpentMs, corrige via recordAttempt (Módulo 3)
  → grava LessonBlockCompletion, recalcula e persiste LessonProgress

completeLesson(actor, lessonId)
  → recalcula a partir dos blocos concluídos; rejeita se houver pendente
  → grava completedAt/masteredAt só na primeira vez (idempotente)

getLessonSession(actor, lessonId, targetUserId?)
  → leitura pura; sem LessonProgress ainda, devolve NOT_STARTED sem gravar nada
```

"Sessão", aqui, não é uma entidade nova — é a leitura de
`LessonProgress`+`LessonBlockCompletion`. Avaliado explicitamente contra
`StudySession` (que só tem `stageId`, sem granularidade de bloco, e é
reservado a agrupar tentativas de diagnóstico/revisão) — não serve para este
fluxo, e criar uma `LessonSession` própria seria uma segunda estrutura sem
necessidade real: o "estado da sessão" é só o estado do progresso.

## 7. Atividades — execução e correção

Um bloco QUESTION nunca é corrigido por uma segunda lógica: o fluxo é sempre
`LessonBlock.questionId → recordAttempt → gradeAnswer → QuestionAttempt`
(contexto `AttemptContext.LESSON`, já reservado no enum). O cliente só
manda `answerData`/`timeSpentMs`; `isCorrect`/`explanation` são sempre
devolvidos pelo servidor. Blocos não-QUESTION (INTRO/CONCEPT/EXAMPLE/
CONCLUSION) não têm "resposta" a corrigir — consumi-los só marca
`LessonBlockCompletion` sem `questionAttemptId`.

## 8. Conclusão e mastery — regras determinísticas

`deriveLessonProgressStatus` (`lesson-progress.ts`, puro):

- `NOT_STARTED`: nenhum bloco concluído.
- `IN_PROGRESS`: pelo menos 1, mas não todos.
- `COMPLETED`: todos os blocos concluídos.
- `MASTERED`: `COMPLETED` **e** existe pelo menos 1 atividade avaliativa
  respondida **e** o aproveitamento (`correctActivities/totalActivities`)
  é `>= LESSON_MASTERY_THRESHOLD` (`src/config/lesson.ts`, valor 80).

Decisão explícita: uma lição sem nenhum bloco QUESTION nunca alcança
MASTERED (não há evidência de domínio para medir) — fica travada em
COMPLETED. Isso é documentado aqui porque não havia uma regra equivalente
em nenhum módulo anterior para copiar.

## 9. Desbloqueio

`learning-unlock.service.ts` deriva `LOCKED`/`AVAILABLE`/`COMPLETED`/
`MASTERED` para cada lição publicada de uma trilha, numa única passada sem
N+1 (`getFullTrack` + um `findMany` de `LessonProgress` em lote): a primeira
lição da sequência publicada (`StageLesson.order`, etc.) é sempre
`AVAILABLE`; as demais ficam `AVAILABLE` só quando a lição imediatamente
anterior na mesma sequência estiver `COMPLETED` ou `MASTERED`, senão
`LOCKED`. Nenhum campo de pré-requisito foi criado — a ordem já persistida
nas tabelas de junção do Módulo 4 É o pré-requisito.

Importante: esse "bloqueio" é uma informação de **navegação/exibição**, não
um gate de execução — `startLesson`/`submitLessonActivity` continuam
protegidos apenas por "a lição está PUBLICADA" (seção 13 do prompt). Uma UI
futura decide se impede o clique numa lição LOCKED; o servidor sempre calcula
a disponibilidade real independentemente disso.

## 10. Próximo passo

`getNextLearningStep(actor, targetUserId?, { trackId? })` — com `trackId`,
devolve a primeira lição `AVAILABLE` da trilha (via
`getTrackLessonAvailability`) com o caminho completo
`{ track, area, unit, stage, lesson, reason }`; sem `trackId`, varre as
trilhas PUBLICADAS em ordem determinística (`id asc`) e devolve o primeiro
próximo passo encontrado, ou `null` se não houver nenhum. Nenhum novo
algoritmo de recomendação — só navegação sobre a disponibilidade já
derivada.

## 11. Diagnóstico → ponto de partida

`getStartingPoint(actor, diagnosticSessionId)` chama
`getDiagnosticResult` (Módulo 3) integralmente — não recalcula nada — e usa
`recommendation.startingConceptIds` (com fallback para `weakConceptIds`,
depois `strongConceptIds`) para achar, via `listLessonsByConcept`, a primeira
lição publicada que ensina um desses conceitos. Devolve também o contexto
pedagógico (`getPedagogicalContextForConcepts`) e uma `reason` textual
determinística.

## 12. Revisão

`learning-content.service.ts` chama `getReviewQueue(actor, targetUserId,
{ lessonId, limit })` (Módulo 5, que já tinha filtro por `lessonId`) para
responder "você tem revisão pendente de um conceito desta lição?" — nenhum
segundo sistema de fila/prioridade.

## 13. Simulados

Não há uma integração de escrita neste módulo (nenhum "criar simulado a
partir de uma lição" foi pedido) — a integração é de leitura, via o mesmo
banco de questões que os simulados também usam (`Question`), e via
`AttemptContext.LESSON` diferenciando estatisticamente as tentativas feitas
dentro de uma lição das feitas num simulado (`AttemptContext.SIMULATION`),
sem misturar os dois nas agregações de desempenho.

## 14. Biblioteca

`getComplementaryContentForConcept` (Módulo 7) é chamada, por conceito
ensinado pela lição, dentro de `learning-content.service.ts` — biblioteca só
aparece se `LibraryItem.status === PUBLISHED` (testado explicitamente:
um item em DRAFT tagueado ao mesmo conceito não aparece).

## 15. Atualidades

Mesma composição do item 14 — `getComplementaryContentForConcept` já inclui
`getCurrentAffairsByConcept` (Módulo 7), que só devolve atualidades
`PUBLISHED`. As janelas de 7/30/90 dias (`resolveWindowRange`) pertencem à
consulta `getRecentCurrentAffairs`, não usada neste bundle por conceito —
não foi duplicada aqui; quem precisar da janela chama a função do Módulo 7
diretamente.

## 16. Segurança

- `assertOwnLearningDataOrAdmin` (`learning-privacy.ts`) — mesmo padrão mais
  restritivo do Módulo 5: só o próprio dono ou ADMIN lê progresso/execução
  de outro usuário; CONTENT_EDITOR não tem acesso irrestrito.
- Payloads forjados testados e confirmados ignorados/inexistentes no schema
  de entrada: `isCorrect`, `score`, `completed`, `mastered`, `userId` —
  `submitLessonActivity` sempre recorrige via `recordAttempt`/`gradeAnswer`;
  `userId` sempre vem de `actor.userId`, nunca do payload (teste
  "anti-fraude" em `lesson-execution.service.test.ts`).
- Acesso só a conteúdo `PUBLISHED` — `startLesson`/`submitLessonActivity`/
  `completeLesson` rejeitam lição DRAFT/ARCHIVED.

## 17. Banco / migrations

Uma migration, **aditiva** (nenhuma tabela/campo/enum existente alterado ou
removido):

```
20260823023825_module8_lesson_progress_and_completion
```

Cria: enum `LessonProgressStatus`; tabelas `LessonProgress` e
`LessonBlockCompletion`; FKs para `User`/`Lesson`/`LessonBlock`/
`QuestionAttempt` (esta última `ON DELETE SET NULL`, as demais `RESTRICT`).
Aplicada e testada contra o Postgres real de desenvolvimento
(`npm run db:start` + `npx prisma migrate dev`).

## 18. Testes

- Testes anteriores (Módulos 1-7): **339**.
- Testes novos (Módulo 8): **45**, em 7 arquivos:
  - `lesson-progress.test.ts` (10, puro — sem banco).
  - `lesson-execution.service.test.ts` (14 — início/continuação/conclusão,
    correção real, anti-fraude, idempotência de conclusão e de reenvio).
  - `learning-unlock.service.test.ts` (6 — disponível/bloqueado/liberação
    ao concluir/privacidade).
  - `next-learning-step.service.test.ts` (5 — próximo passo com/sem
    trackId, trilha sem próximo passo, ponto de partida sem/com
    diagnóstico).
  - `learning-progress.service.test.ts` (5 — 0%/parcial/100%, draft fora do
    denominador, privacidade).
  - `learning-performance.service.test.ts` (3 — zerado, MASTERED +
    conceito forte, privacidade).
  - `learning-content.service.test.ts` (2 — bundle completo e conteúdo
    não-publicado excluído; lição sem conceito não quebra).
- **Total final: 384.**

Todos executados de verdade (`npx vitest run`) contra o Postgres real de
desenvolvimento, duas vezes seguidas para confirmar estabilidade. Na
primeira rodada completa, `diagnostic.service.test.ts` (Módulo 3) reportou
1 falha — reproduzida em isolamento (`vitest run` só daquele arquivo) e
confirmada como **passando sozinho**, ou seja, a mesma race condition sob
execução paralela já documentada em `docs/MODULO-6.md` (pré-existente, não
introduzida por este módulo). Uma segunda rodada completa (sem alterações)
passou 384/384, confirmando o diagnóstico.

## 19. Typecheck / lint / format / build

```
npm run db:validate   → OK
npm run db:format     → OK
npm run db:generate   → OK
npm run typecheck     → OK (next typegen + tsc --noEmit, sem erros)
npm run lint          → OK (0 erros, 0 warnings, após remover uma variável não usada de teste)
npm run format:check  → OK (após `npm run format`, que só formatou os 12 arquivos novos/alterados)
npm run test          → 384/384 (ver seção 18)
npm run build         → OK (next build, compilado com sucesso)
```

## 20. Documentação

Criado: `docs/MODULO-8.md` (este arquivo). Alterado: `docs/ARQUITETURA.md`
(só um apêndice aditivo de status ao final, seção 14 do documento — nenhuma
decisão anterior foi reescrita).

## 21. Decisões técnicas

- **`LessonProgress`/`LessonBlockCompletion` são modelos novos, não uma
  extensão de `Progress`/`TopicMastery`** — esses dois já existem desde o
  Módulo 1 mas em outra granularidade (por Stage, e por conceito, ambos sem
  nenhum consumidor) e outro propósito (documentados como base de uma futura
  gamificação/trilha visual). Reaproveitá-los teria exigido mudar a chave
  primária de `Progress` (hoje `(userId, stageId)`) e ainda não resolveria a
  granularidade por bloco — mais arriscado que aditar duas tabelas novas.
- **"Sessão" de lição não é uma entidade** — é a leitura combinada de
  `LessonProgress`+`LessonBlockCompletion`; `getLessonSession` existe como
  nome de função (pedido explicitamente), não como tabela.
- **Idempotência de `submitLessonActivity`**: a checagem "já concluído?" e a
  gravação da conclusão não estão na mesma transação Prisma que
  `recordAttempt` (que abre a própria transação internamente, no Módulo 3);
  numa janela de corrida estreita isso pode gerar uma `QuestionAttempt`
  extra nas estatísticas, mas o `@@unique([lessonProgressId,
lessonBlockId])` garante que só uma `LessonBlockCompletion` sobrevive, e o
  recálculo de `LessonProgress` é sempre determinístico a partir do conjunto
  final de conclusões — o progresso nunca fica inconsistente. Documentado em
  comentário no próprio serviço.
- **MASTERED trancado sem atividade avaliativa** — decisão explícita (seção 8) para não inventar uma noção de "domínio" sem nenhuma evidência de
  desempenho.
- **`LESSON_MASTERY_THRESHOLD = 80`** centralizado em `src/config/lesson.ts`
  (mesmo padrão de `src/config/diagnostic.ts`).

## 22. Divergências

Nenhuma.

## 23. Limitações / o que ficou para módulos futuros

- Gamificação (XP, streak, conquistas, `Progress`/`TopicMastery` em uso) —
  fora de escopo deste módulo por instrução explícita; os modelos
  continuam reservados e intocados.
- UI completa, dashboard visual, autenticação real (login/JWT/OAuth),
  pagamentos, app mobile, chatbot/IA — não antecipados, por instrução
  explícita.
- Desbloqueio hoje é calculado sempre dentro do contexto de UMA trilha
  (`trackId` explícito ou varredura de trilhas publicadas); uma `Lesson`
  reutilizada em múltiplas trilhas (`StageLesson`/`TrackArea` são N:N) pode
  ter disponibilidade diferente em cada uma — não existe hoje uma noção de
  "disponibilidade global" da lição fora de uma trilha específica, porque o
  próprio conceito de "lição anterior" só existe dentro de uma sequência.
- Nenhuma migration/serviço mede duração real de estudo (tempo de sessão) —
  `getStudentLearningOverview` não inclui essa métrica porque nenhum modelo
  a captura corretamente ainda (rule 32 do prompt: não inventar métrica sem
  dado real).

## 24. Conteúdo real inserido

Nenhum. Todas as fixtures usadas nos testes seguem o prefixo `TEST_FIXTURE_`
e são removidas pelo próprio teste (`cleanupFixtures`) ao final da suíte.

## 25. Próximo passo

Módulo 8 concluído. Módulo 9 NÃO foi iniciado. Aguardando autorização
explícita.
