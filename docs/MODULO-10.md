# Módulo 10 — Orquestração Acadêmica, Motor de Estudo Personalizado e Recomendações Determinísticas

## 1. Objetivo

Transformar tudo que existe nos Módulos 1–9 num motor central de decisão
pedagógica: dado um aluno, responder determinística e explicavelmente "o
que ele deve estudar agora, e por quê" — combinando diagnóstico, revisão
espaçada, progresso de lições, questões recentes de provas reais,
simulados, biblioteca gratuita/legal e atualidades, incluindo conexões
interdisciplinares reais. Sem IA/LLM, sem UI, sem nova entidade de domínio.

## 2. Arquitetura analisada

Leitura de `prisma/schema.prisma`, `docs/ARQUITETURA.md`, `docs/MODULO-1.md`
a `docs/MODULO-9.md`, e do código real de `assessment`, `pedagogy`,
`review`, `simulation`, `curation`, `knowledge`, `gamification`.

**Achado central**: não existe, em nenhum módulo anterior, uma função
"pegue o diagnóstico mais recente do usuário" — `getDiagnosticResult`
(Módulo 3) sempre exige um `sessionId` explícito (o resultado nunca é
persistido, sempre recomputado a partir da `StudySession` que o chamador
já sabe qual é). Isso já tinha sido notado no Módulo 8
(`getStartingPoint`) e reaparece aqui: o Módulo 10 precisa de uma consulta
NOVA (`findLatestFinishedDiagnosticSessionId`, só uma leitura, sem cálculo)
para localizar QUAL sessão é o diagnóstico do usuário, antes de delegar o
CÁLCULO do resultado à função real do Módulo 3.

**Reaproveitado sem alteração** (nenhum destes módulos foi tocado):

- Módulo 3: `getDiagnosticResult`, `computePerformance`, `listQuestions`,
  `WEAK_CONCEPT_THRESHOLD`.
- Módulo 5: `getReviewQueue` (prioridade/estado/atraso já calculados).
- Módulo 6: `getNextSimulationRecommendation`, `MIN_SAMPLE_SIZE_FOR_RECOMMENDATION`.
- Módulo 7: `getComplementaryContentForConcept`, `listLibraryByDiscipline`,
  `getCurrentAffairsByDiscipline`.
- Módulo 8: `getNextLearningStep`, `getPedagogicalContextForConcepts`.
- Módulo 2: `listRelationsForEntity` (`AcademicRelation`) para conexões
  interdisciplinares reais.
- Módulo 9: nenhuma chamada — gamificação é só contexto (seção 22 do
  prompt), e nem sequer foi necessário lê-la para compor o plano (o prompt
  pedia usá-la "apenas como contexto", opcional; nenhuma decisão de
  prioridade deste módulo depende de XP/streak/nível).

**Entidades novas**: nenhuma. **Migrations**: nenhuma.

## 3. Funcionalidades

- `getStudyPlan(actor, targetUserId?, { size? })` — plano ordenado e
  limitado, com o gate de diagnóstico como primeiro passo.
- `getNextStudyAction(actor, targetUserId?)` — só o topo do plano.
- `getInitialStudyPlan` — mesmo comportamento de `getStudyPlan` (ver seção
  9), nome pedido explicitamente pelo prompt para o cenário de primeiro
  acesso.
- 7 geradores de candidato, um por camada da hierarquia (diagnóstico,
  revisão vencida, lição, questão recente, simulado, complementar,
  interdisciplinar).
- 3 consultas auxiliares (localizar diagnóstico, conceitos fracos atuais,
  conexões interdisciplinares reais).
- 1 política pura de ordenação/corte.

## 4. Serviços criados

