# Módulo 11 — Interface do Estudante

## 1. Objetivo

Construir a experiência de UI do aluno — as 10 áreas do menu principal
(início, estudar, trilhas, revisão, questões, simulados, biblioteca,
atualidades, progresso, conquistas) mais diagnóstico e a execução real de
lição/revisão/simulado — consumindo os Módulos 1–10 sem duplicar nenhuma
regra de negócio, cálculo ou autoridade de dados. Sem IA/LLM, sem nova
entidade de domínio, sem autenticação real.

## 2. Arquitetura analisada

Leitura de `docs/ARQUITETURA.md`, `docs/MODULO-1.md` a `docs/MODULO-10.md`,
e do código real de `assessment`, `pedagogy`, `review`, `simulation`,
`curation`, `knowledge`, `gamification`, `study-engine`.

**Achado central**: nenhum módulo anterior expõe camada HTTP/UI — tudo é
serviço de domínio puro chamado por `Actor` explícito (Módulo 1). Este
módulo é o primeiro a ter uma interface de fato, e o primeiro a precisar
de um "usuário logado" sem que exista autenticação real (adiada desde o
Módulo 1). Resolvido com um mock de desenvolvimento documentado, nunca com
uma autenticação improvisada.

**Reaproveitado sem alteração** (nenhum destes módulos foi tocado):

- Módulo 3: `startDiagnostic`, `submitDiagnosticAnswer`, `finishDiagnostic`,
  `getDiagnosticResult`, `listQuestions`, `toPublicQuestionView`,
  `recordAttempt`.
- Módulo 5: `getReviewQueue`, `startReviewSession`, `submitReviewAnswer`,
  `finishReviewSession`.
- Módulo 6: `buildSimulation`, `getSimulation`, `listSimulations`,
  `startSimulationAttempt`, `submitSimulationAnswer`, `finishSimulation`.
- Módulo 7: `listLibraryByDiscipline`, `getLibraryItem`,
  `listCurrentAffairsByDiscipline`, `getCurrentAffair`.
- Módulo 8: `completeLesson`, `getLessonExecutionState`,
  `getNextLearningStep`.
- Módulo 9: `processLessonCompletionEvent`, `processReviewCompletionEvent`,
  `processSimulationCompletionEvent`, `getGamificationSummary`.
- Módulo 10: `getStudyPlan`, `getNextStudyAction`, `getInitialStudyPlan`.
- Módulo 2/4: `listDisciplines`, `listTracks`, `getTrack`, `getConcept`,
  `getDiscipline`, `resolveEntity`.

**Entidades novas**: nenhuma. **Migrations**: nenhuma.

## 3. Sistema visual

`src/app/globals.css` — CSS puro (custom properties), sem Tailwind/
CSS-in-JS: a stack real do projeto não tinha nenhum deles, e adicionar um
agora seria trocar de ferramenta sem necessidade. Tokens de cor/espaço/
tipografia, mais classes reutilizáveis (`.card`, `.btn`, `.badge`,
`.grid-cards`, `.stack`, `.text-input`, navegação, skeleton). Nenhuma
biblioteca visual nova.

## 4. Actor de desenvolvimento (mock, não autenticação)

`src/server/auth/devActor.ts` — `getCurrentActor()` resolve (find-or-create
por e-mail fixo) um único `User` `STUDENT` persistido no banco real e o
devolve como `Actor` (Módulo 1). Documentado extensivamente no próprio
arquivo como **mock de desenvolvimento, não autenticação**: nenhuma
verificação de identidade, qualquer requisição vira automaticamente esse
usuário. Autenticação real fica para um módulo futuro, fora de escopo.

## 5. Layout e navegação

`src/app/dashboard/layout.tsx` envolve todas as rotas `/dashboard/*` com
`Header` + `SidebarNav` (desktop) / `BottomNav` (mobile, subconjunto de 5
itens) — os dois exportados de `src/components/SidebarNav.tsx`, movidos
por rota ativa via `usePathname` (por isso Client Component; nenhum dado de
domínio é buscado no layout). `src/components/nav-items.ts` centraliza os
10 itens do menu — cada um com página e serviço de domínio reais por trás,
nenhuma rota "vazia".

