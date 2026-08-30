# Módulo 12 — Interface Administrativa e de Curadoria

## 1. Objetivo

Construir a camada administrativa/curatorial da plataforma — permitir que
CONTENT_EDITOR/ADMIN gerenciem disciplinas, base de conhecimento, questões,
provas, pedagogia, biblioteca, atualidades, procedência e auditoria — como
uma camada de apresentação fina sobre os serviços de domínio já existentes
(Módulos 1–9), sem duplicar nenhuma regra de negócio, autorização ou
auditoria.

## 2. Arquitetura analisada

Leitura completa do schema Prisma, `docs/ARQUITETURA.md`, `docs/MODULO-1.md`
a `docs/MODULO-11.md`, e levantamento exaustivo (assinaturas reais, não
resumidas) de `src/modules/knowledge/`, `src/modules/curation/`,
`src/modules/assessment/`, `src/modules/pedagogy/`,
`src/server/auth/authorize.ts`/`devActor.ts`, e dos padrões de UI/Server
Action do Módulo 11 — antes de escrever qualquer código.

**Achados centrais**:

- Todo serviço de domínio já segue o mesmo esqueleto: `create(actor,input)`,
  `update(actor,id,input)`, `publish(actor,id)`/`archive(actor,id)` quando
  aplicável, `get(id)`, `list(params)` — já validam Zod, checam
  `CURATOR_ROLES`/`PUBLISHER_ROLES`, e gravam `ContentAuditLog` via
  `recordAudit`. Nada disso foi recriado.
- `getCurrentActor()` (Módulo 11) sempre devolve `STUDENT` — a área
  administrativa precisava de um segundo mock de dev com papel elevado.
- `ContentAuditLog` só tinha ESCRITA (`recordAudit`) — nenhuma função de
  LEITURA existia; toda auditoria era verificada direto por `prisma` nos
  testes. Faltava uma consulta mínima para a tela `/admin/audit`.
- Não havia nenhuma agregação de contagens para dashboard — cada serviço
  só lista/pagina, nunca soma.
- `Citation` só tinha `listCitationsForEntity` (a partir da entidade citada)
  — faltava o inverso (a partir da fonte) para a tela de procedência.

## 3. Páginas criadas

51 rotas administrativas, todas `force-dynamic` exceto o hub sem dados
próprios (`/admin/knowledge`):

```
/admin                                    painel (contagens reais)
/admin/knowledge                          hub
/admin/knowledge/{disciplines,schools,theories,periods,
                  developmental-stages,tags}[/[id]]   genéricas (CRUD)
/admin/knowledge/concepts[/[id]]          bespoke (dificuldade, obras, tags, citação)
/admin/knowledge/people[/[id]]            bespoke (tags, citação)
/admin/knowledge/works[/[id]]             bespoke (autores)
/admin/knowledge/relations                bespoke (grafo, criação + busca por entidade)
/admin/sources[/[id]]                     Source + LegalReference + citações que a usam
/admin/questions[/new][/[id]]             bespoke (8 tipos, filtros, tags)
/admin/exams[/[id]]                       Exam (genérica) + hub para:
/admin/exams/{boards,organizations,positions}[/[id]]  genéricas
/admin/exams/editions[/[id]]              bespoke (FKs de Exam/Banca/Órgão/Cargo/Fonte)
/admin/pedagogy                           Track (bespoke: lista + criação)
/admin/pedagogy/{areas,units,stages,lessons}[/[id]]   genéricas (exceto lessons/[id])
/admin/pedagogy/tracks/[trackId]          bespoke — árvore completa (link/unlink/reorder)
/admin/pedagogy/lessons/[lessonId]        bespoke — editor de blocos + citação + publicação
/admin/library[/[id]]                     bespoke (gratuito, tags de conhecimento)
/admin/current-affairs[/[id]]             bespoke (eventDate, tags, relevância)
/admin/audit                              leitura de ContentAuditLog com filtros
```

`layout.tsx`/`error.tsx`/`loading.tsx` próprios, mesmo padrão do Módulo 11.

