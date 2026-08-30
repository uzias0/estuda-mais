# Módulo 7 — Biblioteca Acadêmica, Atualidades e Curadoria de Conteúdo

> Constrói sobre os Módulos 1–6 sem alterar a arquitetura conceitual aprovada em `docs/ARQUITETURA.md`. Bounded context principal: `src/modules/curation` (mesmo bounded context de `Source`/`Citation`/`LegalReference`/auditoria desde o Módulo 2 — biblioteca e atualidades são, por natureza, mais um par de entidades curadas, não um novo domínio). Nenhuma IA/LLM, nenhum scraping, nenhuma UI. Não implementa Módulo 8.

## 1. Status

**Concluído.**

## 2. Objetivo

Transformar a camada de curadoria em uma camada acadêmica de **contextualização**: relacionar livros gratuitos/legais, atualidades e questões recentes ao conhecimento já modelado (Concept/Theory/School/Discipline/Person/Work/Period/DevelopmentalStage) e à árvore pedagógica (Track…Lesson), sem duplicar nada disso e sem inventar um segundo mecanismo de relação, procedência ou publicação.

## 3. Arquitetura

Duas entidades novas, deliberadamente enxutas: `LibraryItem` e `CurrentAffair`. Ambas:

- têm `sourceId` obrigatório (FK real para `Source`, Módulo 2) — mesmo padrão de procedência de `Question` (Módulo 3), não o gate de Citation usado por Concept/Theory/School/Discipline/Person/Lesson;
- relacionam-se à Base de Conhecimento via um join `{Entidade}KnowledgeTag` contra `KnowledgeEntityType` — o MESMO mecanismo polimórfico de `LessonKnowledgeTag`/`QuestionKnowledgeTag` (Módulos 3/4), resolvido via `resolveEntity`/`entityExists` (Módulo 1/2). Nenhum mecanismo polimórfico novo (seção 33 do prompt);
- descobrem sua posição na árvore pedagógica em tempo de consulta, via `getPedagogicalContextForConcepts` (Módulo 6) — nenhuma FK direta para `Track`/`Area`/`Unit`/`Stage`/`Lesson` (seção 32 do prompt: "não duplicar a árvore pedagógica").

```
prisma/schema.prisma
  enum LibraryMaterialType, FreeAccessReason, CurrentAffairRelevance
  model LibraryItem, LibraryItemKnowledgeTag
  model CurrentAffair, CurrentAffairKnowledgeTag

src/modules/curation/
├── types/
│   ├── library-item.schema.ts       — LibraryItemCreate/UpdateInputSchema, LibraryItemKnowledgeTagInputSchema
│   └── current-affair.schema.ts     — CurrentAffairCreate/UpdateInputSchema, DateRangeFilterSchema
└── server/services/
    ├── errors.ts                     — ContentValidationError
    ├── content-publication.service.ts — gates de publicação (LibraryItem/CurrentAffair)
    ├── content-linking.service.ts    — link/unlink de conhecimento (ambas) + Tag (CurrentAffair)
    ├── library.service.ts            — CRUD, publish/archive/restore
    ├── library-query.service.ts      — listas públicas, busca, livros gratuitos, por conceito/disciplina/teoria, contexto pedagógico
    ├── current-affairs.service.ts    — CRUD, publish/archive/restore
    ├── current-affairs-query.service.ts — busca, recentes (janela), por conceito/disciplina
    ├── recent-content.service.ts     — getRecentQuestions/ByConcept/ByExam (wrappers finos sobre o Módulo 3)
    ├── complementary-content.service.ts — getComplementaryContentForConcept (capstone diagnóstico→conteúdo)
    └── recentWindow.ts                — PURA: resolução de janela temporal (7/30/90 dias, custom)
```

## 4. Entidades reutilizadas

`Source`/`Citation`/`LegalReference` (Módulo 2, procedência), `AcademicWork`/`AcademicPerson`/`Concept`/`Theory`/`School`/`Discipline`/`HistoricalPeriod`/`DevelopmentalStage` (Módulo 2, via `KnowledgeEntityType`), `Tag` (Módulo 2, transversal — reaproveitado por `CurrentAffair`), `resolveEntity`/`entityExists` (Módulo 1/2), `Actor`/`assertRole`/`CURATOR_ROLES`/`PUBLISHER_ROLES` (Módulo 2), `recordAudit`/`AUDIT_ACTIONS`/`ContentAuditLog` (Módulo 2), `assertArchivable`/`NotFoundError` (Módulo 2), `getPedagogicalContextForConcepts` (Módulo 6), `listQuestions` (Módulo 3/6), `getDiagnosticResult` (Módulo 3, só consumido, nunca modificado).