## 6. Rotas construídas (20, testadas via `next build` real)

```
/                                                → redirect para /dashboard
/dashboard                                       → início (GamificationSnapshot + StudyActionCard)
/dashboard/diagnostico (+/resultado)             → DiagnosticRunner
/dashboard/estudar                               → plano de estudo (Módulo 10)
/dashboard/licoes/[lessonId]                      → LessonRunner
/dashboard/revisao (+/sessao)                    → fila + ReviewSessionRunner
/dashboard/simulados (+[id] +[id]/resultado)     → montagem/execução/resultado
/dashboard/questoes                              → listagem/filtro
/dashboard/biblioteca (+[id])                    → listagem + item
/dashboard/atualidades (+[id])                   → listagem + item
/dashboard/trilhas (+[trackId])                  → listagem + detalhe
/dashboard/progresso                             → TopicMastery/progresso real
/dashboard/conquistas                            → achievements/streak/meta real
```

8 páginas usam `export const dynamic = "force-dynamic"` (ver seção 12 —
bug real encontrado e corrigido).

## 7. Componentes-chave

- `QuestionRenderer` — os 8 tipos de questão do Módulo 3
  (`MULTIPLE_CHOICE`, `TRUE_FALSE`, `MULTI_SELECT`, `ORDERING`, `MATCHING`,
  `FILL_BLANK`, `SHORT_ANSWER`, `CASE_STUDY`), consumindo só
  `PublicQuestionViewLike` (nunca `isCorrect`/`answerKey` — ver seção 11).
- `LessonRunner`, `DiagnosticRunner`, `ReviewSessionRunner`,
  `SimulationRunner`/`SimulationLauncher` — Client Components de execução;
  `SimulationRunner` nunca mostra feedback por questão antes da
  finalização (diferente dos outros três), por decisão explícita do
  prompt.
- `StudyActionCard`, `GamificationSnapshot`, `ProgressBar`, `Badge`,
  `EmptyState`, `ErrorState`, `Skeleton` — apresentação pura, sem lógica de
  negócio.

## 8. Funções de integração pequenas (`src/lib/`)

O Módulo 10 devolve só IDs (`lessonId`/`conceptId`/`disciplineId`...) de
propósito — para não copiar dado de outro domínio. Faltavam pequenas
funções de exibição; cada uma documentada como o "mínimo indispensável",
nunca uma nova regra de negócio:

- `resolve-names.ts` — resolve nomes reais de conceito/disciplina via os
  `getX` já existentes.
- `study-action-display.ts` — título/subtítulo legíveis para uma
  `NextStudyAction`, com rótulo genérico (nunca erro) quando a referência
  falta ou não existe mais.
- `study-action-links.ts` — função PURA (sem I/O) que só decide a rota de
  destino de uma `NextStudyAction`; nunca recalcula prioridade/motivo.
- `format.ts` — só formatação de apresentação (data, percentual, rótulo);
  todo número já chega calculado do servidor.
- `time.ts` — `Date.now()` isolado num módulo próprio fora do corpo de
  componentes/hooks, para satisfazer `react-hooks/purity` (eslint-config-
  next 16) sem inventar valor nem violar a regra.

## 9. Server Actions (camada fina)

Todas com `"use server"`, resolvendo `Actor` via `getCurrentActor()` e
delegando 100% aos serviços de domínio já existentes — nenhum cálculo/
regra nova em nenhuma delas:

- `diagnostic-actions.ts` — `startDiagnosticAction`,
  `submitDiagnosticAnswerAction`, `finishDiagnosticAction`,
  `getDiagnosticResultAction` (Módulo 3).
- `lesson-actions.ts` — `startLessonAction`, `getLessonSessionAction`,
  `submitLessonActivityAction`, `completeLessonAction` (Módulo 8); ao
  concluir, processa o evento de gamificação real
  (`processLessonCompletionEvent`, Módulo 9) e busca o próximo passo
  (`getNextStudyAction`, Módulo 10) para a tela de conclusão.