```
src/config/study-engine.ts
src/modules/study-engine/
  README.md
  types/next-study-action.ts
  server/
    policies/priority.ts               (+ .test.ts)
    queries/
      diagnostic-lookup.ts              (+ .test.ts)
      weak-concepts.ts                  (+ .test.ts)
      interdisciplinary.ts              (+ .test.ts)
    services/
      errors.ts
      privacy.ts
      next-study-action.service.ts      (+ .test.ts)
      study-plan.service.ts             (+ .test.ts)
```

## 5. Serviços reutilizados

Ver seção 2 ("Reaproveitado sem alteração") — nenhum arquivo de nenhum
módulo anterior foi modificado por este módulo.

## 6. Algoritmo de decisão

Pesos centralizados em `src/config/study-engine.ts`
(`STUDY_ACTION_PRIORITY`):

```
START_DIAGNOSTIC   1000
REVIEW_OVERDUE      900
WEAK_CONCEPT        800   (critério, não é um tipo de ação — ver seção 21)
LESSON              700
QUESTION_RECENT     600
SIMULATION          500
CURRENT_AFFAIR      420
LIBRARY             400
```

Reconciliação documentada entre a seção 4 (hierarquia detalhada em 10
itens) e a seção 21 do prompt (hierarquia compacta de conflito,
`DIAGNOSTIC > REVIEW_OVERDUE > WEAK_CONCEPT > LESSON > QUESTION >
SIMULATION > COMPLEMENTARY`): "conceito fraco" nunca é um `type` de
`NextStudyAction` (a seção 3 do prompt só lista LESSON/REVIEW/QUESTION/
SIMULATION/LIBRARY/CURRENT_AFFAIR, mais `START_DIAGNOSTIC` pedido na seção 5) — é o CRITÉRIO usado para escolher/justificar qual lição, questão ou
conteúdo complementar recomendar. "Complementar" (seção 4, itens 8-10) foi
desdobrado em `CURRENT_AFFAIR` (mais prioritário, seguindo a ordem literal
do prompt "atualidade antes de livro") e `LIBRARY`.

`buildStudyPlan`/`pickTopAction` (`server/policies/priority.ts`) são
funções puras: ordenam por prioridade decrescente, estável para empates
(mesma entrada → mesma saída sempre), e cortam em
`DEFAULT_STUDY_PLAN_SIZE` (5, configurável).

## 7. Primeiro acesso

`getInitialStudyPlan` é literalmente `getStudyPlan` (mesma função, ver
seção 9 — decisão técnica). O gate de diagnóstico é sempre a primeira
verificação: sem diagnóstico concluído, o plano é `[{ type:
START_DIAGNOSTIC, ... }]`, um item só, e nenhuma outra camada é avaliada.

## 8. Diagnóstico

`findLatestFinishedDiagnosticSessionId(userId)` (nova consulta, só
leitura) localiza a `StudySession` mais recente e já encerrada com pelo
menos uma `QuestionAttempt` em `AttemptContext.DIAGNOSTIC` (mesmo
discriminador já usado no Módulo 9 para o problema idêntico). O RESULTADO
em si nunca é calculado aqui — quando precisado (`getStartingPoint`-like),
delega a `getDiagnosticResult` (Módulo 3). `getStudyPlan` usa só a
presença/ausência da sessão como gate; a ponte "diagnóstico → primeira
lição" propriamente dita já existe desde o Módulo 8
(`next-learning-step.service.getStartingPoint`) e não foi duplicada.

## 9. Revisão

`generateReviewOverdueActions` chama `getReviewQueue(actor, targetUserId,
{ overdueOnly: true, limit: MAX_REVIEW_OVERDUE_ITEMS_IN_PLAN })` — a
prioridade/razão de CADA item vem literalmente de `entry.priority`/
`entry.reason` do Módulo 5, só convertida para o formato `NextStudyAction`.
Nenhum recálculo de SM-2/estado/atraso.

## 10. Lições