## 5. Entidades novas

- **`LibraryItem`** — título, descrição, `authorName` (fallback) ou `academicWorkId` (link real e opcional para uma `AcademicWork` já rastreada — não duplica título/ano/tipo/autoria), `materialType` (`LibraryMaterialType`: LIVRO/EBOOK/ARTIGO/MONOGRAFIA/TESE/DISSERTACAO/MATERIAL_DIDATICO/DOCUMENTO/OUTRO — lista literal do prompt, seção 5), `language`, `year`, `isFree`+`freeAccessReason` (`FreeAccessReason`: PUBLIC_DOMAIN/OPEN_LICENSE/AUTHOR_PROVIDED/INSTITUTIONAL_ACCESS/OFFICIAL_FREE_ACCESS — seção 6), `sourceId`, `status`.
- **`LibraryItemKnowledgeTag`** — join polimórfico (ver seção 3).
- **`CurrentAffair`** — título, resumo, conteúdo educacional, `eventDate` (data do acontecimento — nunca `createdAt`), `validUntil`, `relevance` (`CurrentAffairRelevance`: LOW/MODERATE/HIGH — julgamento editorial explícito, seção 8), `sourceId`, `status`, `tags` (N:N com `Tag`).
- **`CurrentAffairKnowledgeTag`** — join polimórfico.

**Por que não reaproveitar só `AcademicWork`** (seção 4 do prompt, respondida explicitamente): `AcademicWork` não tem `url`/`licença`/`isFree`/`freeAccessReason`/`disponibilidade` — esses campos já existem em `Source` (reaproveitados via `sourceId`) ou são genuinamente novos (`isFree`/`freeAccessReason`/`materialType`). Nem todo item de biblioteca é uma obra formalmente autorada (ex.: material didático institucional), e nem toda `AcademicWork` é um recurso gratuito de biblioteca. Quando as duas coisas coincidem, `LibraryItem.academicWorkId` faz a ponte sem duplicar dado.

## 6. Serviços criados/alterados

Ver árvore da seção 3. Alterações em módulos anteriores (mínimas, aditivas, justificadas):

- `curation/server/services/auditLog.ts` — `AUDIT_ACTIONS.RESTORE` (novo valor de vocabulário, string — não enum de banco), necessário para "restaurar quando permitido" (seção 20), sem equivalente nos Módulos 2-6.
- `prisma/schema.prisma` — `AuditableEntityType` ganhou `LIBRARY_ITEM`/`CURRENT_AFFAIR` (mesma lacuna recorrente de todo módulo anterior que introduz entidade curada).

Nenhum serviço do Módulo 3 (diagnóstico/questões), Módulo 4 (pedagogia), Módulo 5 (revisão) ou Módulo 6 (simulados) foi alterado.

## 7. Biblioteca

`library.service.ts` (CRUD + `publishLibraryItem`/`archiveLibraryItem`/`restoreLibraryItem`) e `library-query.service.ts` (`listPublishedLibraryItems`, `searchLibrary`, `listFreeBooks`, `listLibraryByConcept`/`ByDiscipline`/`ByTheory`, `listRelatedMaterials` genérico, `getLibraryItemPedagogicalContext`). Todas as consultas públicas filtram `PUBLISHED` por padrão (`publishedOnly: false` só para uso de curadoria).

## 8. Livros gratuitos

`isFree=true` **nunca** é aceito sozinho: exige `freeAccessReason` (validado no Zod na criação, revalidado combinando existente+patch no `update`) e, na **publicação**, exige que a `Source` vinculada tenha `url` preenchida — e, se `freeAccessReason=OPEN_LICENSE`, que `Source.license` também esteja preenchida. `listFreeBooks()` só retorna `isFree=true` e `PUBLISHED`.

## 9. Atualidades

`current-affairs.service.ts` (mesmo padrão de CRUD/publish/archive/restore) e `current-affairs-query.service.ts`. `eventDate` é sempre a data do acontecimento real, nunca confundida com `createdAt`/`updatedAt` — testado explicitamente. "URL oficial" (seção 8) é `Source.url`, reaproveitado, não duplicado. `getRecentCurrentAffairs` aceita janelas pré-definidas (7/30/90 dias) ou intervalo customizado (`DateRangeFilterSchema`, validado), mais filtros por conceito/disciplina/teoria/escola/tags — determinístico, ordenado por `eventDate desc`.

## 10. Relacionamentos acadêmicos