## 4. Componentes

- `AdminHeader`, `AdminSidebarNav`/`AdminMobileNav` (+ `admin-nav-items.ts`)
  — mesmo sistema visual do Módulo 11 (`.app-shell`/`.card`/`.btn`/`.badge`
  reaproveitados; só um punhado de classes novas em `globals.css`:
  `.admin-table`, `.admin-toolbar`, `.form-grid`, `.stat-number`,
  `.admin-mobile-nav`).
- `SimpleEntityListPage`/`SimpleEntityDetailPage` — par de Server Components
  genéricos que renderizam qualquer uma das 14 entidades "simples"
  registradas em `src/config/admin-simple-entities.ts` (evita 14 páginas
  quase idênticas).
- `QuestionForm` — formulário único que cobre os 8 tipos de questão (linhas
  fixas de alternativas/pares, sem JS de cliente).
- `CitationForm` — formulário reutilizável de "adicionar citação", usado em
  toda página de entidade gated por Citation.

## 5. Server Actions (camada fina, `src/server/actions/admin/`)

`simple-entity-actions.ts` (genérica, dirigida por config),
`knowledge-actions.ts` (Concept/AcademicPerson/AcademicWork/AcademicRelation),
`sources-actions.ts`, `questions-actions.ts`, `exams-actions.ts`
(ExamEdition), `pedagogy-actions.ts` (Track + os 4 níveis de link/unlink/
reorder + LessonBlock), `library-actions.ts`, `current-affairs-actions.ts`.

Todas resolvem `getCurrentAdminActor()` e delegam ao serviço real — nenhuma
decide status/prioridade/pontuação, nenhuma aceita `userId` do cliente.
Nenhuma chama `revalidatePath` (decisão técnica, seção 12) — todas as
páginas afetadas já são `force-dynamic`.

## 6. Serviços reutilizados (não duplicados)

Os ~90 exports listados no levantamento inicial dos Módulos 2/3/4/7 —
`create*/update*/publish*/archive*/link*/unlink*/reorder*/get*/list*` de
Discipline/School/Theory/Concept/AcademicPerson/AcademicWork/
AcademicRelation/HistoricalPeriod/DevelopmentalStage/Tag, Source/Citation/
LegalReference, Question/Exam/ExamEdition/ExamBoard/Organization/Position,
Track/LearningArea/Unit/Stage/Lesson/LessonBlock, LibraryItem/CurrentAffair.
Nenhum foi alterado em seu comportamento — só consumido.

