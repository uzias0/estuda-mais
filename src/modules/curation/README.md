# curation — Curadoria, Fontes, Biblioteca e Atualidades (transversal)

`Source`, `LegalReference`, `Citation`, `ContentAuditLog` (Módulo 2) — procedência, auditoria e a política de publicação por Citation, reaproveitadas por praticamente todo módulo de conteúdo. `LibraryItem`, `CurrentAffair` (Módulo 7) — biblioteca acadêmica/livros gratuitos e atualidades contextualizadas, curadas com o mesmo vocabulário de publicação/auditoria.

```
types/
  library-item.schema.ts        — LibraryItemCreate/UpdateInputSchema, LibraryItemKnowledgeTagInputSchema
  current-affair.schema.ts      — CurrentAffairCreate/UpdateInputSchema, DateRangeFilterSchema
server/services/
  source.service.ts             — CRUD de Source (Módulo 2)
  citation.service.ts           — Citation (Módulo 2, estendido no Módulo 4 para LESSON)
  legalReference.service.ts     — LegalReference (Módulo 2)
  publicationPolicy.ts          — assertPublishable (gate de Citation), assertArchivable, NotFoundError
  auditLog.ts                   — recordAudit, AUDIT_ACTIONS (Módulo 2; RESTORE adicionado no Módulo 7)
  errors.ts                     — ContentValidationError (Módulo 7)
  content-publication.service.ts — gates de publicação de LibraryItem/CurrentAffair (Módulo 7)
  content-linking.service.ts    — link/unlink de conhecimento + Tag (Módulo 7)
  library.service.ts            — CRUD/publish/archive/restore de LibraryItem (Módulo 7)
  library-query.service.ts      — consultas públicas de biblioteca (Módulo 7)
  current-affairs.service.ts    — CRUD/publish/archive/restore de CurrentAffair (Módulo 7)
  current-affairs-query.service.ts — consultas/"recentes" de atualidades (Módulo 7)
  recent-content.service.ts     — wrappers finos sobre listQuestions (Módulo 3/6)
  complementary-content.service.ts — diagnóstico → conteúdo complementar (Módulo 7)
  recentWindow.ts               — PURA: janela temporal (7/30/90 dias, custom)
```

Ver [`docs/MODULO-2.md`](../../../docs/MODULO-2.md) e [`docs/MODULO-7.md`](../../../docs/MODULO-7.md) para objetivo, regras e decisões técnicas completas.

Princípios que não mudam: `sourceId` obrigatório sempre que a entidade tem procedência própria (mesmo padrão de `Question`); relacionamento com a Base de Conhecimento sempre via o mecanismo polimórfico já existente (`resolveEntity`/`KnowledgeEntityType`), nunca um novo; nenhum conteúdo é `PUBLISHED` por criação — só por ato explícito de ADMIN, com gate revalidado no servidor.

UI, scraping, IA e biblioteca/atualidades com conteúdo real continuam fora do escopo — módulos futuros.