`LibraryItemKnowledgeTag`/`CurrentAffairKnowledgeTag` cobrem os 8 tipos de `KnowledgeEntityType` (PERSON/WORK/THEORY/CONCEPT/SCHOOL/DISCIPLINE/PERIOD/DEVELOPMENTAL_STAGE) — um mesmo item pode ter várias tags de tipos diferentes (interdisciplinaridade real, testada: um item ligado a `CONCEPT` e `DISCIPLINE` ao mesmo tempo, sem duplicar a linha). `CurrentAffair` ainda reaproveita `Tag` (Módulo 2) para rótulos livres, além dos nós tipados.

## 11. Procedência

`sourceId` obrigatório em ambas as entidades desde a criação (validado por existência real, nunca confiado ao payload). Regra de publicação centralizada em `content-publication.service.ts`: fonte válida, URL quando necessário (sempre para `CurrentAffair`; para `LibraryItem` quando `isFree`), licença quando `freeAccessReason=OPEN_LICENSE`, e >=1 relacionamento com a Base de Conhecimento (nenhum item "órfão" é publicável).

## 12. Publicação

`DRAFT → PUBLISHED → ARCHIVED → DRAFT` (restauração, seção 20 — nunca pula direto para `PUBLISHED`; precisa passar de novo pelo gate completo). `status` nunca vem do payload — `createLibraryItem`/`createCurrentAffair` sempre nascem `DRAFT`; só `publishLibraryItem`/`publishCurrentAffair` (ADMIN) alteram para `PUBLISHED`. Testado com payload forjado (`status: "PUBLISHED"`, `isPublished: true`, `publishedAt`, `license`, `createdByUserId`) — todos ignorados.

## 13. Autorização

`CURATOR_ROLES` (CONTENT_EDITOR/ADMIN): criar, editar, vincular/desvincular, arquivar, restaurar. `PUBLISHER_ROLES` (só ADMIN): publicar — mesma convenção de todos os módulos anteriores. STUDENT: bloqueado de tudo isso (testado em cada operação de mutação). Consultas de leitura (biblioteca/atualidades publicadas) não exigem role.

## 14. Auditoria

`ContentAuditLog` gerado em CREATE/UPDATE/PUBLISH/ARCHIVE/RESTORE/LINK/UNLINK — testado explicitamente (lista de ações geradas por um ciclo de vida completo). Consultas públicas (listagens, busca, "recentes") não geram auditoria.

## 15. Banco / Migrations

Uma migration real, aditiva, aplicada no Postgres real de desenvolvimento:

- `20260819233545_module7_library_and_current_affairs` — cria `LibraryMaterialType`/`FreeAccessReason`/`CurrentAffairRelevance`; adiciona `LIBRARY_ITEM`/`CURRENT_AFFAIR` a `AuditableEntityType`; cria `LibraryItem`, `LibraryItemKnowledgeTag`, `CurrentAffair`, `CurrentAffairKnowledgeTag`, e a tabela implícita `_CurrentAffairToTag`.

## 16. Testes

**339 testes, 51 arquivos, todos verdes** (291 herdados dos Módulos 1–6, intactos + 48 novos deste módulo, em 7 arquivos novos): `recentWindow.test.ts` (5, puro), `library.service.test.ts` (17), `current-affairs.service.test.ts` (11), `content-linking.service.test.ts` (4), `current-affairs-query.service.test.ts` (5), `library-query.service.test.ts` (5), `complementary-content.service.test.ts` (1). Confirmado com `npx vitest run --no-file-parallelism`: **339/339 determinístico**, sem regressão em nenhum teste anterior.

**Antes → depois:** 291 → 339 (48 testes novos, 0 removidos).

Cobertura literal da seção 34/35: criação, validação de URL/fonte/licença, material gratuito sem `freeAccessReason` rejeitado, publicação sem/com procedência válida, arquivamento/restauração, relacionamento com conceito/disciplina/interdisciplinar, criação de atualidade com `eventDate` distinta de `createdAt`, atualidades recentes (janela padrão e customizada), filtro por data/conceito/disciplina, questões recentes/por prova (via `recent-content.service.ts`, exercitado pelo teste de `complementary-content.service.ts`), autorização de CONTENT_EDITOR/ADMIN/STUDENT, auditoria, payloads forjados (`status`/`isPublished`/`sourceId`/`publishedAt`/`license`/`createdByUserId`), idempotência (link repetido, restauração dupla).

## 17. Typecheck/Lint/Format/Build

- `npx prisma validate` → ✅ válido
- `npx prisma format` → ✅ aplicado
- `npx prisma generate` → ✅ gerado
- `npm run typecheck` → ✅ sem erros
- `npm run lint` → ✅ sem erros
- `npm run format:check` → ✅ sem divergências
- `npm run test` → ✅ 339/339
- `npm run build` → ✅ build de produção concluído