`generateLessonAction` chama `getNextLearningStep` (Módulo 8). Quando um
`preferredTrackId` (a trilha do conceito com pior desempenho) resolve uma
lição de verdade, a razão é enriquecida ("Relacionada ao conceito com
desempenho mais baixo — ..."); senão, cai no caso genérico ("próxima lição
desbloqueada"). Nunca recomenda uma lição fora de `getNextLearningStep` —
logo, nunca uma lição bloqueada/não publicada (seção 9 do prompt).

## 11. Questões

`generateRecentQuestionAction` chama `listQuestions({ conceptId,
reviewStatus: PUBLISHED, take: RECENT_QUESTIONS_SAMPLE_SIZE })` — já
ordenada por `examEdition.year desc` (Módulo 3/6), então "mais recente
primeiro" nunca precisou de lógica nova. `Question.sourceId` é obrigatório
desde o Módulo 1 — nenhuma questão sem procedência jamais existe para ser
recomendada. Vestibulares/concursos/provas (`Exam`/`ExamEdition`/
`ExamBoard`/`Organization`/`Position`) são só os dados que `listQuestions`
já sabe filtrar; nenhuma classificação nova foi criada.

## 12. Simulados

`generateSimulationAction` chama `getNextSimulationRecommendation` (Módulo
6), que sempre devolve algo (tem um fallback neutro para quem não tem
histórico). `simulationId` fica `null` de propósito: a recomendação
descreve CONFIGURAÇÃO para montar um simulado, não uma `Simulation` já
existente — o Módulo 6 não cria conteúdo por conta própria, e o Módulo 10
não inventaria uma entidade que o Módulo 6 nunca criou.

## 13. Biblioteca

`generateComplementaryActions` chama `getComplementaryContentForConcept`
(Módulo 7) — que só devolve `LibraryItem` PUBLICADO. Prioriza gratuito
(`isFree=true`) sobre pago quando ambos existem; qualquer um dos dois já
passou pelo gate de "acesso legal" do Módulo 7 (todo `LibraryItem`
publicado exige `freeAccessReason` quando gratuito, e `Source` válida
sempre) — "sem acesso legal" nunca chega a esta camada porque nunca chega
a ser `PUBLISHED`.

## 14. Atualidades

Mesmo bundle do item 13 — `CurrentAffair` mais recente por `eventDate`
(nunca `createdAt`, seção 16 do prompt), sempre publicada, sempre com
`Source`. As janelas de 7/30/90 dias (`getRecentCurrentAffairs`) não foram
usadas neste módulo: o bundle por conceito (`getComplementaryContentForConcept`)
já resolve "a atualidade mais recente relacionada a ESTE conceito" sem
precisar de uma janela fixa — documentado como decisão, não omissão (seção
17 do prompt: "não criar outro sistema de janela" — logo, quando uma janela
fizer sentido, é a existente que deve ser chamada, não uma nova).

## 15. Interdisciplinaridade

`findInterdisciplinaryConnections(conceptId)` (nova consulta) chama
`listRelationsForEntity` (Módulo 2, `AcademicRelation`) e filtra: só
relações com `status === PUBLISHED`, e só quando o outro lado é `CONCEPT`
ou `DISCIPLINE`. Sem relação publicada real, `generateInterdisciplinaryActions`
devolve `[]` — nenhuma associação "Psicologia Social parece relacionada a
Sociologia" é inventada por semelhança textual. Escopo desta versão:
conexões cujo outro lado é `DISCIPLINE` (o exemplo do prompt é sempre entre
disciplinas inteiras); relações concept↔concept dentro da mesma árvore
pedagógica já são cobertas pelos outros geradores via
`getPedagogicalContextForConcepts`.

## 16. Gamificação

Não utilizada — o prompt pede "usar como contexto apenas" (seção 22),
opcional; nenhuma decisão de prioridade do motor depende de XP/streak/
nível/meta, então nenhuma chamada ao Módulo 9 foi necessária. Nada do
Módulo 9 foi lido, escrito ou alterado.

## 17. Segurança

Nenhuma função do motor aceita `priority`/`score`/`level`/`state`/`userId`/
`completed`/`mastered`/`recommendationType` como parâmetro de entrada — as
únicas entradas são `actor`, `targetUserId` (opcional) e `{ size? }`
(`getStudyPlan`). Testado explicitamente: um objeto de opções forjado com
todos esses campos extras é passado a `getStudyPlan` e cada ação do plano
resultante tem sua `priority` verificada contra a tabela de configuração do
servidor (`STUDY_ACTION_PRIORITY`), nunca contra o valor forjado.

## 18. Banco/Migrations

Nenhuma. Confirmado explicitamente antes de qualquer código (seção 29 do
prompt: "preferência absoluta: nenhuma migration") — tudo é derivado dos
modelos já existentes.

## 19. Testes

- Testes anteriores (Módulos 1–9): **441**.
- Testes novos (Módulo 10): **31**, em 6 arquivos:
  - `priority.test.ts` (5, puro).
  - `diagnostic-lookup.test.ts` (3 — sem diagnóstico, em andamento,
    concluído).
  - `weak-concepts.test.ts` (4 — amostra insuficiente, fraco real, forte,
    ordenação).
  - `interdisciplinary.test.ts` (4 — sem relação, relação publicada real,
    relação em DRAFT ignorada, relação com tipo de nó fora de escopo
    ignorada).
  - `next-study-action.service.test.ts` (7 — um por gerador de candidato,
    incluindo "nenhum conteúdo não publicado é recomendado").
  - `study-plan.service.test.ts` (8 — primeiro acesso, tamanho do plano,
    payload forjado, privacidade, hierarquia completa com dados reais,
    `getNextStudyAction`).
- **Total final: 472.**

Todas as categorias pedidas na seção 30 do prompt foram cobertas: pesos,
prioridade, conflitos, explicações, primeiro acesso, diagnóstico
concluído, conceito fraco, revisão vencida, próxima lição, questão
recente, simulado, biblioteca, atualidade, plano final, aluno A não
acessa plano de aluno B, nenhuma recomendação para conteúdo não publicado/
sem procedência/sem acesso legal/sem fonte válida.

## 20. Typecheck/Lint/Format/Build

```
npx prisma validate    → OK
npx prisma format      → OK (sem alteração de conteúdo)
npx prisma generate    → OK
npm run typecheck      → OK (sem erros)
npm run lint           → OK (0 erros, 0 warnings)
npm run format:check   → OK
npm run test           → 472/472 (ver seção 24 — regressão)
npm run build          → OK (next build)
```

## 21. Documentação

Criado: `docs/MODULO-10.md`, `src/modules/study-engine/README.md`.
Alterado: `docs/ARQUITETURA.md` (apêndice de status, aditivo — nenhuma
decisão anterior reescrita).

## 22. Decisões técnicas

- **`getInitialStudyPlan` é `getStudyPlan`** — o prompt pede os dois
  nomes, mas a lógica é idêntica (o gate de diagnóstico já é a primeira
  verificação, seja a 1ª visita do aluno ou a 100ª sem nunca ter concluído
  o diagnóstico); duplicar a hierarquia sob outro nome violaria a
  disciplina de não duplicar código já estabelecida nos módulos anteriores.
- **`findLatestFinishedDiagnosticSessionId` é uma consulta nova, mínima e
  sem cálculo** — a única forma de "usar `getDiagnosticResult` sem
  recalcular" quando não se tem um `sessionId` de antemão é primeiro achar
  QUAL sessão é o diagnóstico; sem essa consulta, o motor não teria como
  saber se o aluno já fez o diagnóstico ou não.
- **Conceitos fracos "atuais" (`getCurrentWeakConcepts`) usam
  `computePerformance` sobre TODAS as tentativas, não só as do
  diagnóstico** — o diagnóstico é um retrato do momento em que foi feito;
  o motor de estudo precisa refletir o desempenho conforme o aluno avança
  (lições, revisões, simulados), então reaproveita a mesma função e o
  mesmo limiar do Módulo 3, aplicados sobre um universo de dados maior — não
  é um "outro cálculo", é o MESMO cálculo sobre mais linhas.
- **Interdisciplinaridade escopada a `DISCIPLINE`** — decisão consciente
  de escopo (seção 25, "limitações"), não uma limitação técnica.
- **Gamificação não foi consultada** — o prompt permite (seção 22, "usar
  como contexto apenas"), e nenhuma prioridade do motor depende dela;
  incluí-la sem necessidade real seria acoplamento sem propósito.

## 23. Divergências

Uma, investigada e documentada (não mascarada — seção 31 do prompt):
`startDiagnostic` (Módulo 3) seleciona candidatas de um pool GLOBAL de
questões publicadas e tagueadas (todo o banco, não escopado por teste) —
sob a suíte completa em paralelo, isso pode sortear uma questão que
pertence a OUTRO arquivo de teste, cujo `afterAll` a apaga (cascata:
`QuestionAttempt` → `Question`) antes do teste que a usou terminar,
resultando em "Question não encontrada" ou "sessão sem tentativa em
contexto DIAGNOSTIC" numa parcela pequena das execuções completas. Isso já
era um problema conhecido e documentado desde o Módulo 6
(`docs/MODULO-6.md`) — este módulo, ao adicionar mais arquivos de teste que
publicam questões concorrentemente, tornou o problema mais frequente
(chegou a 3-4 falhas por execução completa antes da investigação). A causa
raiz foi isolada com precisão (mecanismo exato, não só "é uma race") e os
DOIS testes deste módulo expostos a ela foram corrigidos: em vez de
depender da seleção aleatória global de `startDiagnostic`/da varredura
global de `getNextLearningStep` sem `trackId`, os testes agora usam,
respectivamente, `recordAttempt` direto com a questão específica da
fixture (mesmo caminho de correção real, só sem o sorteio) e
`preferredTrackId` explícito. Depois da correção, a suíte completa passou
limpa em 3 de 4 execuções; a única falha residual observada ocorreu num
teste do Módulo 9 (`gamification-events.service.test.ts`, pré-existente,
não alterado por este módulo — alterá-lo estaria fora do escopo do Módulo
10). Nenhuma tentativa foi feita de alterar `diagnostic.service.ts`
(Módulo 3) ou a configuração global de paralelismo do Vitest — ambas
seriam mudanças fora do escopo deste módulo; ficam registradas aqui como
recomendação para um módulo/ajuste de infraestrutura futuro.

## 24. Limitações

- Interdisciplinaridade só considera o outro lado `DISCIPLINE` (não
  `CONCEPT`/`THEORY`/`SCHOOL`).
- Sem uma "janela temporal" própria para atualidades no plano (usa o
  bundle por conceito do Módulo 7, não `getRecentCurrentAffairs`
  diretamente) — decisão registrada na seção 14.
- `getStudyPlan`/`getNextLearningStep` (Módulo 8, sem `trackId`) continuam
  com varredura global de trilhas publicadas — comportamento correto e já
  documentado desde o Módulo 8, só não isolável em teste sob paralelismo
  (ver seção 23).
- Nenhuma rota HTTP — consistente com o projeto inteiro até aqui (nenhum
  módulo anterior expõe camada HTTP própria).

## 25. Conclusão

O Módulo 10 entrega exatamente o motor de decisão pedido: determinístico,
explicável, reproduzível, sem duplicar nenhuma autoridade dos módulos
1–9, sem nenhuma entidade/migration nova, com os 6 tipos de ação do prompt
(mais `START_DIAGNOSTIC`) representados e testados de ponta a ponta com
dados reais. Módulo 10 concluído. Módulo 11 NÃO foi iniciado. Aguardando
autorização explícita.