**Novo, mínimo, aditivo** (seção 4/12 do prompt: "criar só consulta mínima
quando faltar"):

- `getCurrentAdminActor()` (`devActor.ts`) — mock de dev, segundo usuário,
  role ADMIN.
- `assertAdminAreaAccess()` (`adminAccess.ts`) — guard de entrada em
  `/admin`, reaproveita `assertRole`/`CURATOR_ROLES`.
- `listAuditLogEntries()` (`auditLog.ts`) — leitura paginada/filtrada do
  `ContentAuditLog` já existente.
- `listCitationsBySource()` (`citation.service.ts`) — inverso de
  `listCitationsForEntity`.
- `getAdminDashboardStats()` (`admin-dashboard-stats.service.ts`) —
  agregação read-only de contagens por status, usando `groupBy` (1 consulta
  atômica por entidade — ver seção 12, decisão técnica sobre uma
  inconsistência real encontrada e corrigida).

## 7. Autorização

Reaproveitada sem alteração: `Actor`/`assertRole`/`CURATOR_ROLES`/
`PUBLISHER_ROLES` (Módulo 2). `assertAdminAreaAccess` (novo, mas é só
`assertRole(actor, CURATOR_ROLES)` isolado para ser testável e para o
layout redirecionar) roda no SERVIDOR para toda requisição a `/admin/*`
antes de qualquer página renderizar — STUDENT nunca chega a ver a
estrutura. CONTENT_EDITOR entra e cura; só ADMIN publica (`PUBLISHER_ROLES`,
já embutido em cada `publish*` do domínio — nenhum novo).

## 8. Auditoria

Nenhuma auditoria nova é gravada pela UI — cada `create*/update*/publish*/
archive*/restore*/link*/unlink*` já grava via `recordAudit` dentro do
próprio serviço de domínio (Módulos 2–9). A única adição é do lado da
LEITURA (`listAuditLogEntries`, seção 6), exposta em `/admin/audit`.

## 9. Testes

- Testes anteriores (Módulos 1–11): **496**.
- Testes novos (Módulo 12): **14**, em 8 arquivos:
  - `adminAccess.test.ts` (3 — STUDENT bloqueado, CONTENT_EDITOR e ADMIN
    permitidos).
  - `devActor.test.ts` (+2 — `getCurrentAdminActor` idempotente/sempre
    ADMIN, distinto do ator do aluno).
  - `admin-dashboard-stats.service.test.ts` (2, novo arquivo — shape das
    contagens consistente; transição real sem-procedência → com-procedência
    → publicado de um Concept específico).
  - `auditLog.test.ts` (+1 — `listAuditLogEntries` filtra por entidade/ação).
  - `citation.service.test.ts` (+1 — `listCitationsBySource`).
  - `simple-entity-actions.test.ts` (2, novo arquivo — ciclo completo
    criar→editar→publicar→arquivar de uma Discipline via FormData, com
    `status` forjado ignorado; `entityKey` desconhecido rejeitado).
  - `knowledge-actions.test.ts` (2, novo arquivo — Concept via FormData +
    gate de Citation; `AcademicRelation` com IDs manipulados rejeitada).
  - `questions-actions.test.ts` (1, novo arquivo — questão MULTIPLE_CHOICE
    via formulário genérico de alternativas; visão pública sem
    `isCorrect`/`answerKey`).
- **Total final: 510.**

Cobertura da seção 21/19 do prompt: acesso administrativo, bloqueio de
STUDENT, criação/edição/publicação/arquivamento via Server Action real,
procedência (gate de Citation testado no caminho da UI), relações com IDs
manipulados, payloads forjados (`status`/`isCorrect`) ignorados, ausência de
vazamento de `answerKey`/`isCorrect` na visão pública mesmo para questão
criada pela curadoria, auditoria (leitura confirmada).

**Nota sobre duplicação evitada**: a autorização de cada serviço de domínio
(STUDENT bloqueado de criar/publicar cada entidade) já está exaustivamente
testada nos Módulos 2–9 (72+54+... testes) — não foi re-testada aqui; os
testes novos verificam especificamente o código NOVO deste módulo (guard de
entrada, Server Actions, consultas novas), não a regra que os serviços já
provam sozinhos.

Suíte completa executada 3× nesta sessão: 2 limpas em 510/510; 1 com a
mesma flake pré-existente de paralelismo de arquivo já documentada desde
`docs/MODULO-6.md`/`docs/MODULO-10.md` (pool global de `Question`
compartilhado entre arquivos de teste concorrentes) — não é deste módulo,
não foi alterada.

## 10. Typecheck/Lint/Format/Build

```
npx prisma validate/format/generate → OK, schema inalterado
npm run typecheck                    → OK
npm run lint                         → OK (0 erros, 0 warnings)
npm run format:check                 → OK
npm run test                         → 510/510 (2 de 3 execuções)
npm run build                        → OK (51 rotas administrativas, todas ƒ exceto /admin/knowledge)
```

Verificação adicional fora da suíte automatizada: servidor de desenvolvimento
real (`next dev`) consultado via HTTP direto confirmando o HTML renderizado
de `/admin`, `/admin/knowledge/disciplines`, `/admin/questions`,
`/admin/pedagogy`, `/admin/library` e `/admin/audit` — todos com conteúdo
real (números do dashboard, tabelas, formulários), e `/dashboard` do aluno
intacto.

## 11. Migrations

Nenhuma. `npx prisma validate` confirma o schema inalterado — o módulo é
inteiramente UI + camada fina + duas consultas de leitura novas sobre
tabelas já existentes.

## 12. Decisões técnicas

1. **Segundo mock de dev (`getCurrentAdminActor`, role ADMIN)** — sem ele,
   nenhuma página administrativa teria `Actor` para chamar os serviços;
   ADMIN (não CONTENT_EDITOR) foi escolhido para exercitar toda a
   superfície (inclusive publicação) em desenvolvimento — a distinção real
   entre os dois papéis continua 100% responsabilidade dos serviços de
   domínio, testada há muito nos Módulos 2–9.
2. **Registro genérico de 14 entidades (`admin-simple-entities.ts`)** —
   Discipline/School/Theory/HistoricalPeriod/DevelopmentalStage/Tag/Exam/
   ExamBoard/Organization/Position/LearningArea/Unit/Stage/Lesson
   compartilham exatamente o mesmo esqueleto de serviço; descrever cada uma
   uma vez numa tabela de despacho evitou ~14 páginas e ~14 arquivos de
   Server Action quase idênticos, sem esconder nenhuma regra (a validação
   real continua 100% em cada serviço).
3. **Concept/AcademicPerson/AcademicWork/AcademicRelation/Question/
   ExamEdition/Track/Lesson ficaram fora do registro genérico** — têm
   relações/formulários ricos demais (dificuldade+estágio+obras+tags;
   autores; grafo; 8 tipos de questão; múltiplas FKs; árvore completa;
   blocos) para o formulário genérico — páginas próprias, deliberadamente.
4. **Nenhuma Server Action chama `revalidatePath`** — toda página afetada
   já é `force-dynamic` (nunca cacheada pelo Data Cache do Next.js); chamar
   `revalidatePath` seria redundante e, fora de uma requisição real (como em
   teste de integração chamando a Server Action diretamente), lança
   `Invariant: static generation store missing` — descoberto pela própria
   suíte de testes deste módulo, corrigido removendo a chamada (não
   mascarado).
5. **`getAdminDashboardStats` usa `groupBy` (1 consulta por entidade), não
   4 `count()` separados** — a primeira versão fazia
   `count({status:DRAFT})`/`PUBLISHED`/`ARCHIVED`/`count()` via
   `Promise.all`; sob escrita concorrente real (confirmado pela suíte sob
   paralelismo de arquivo), isso podia produzir `total !== draft+published+
archived` — um bug de consistência genuíno do dashboard, não só do
   teste. `groupBy` resolve tudo numa única consulta atômica, sempre
   internamente consistente, em produção e sob teste.
6. **Reordenação por texto ("ids separados por vírgula"), sem
   drag-and-drop** — mesma filosofia do Módulo 11 (formulários HTML puros,
   nenhuma biblioteca de UI nova); `assertValidReorder` (Módulo 4) já
   recusa qualquer conjunto que não bata exatamente com o vinculado.
7. **`AcademicRelation` sem listagem "todas as relações"** — o Módulo 2 só
   expõe `listRelationsForEntity(tipo, id)`; a tela de curadoria segue o
   mesmo modelo (buscar por entidade) em vez de introduzir uma consulta
   nova sem uso real no produto.
8. **Simulados (`Simulation`) deliberadamente fora do escopo desta UI** —
   o serviço de curadoria (`createSimulationFromQuestionIds`/
   `publishSimulation`/`archiveSimulation`, Módulo 6) já existe e segue o
   mesmo padrão, mas "simulados" não aparece na lista de entidades do
   prompt deste módulo nem na estrutura de exemplo (`/admin/...`) — expor
   sem pedido explícito seria escopo não solicitado; registrado aqui como
   gap conhecido para uma extensão futura trivial.
9. **Gamificação (`Achievement`/`Challenge`) fora do escopo** — não são
   conteúdo acadêmico curado; nenhum serviço de CRUD existe para eles
   (confirmado no levantamento), e não fazem parte da lista de entidades
   deste módulo.

## 13. Limitações

- Sem UI para `Simulation` curado nem `Achievement`/`Challenge` (seção 12,
  itens 8-9).
- Filtros de `listDisciplines`/`listSchools`/`listTheories`/`listExams`/
  `listExamBoards`/`listOrganizations`/`listPositions` não suportam filtro
  por status no serviço — as páginas genéricas dessas 7 entidades listam
  tudo (paginado), sem seletor de status; as 4 pedagógicas (`LearningArea`/
  `Unit`/`Stage`/`Lesson`) e `Track` suportam porque seus serviços já
  aceitavam esse parâmetro.
- Reordenação por texto (ids separados por vírgula) é funcional mas não é
  drag-and-drop — decisão consciente (item 6), não lacuna técnica.
- `LessonBlock` do tipo QUESTION só oferece questões já PUBLICADAS no
  seletor — decisão de segurança (não force o curador a escolher entre
  rascunhos), não uma limitação do serviço.

## 14. Divergências

Uma investigada e corrigida (não mascarada): a inconsistência de
`getAdminDashboardStats` sob escrita concorrente (seção 12, item 5) — causa
raiz identificada (4 queries independentes sem atomicidade), corrigida na
fonte (`groupBy`), não contornada no teste.

## 15. O que não foi implementado (confirmado)

Autenticação real (mantém `devActor`, mock explícito), OAuth, pagamentos,
IA/LLM, scraping/ETL automático, app mobile — nenhum desses foi tocado,
consistente com a seção 20 do prompt.

## 16. Instruções para uso

1. Acessar `/admin` (redireciona para `/dashboard` se o ator resolvido não
   tiver `CURATOR_ROLES` — hoje sempre ADMIN via `getCurrentAdminActor`).
2. Painel mostra contagens reais; cada linha da tabela linka para a lista
   daquele tipo de conteúdo.
3. Fluxo típico de publicação: criar (nasce `DRAFT`) → adicionar Citation
   (quando exigida) → publicar (só então `PUBLISHED`) → arquivar quando
   obsoleto.
4. Árvore pedagógica: criar Track/Area/Unit/Stage/Lesson nas páginas
   genéricas correspondentes, depois ir a `/admin/pedagogy/tracks/[id]`
   para vincular/ordenar.
5. Lição: editor de blocos em `/admin/pedagogy/lessons/[id]`.

## 17. Riscos conhecidos

- `getCurrentAdminActor` sempre ADMIN — em produção real (quando a
  autenticação existir), qualquer requisição a `/admin` se tornaria esse
  usuário; **crítico que este mock nunca chegue a produção** (mesma
  ressalva de `getCurrentActor`, Módulo 11, reforçada aqui).
- Nenhuma paginação client-side nas listas genéricas (`take: 100/200`
  fixo) — adequado ao volume atual (base sem conteúdo real), sem
  otimização especulativa.

## 18. Conclusão

O Módulo 12 entrega a camada administrativa completa pedida — 51 rotas
reais, todas com serviço de domínio real por trás, nenhuma regra de
negócio duplicada, um bug de consistência genuíno encontrado e corrigido
na origem, e um registro genérico que cobriu 14 das ~24 entidades
administráveis sem duplicar código. Módulo 12 concluído.

## 19. Nota aditiva — autenticação real (etapa de consolidação)

Registrado aqui sem reescrever as seções acima (que descrevem o estado no
momento da entrega deste módulo): a etapa de consolidação que seguiu
substituiu `getCurrentAdminActor()`/`assertAdminAreaAccess` (mock de dev,
seções 6/7 acima) por `requireAdminSessionActor()`
(`src/server/auth/session.ts`, autenticação real por cookie de sessão) no
`layout.tsx` e em todas as Server Actions de `src/server/actions/admin/`.
O comportamento de autorização (`CURATOR_ROLES`/`PUBLISHER_ROLES`) não
mudou — só a fonte do `Actor` deixou de ser um mock fixo e passou a ser a
sessão real do usuário logado. Detalhes completos em
`docs/FINALIZACAO-PROJETO.md`.