## 18. Decisões técnicas

1. **`LibraryItem`/`CurrentAffair` como entidades novas, não extensões de `AcademicWork`** — justificado na seção 5 acima; a alternativa duplicaria `Source` dentro de `AcademicWork` ou misturaria duas responsabilidades (identidade acadêmica citável vs. disponibilidade de leitura gratuita para o aluno).
2. **`academicWorkId` como FK real opcional, não um `KnowledgeEntityTag`** — é uma relação de IDENTIDADE ("este item É esta obra"), categoricamente diferente de "está relacionado a" (que usa o join polimórfico); tratá-la como tag perderia essa distinção e obrigaria uma segunda consulta para obter os dados da obra.
3. **URL oficial de `CurrentAffair` = `Source.url`, não um campo próprio** — a seção 8 lista "URL oficial" e "fonte" juntas; como `Source.url` já existe (Módulo 2) e a fonte é obrigatória, duplicar a URL na `CurrentAffair` violaria "não crie um segundo sistema de fontes" (seção 7) sem ganhar nada.
4. **Descoberta pedagógica sempre derivada, nunca FK direta** — `getPedagogicalContextForConcepts` (Módulo 6) já resolve isso a partir de qualquer conjunto de `conceptId`s; adicionar `trackId`/`lessonId` etc. em `LibraryItem`/`CurrentAffair` duplicaria a árvore pedagógica (proibido explicitamente na seção 32).
5. **`AUDIT_ACTIONS.RESTORE` novo** — "restaurar quando permitido" (seção 20) não tinha equivalente nos Módulos 2-6 (arquivar sempre foi tratado como definitivo até aqui); vocabulário de string, mesmo mecanismo de todos os outros valores.
6. **Restauração sempre para `DRAFT`, nunca direto para `PUBLISHED`** — obriga reaplicar o gate de publicação completo (fonte/URL/licença/relacionamento), evitando que um item arquivado "reapareça" publicado sem revalidação.
7. **`recent-content.service.ts` é só wrappers finos sobre `listQuestions`** (Módulo 3/6) — a seção 15 pede nomes específicos (`getRecentQuestions`, `getQuestionsByConcept`, `getQuestionsByExam`), mas a lógica de filtro/ordenação já existe integralmente; reimplementá-la seria a duplicação que a seção 4 proíbe.
8. **`getComplementaryContentForConcept` não decide "o que é fraco"** — recebe um `conceptId` já identificado por quem chama (tipicamente `getDiagnosticResult`, Módulo 3) e só agrega; nenhuma lógica de diagnóstico foi recriada (seção 17/40, aplicada literalmente).

## 19. Divergências

Nenhuma divergência de convenção em relação aos Módulos 2-6 — autorização, publicação, auditoria e procedência seguem exatamente os mesmos padrões já estabelecidos (CONTENT_EDITOR/ADMIN curam, só ADMIN publica, `ContentAuditLog` para mutação administrativa, `sourceId` obrigatório como em `Question`).

## 20. Limitações

- `listRelatedMaterials`/`listLibraryByConcept` etc. não paginam por relevância (só por `title asc`) — determinístico, mas sem ranqueamento; aceitável no volume deste módulo (sem conteúdo real).
- Busca textual (`searchLibrary`/`searchCurrentAffairs`) é `contains`/`insensitive` simples — sem full-text search/ranking; suficiente para o escopo, não uma limitação de arquitetura (Postgres full-text pode ser adotado depois sem mudar a API).
- Nenhuma rota HTTP/Server Action exposta — só serviços de domínio.
- Sem sessão/autenticação real (herdado) — `Actor` explícito.
- Preparação arquitetural para importação futura (CSV/JSON/API oficial) e para "atualidades ↔ Sociologia/Psicologia/Filosofia" fica implícita no design (join polimórfico já aberto a qualquer `KnowledgeEntityType`) — nenhum pipeline de ingestão foi criado, como pedido.

## 21. O que não foi implementado

UI, dashboard, app mobile, autenticação real, pagamentos, assinatura, notificações, chatbot, IA/LLM, scraping, ETL automático, recomendação por IA, analytics avançado, biblioteca de conteúdo real, Módulo 8.

## 22. Conteúdo real inserido

Nenhum. Só fixtures `TEST_FIXTURE_*`, criadas e removidas em cada `afterAll` (`cleanupFixtures`, estendida com `libraryItemIds`/`currentAffairIds`).

## 23. Próximo passo

Módulo 7 concluído. Módulo 8 NÃO foi iniciado. Aguardando autorização explícita.