- `review-actions.ts` — `startReviewSessionAction`,
  `submitReviewAnswerAction`, `finishReviewSessionAction` (Módulo 5), mesmo
  padrão de evento de gamificação ao finalizar.
- `simulation-actions.ts` — `buildSimulationAction`,
  `startSimulationAction`, `submitSimulationAnswerAction`,
  `finishSimulationAction` (Módulo 6), mesmo padrão de evento de
  gamificação ao finalizar.

## 10. Tempo de execução (`timeSpentMs`)

Enviado ao servidor como dado real medido no client (nunca calculado pelo
servidor no lugar do aluno) — `now() - startedAt` em `DiagnosticRunner`,
`LessonRunner`, `ReviewSessionRunner`, `SimulationRunner`, usando
`src/lib/time.ts` (seção 8).

## 11. Segurança

Testado explicitamente (`QuestionRenderer.contract.test.ts`): o formato que
`toPublicQuestionView` (Módulo 3/6) devolve — e que `QuestionRenderer`/
`PublicQuestionViewLike` esperam — NUNCA inclui `isCorrect` em nenhuma
alternativa nem `answerKey`. A UI não tem como exibir/vazar o gabarito
mesmo que tentasse, porque o dado simplesmente não chega até ela. Nenhuma
Server Action aceita `isCorrect`/`priority`/`score` como entrada vinda do
client.

## 12. Bug real encontrado e corrigido

Várias páginas do dashboard estavam sendo pré-renderizadas estaticamente
no build (`next build` as marcava `○ Static`) — como os dados são por
aluno (progresso, gamificação, fila de revisão, plano de estudo...), isso
congelaria o conteúdo do primeiro build para sempre, servindo o mesmo HTML
a qualquer aluno. Corrigido com `export const dynamic = "force-dynamic"`
nas 8 páginas afetadas (`/dashboard`, `/estudar`, `/progresso`,
`/conquistas`, `/revisao`, `/trilhas`, `/simulados`, `/atualidades`) —
confirmado depois via `next build` real, todas agora `ƒ Dynamic`.

## 13. O que não foi implementado (fora de escopo, por decisão do prompt)

- **Autenticação real** — o prompt pediu explicitamente para não
  implementar (seção 47); `devActor.ts` é o substituto temporário,
  documentado como mock, não produto.
- **Admin/curadoria** — esta é a experiência do estudante; os fluxos de
  curadoria (Módulos 2/4/5) continuam sem UI própria.
- **Mapa do conhecimento / linha do tempo** — módulos futuros (13/14 no
  roadmap de `docs/ARQUITETURA.md`).
- **IA/LLM** — nenhuma chamada, nenhuma dependência nova.

## 14. Banco/Migrations

Nenhuma. `npx prisma validate`/`format`/`generate` confirmam o schema
inalterado — tudo é UI e camada fina sobre serviços já existentes.

## 15. Testes

- Testes anteriores (Módulos 1–10): **472**.
- Testes novos (Módulo 11): **24**, em 10 arquivos, todos de integração
  real (Postgres) exceto onde marcado puro:
  - `QuestionRenderer.contract.test.ts` (1 — contrato de segurança,
    `isCorrect`/`answerKey` nunca chegam à `PublicQuestionViewLike`).
  - `format.test.ts` (6, puro — sem banco).
  - `resolve-names.test.ts` (2 — nomes reais, referência inexistente).
  - `study-action-display.test.ts` (5 — título real por tipo de ação,
    rótulo genérico sem lançar erro quando a referência falta).
  - `study-action-links.test.ts` (5, puro — uma rota por tipo de ação).
  - `diagnostic-actions.test.ts` (1 — início → resposta → finalização →
    resultado, ponta a ponta com dados reais).
  - `lesson-actions.test.ts` (1 — execução → conclusão → evento de
    gamificação → próximo passo, ponta a ponta).
  - `review-actions.test.ts` (1 — sessão de revisão ponta a ponta).
  - `simulation-actions.test.ts` (1 — montagem → execução → finalização
    ponta a ponta).
  - `devActor.test.ts` (1 — find-or-create idempotente, sempre `STUDENT`).
- **Total final: 496.**

A suíte completa rodou 3 vezes: 2 limpas em 496/496, 1 com a flake
pré-existente do pool global de diagnóstico (já documentada desde o
Módulo 6/10 — ver `docs/MODULO-10.md`, seção 23); nenhum teste deste
módulo foi alterado para mascará-la.

## 16. Typecheck/Lint/Format/Build

```
npx prisma validate    → OK
npx prisma format      → OK (sem alteração de conteúdo)
npx prisma generate    → OK
npm run typecheck      → OK (sem erros)
npm run lint           → OK (0 erros, 0 warnings)
npm run format:check   → OK
npm run test           → 496/496 (2 de 3 execuções; ver seção 15)
npm run build          → OK (next build, 20 rotas, 8 dinâmicas confirmadas)
```

## 17. Documentação

Criado: `docs/MODULO-11.md`.
Alterado: `docs/ARQUITETURA.md` (apêndice de status, aditivo — nenhuma
decisão anterior reescrita).

## 18. Decisões técnicas

- **`devActor.ts` é infraestrutura de desenvolvimento, não produto** — sem
  isso, nenhuma página poderia chamar um serviço de domínio (todos exigem
  `Actor`); documentado com o mesmo rigor de um contrato de segurança para
  que nunca seja confundido com autenticação real nem promovido a produção
  por engano.
- **CSS puro, sem biblioteca visual nova** — a stack real do projeto não
  tinha nenhuma; adicionar uma agora sem necessidade comprovada violaria a
  disciplina de não introduzir ferramenta nova sem justificativa (mesma
  regra aplicada em `docs/ARQUITETURA.md`, seção 13).
- **`SimulationRunner` nunca revela feedback por questão** — diferente de
  `LessonRunner`/`DiagnosticRunner`/`ReviewSessionRunner`, por pedido
  explícito do prompt (simulado deve reproduzir a experiência de uma prova
  real).
- **`time.ts` isola `Date.now()`** — a alternativa (desabilitar a regra do
  linter) esconderia o aviso em vez de resolvê-lo; isolar a chamada fora do
  corpo do componente é a correção real, não uma supressão.
- **Server Actions como camada fina** — cada uma resolve `Actor` e delega
  integralmente ao serviço de domínio; nenhuma decide nada, nenhuma
  recalcula nada — mesma disciplina de "orquestração sem autoridade"
  estabelecida desde o Módulo 10.

## 19. Divergências

Nenhuma divergência nova introduzida por este módulo. A flake do pool
global de diagnóstico (seção 15) é a mesma já isolada e documentada desde
`docs/MODULO-10.md`, seção 23 — não foi alterada nem mascarada aqui.

## 20. Limitações

- Sem autenticação real (seção 13) — `devActor.ts` é o único "usuário" do
  sistema até um módulo de autenticação ser autorizado.
- Sem UI de admin/curadoria — fora do escopo deste módulo.
- Ícones do menu são emoji (seção 5), não um sistema de ícones dedicado —
  suficiente para esta fase, sem dependência nova.
- A flake de paralelismo de testes (seção 15) continua sem correção de
  infraestrutura — registrada como recomendação para módulo futuro, mesmo
  status do Módulo 10.

## 21. Conclusão

O Módulo 11 entrega a interface completa do estudante — 20 rotas reais,
todas com serviço de domínio por trás, nenhuma duplicando cálculo/
autoridade dos Módulos 1–10, nenhuma entidade/migration nova, contrato de
segurança de gabarito testado explicitamente, e o bug real de
pré-renderização estática encontrado e corrigido antes da entrega. Módulo
11 concluído. Módulo 12 em diante NÃO foi iniciado. Aguardando autorização
explícita.
