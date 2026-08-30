# Módulo 4 — Núcleo Pedagógico (camada funcional)

> Constrói sobre o Módulo 1 (Fundação Técnica), o Módulo 2 (Base de Conhecimento funcional) e o Módulo 3 (Avaliações, Banco de Questões e Diagnóstico Inicial) sem alterar a arquitetura conceitual aprovada em `docs/ARQUITETURA.md`. Bounded context principal: `src/modules/pedagogy`. Não implementa UI de produto, dashboard, gamificação funcional, biblioteca, notícias/atualidades, scraping, ou autenticação/sessão real. Não cadastra conteúdo real (só fixtures de teste, prefixo `TEST_FIXTURE_`, removidas ao final de cada teste).

## 1. Objetivo

Transformar o Núcleo Pedagógico (`Track`/`TrackArea`/`LearningArea`/`AreaUnit`/`Unit`/`UnitStage`/`Stage`/`StageLesson`/`Lesson`/`LessonBlock`/`LessonKnowledgeTag`, existentes apenas como schema desde o Módulo 1) em um domínio funcional: serviços que criam, vinculam, reordenam, publicam e consultam a curadoria pedagógica **sobre** a Base de Conhecimento — nunca substituindo-a.

## 2. Princípio fundamental (reforçado, não uma decisão nova)

`Concept ≠ Lesson`, `Theory ≠ Lesson`, `AcademicPerson ≠ Lesson`, `Question ≠ Lesson`. A Base de Conhecimento (Módulo 2) continua dona da verdade acadêmica; o Núcleo Pedagógico só organiza, ensina e **referencia** esse conhecimento — nunca duplica. `LessonBlock.content` é texto pedagógico próprio (como explicar), não uma cópia de `Concept.definition`; `LessonBlock.questionId` aponta para uma `Question` real do Módulo 3, nunca duplica o enunciado.

## 3. Escopo

Implementado: as 28 capacidades pedidas (criação de Track/LearningArea/Unit/Stage/Lesson, criação e ordenação de LessonBlock, vinculação em cada nível N:N, reordenação segura, reuso de conteúdo, associação com a Base de Conhecimento, associação de questões às lições, publicação/arquivamento controlados, validação estrutural, auditoria, autorização, e as 7 consultas — trilha completa, por área, por conceito, por teoria, por escola, por dificuldade, lições publicadas).

Fora do escopo (confirmado vazio): UI de produto, dashboard, gamificação funcional, aprendizado adaptativo funcional (só a estrutura que o viabiliza — ver seção 9), autenticação/sessão real, conteúdo real, scraping, notícias, biblioteca, Módulo 5 em diante.

## 4. Entidades envolvidas

Nenhuma entidade nova foi criada no schema — todas já existiam desde o Módulo 1: `Track · TrackArea · LearningArea · AreaUnit · Unit · UnitStage · Stage · StageLesson · Lesson · LessonBlock · LessonKnowledgeTag`. A espinha pedagógica continua N:N em todos os níveis (`Track ⇄ TrackArea ⇄ LearningArea ⇄ AreaUnit ⇄ Unit ⇄ UnitStage ⇄ Stage ⇄ StageLesson ⇄ Lesson`) — nenhuma FK direta nova substituiu um join, nenhum nível virou 1:N.

Uma mudança fora do schema, no serviço de Citation do Módulo 2 (ver seção 8).

## 5. Serviços criados

| Arquivo                           | Funções                                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `track.service.ts`                | `createTrack`, `updateTrack`, `publishTrack`, `archiveTrack`, `linkTrackToArea`/`unlinkTrackFromArea`, `reorderTrackAreas`, `getTrack`, `listTracks`                                                   |
| `learning-area.service.ts`        | idem para `LearningArea` ⇄ `Unit` (`AreaUnit`)                                                                                                                                                         |
| `unit.service.ts`                 | idem para `Unit` ⇄ `Stage` (`UnitStage`); valida `primaryDisciplineId`/`primarySchoolId` quando informados                                                                                             |
| `stage.service.ts`                | idem para `Stage` ⇄ `Lesson` (`StageLesson`) — o join que permite reuso de uma `Lesson` em múltiplas `Stage`s                                                                                          |
| `lesson.service.ts`               | `createLesson`, `updateLesson`, `publishLesson`, `archiveLesson`, `linkLessonToKnowledge`/`unlink...` (`LessonKnowledgeTag`), `getLesson`, `listLessons`                                               |
| `lesson-block.service.ts`         | `createLessonBlock`, `updateLessonBlock`, `deleteLessonBlock`, `reorderLessonBlocks`, `assertLessonBlockShapeValid`, `getLessonBlock`, `listLessonBlocks`                                              |
| `pedagogy-publication.service.ts` | `assertPublishStatusTransition`, `assertTrackPublishable`, `assertLearningAreaPublishable`, `assertUnitPublishable`, `assertStagePublishable`, `assertLessonPublishable` (regra centralizada, seção 6) |
| `pedagogy-query.service.ts`       | `getFullTrack`, `listContentByArea`, `listLessonsByConcept`/`ByTheory`/`BySchool`/`ByDifficulty`, `listPublishedLessons`                                                                               |
| `reorder.ts`                      | `assertValidReorder` — validação de reordenação segura (seção 7), reaproveitada pelos 5 níveis                                                                                                         |
| `errors.ts`                       | `PedagogyValidationError`, `ReorderError`                                                                                                                                                              |

Reaproveitados sem alteração: `Actor`/`assertRole`/`CURATOR_ROLES`/`PUBLISHER_ROLES` (Módulo 2), `recordAudit`/`AUDIT_ACTIONS` (Módulo 2), `assertPublishable`/`assertArchivable`/`NotFoundError` (Módulo 2), `entityExists`/`resolveEntity` (Módulo 1/2).

## 6. Regras de publicação/arquivamento

Centralizadas em `pedagogy-publication.service.ts` — nenhum serviço de entidade decide sozinho "posso publicar?".

- **`Track`, `LearningArea`, `Unit`, `Stage`**: **não** estão em `CitationEntityType` (nunca estiveram — não são conteúdo acadêmico citável, são curadoria pedagógica). O gate é **estrutural**: só publica com **ao menos um filho já `PUBLISHED`** vinculado (`Stage` exige Lesson publicada; `Unit` exige Stage publicada; `LearningArea` exige Unit publicada; `Track` exige LearningArea publicada). Isso força o fluxo bottom-up natural — testado explicitamente na cadeia completa Lesson→Stage→Unit→LearningArea→Track (`track.service.test.ts`).
- **`Lesson`**: **está** em `CitationEntityType` desde o Módulo 1 (o enum antecipava este módulo, sem consumidor até agora). Publicar reaproveita o mesmo gate de procedência do Módulo 2 (`assertPublishable`, exige ≥1 `Citation`) **e** exige ≥1 `LessonBlock` (não publica lição sem conteúdo). Testado: rejeitado sem block mesmo com citation; rejeitado sem citation mesmo com block; permitido com ambos.
- Arquivamento: idempotente (`assertArchivable` — não arquiva o que já está arquivado), sem cascata para os filhos — arquivar uma `Stage` não arquiva as `Lesson`s vinculadas (elas podem estar em outras `Stage`s, ver seção 7).

## 7. Reutilização de conteúdo pedagógico e reordenação segura

`StageLesson` é o join que corrige a v1 (docs/ARQUITETURA.md, seção 3): uma mesma `Lesson` pode ser vinculada a mais de uma `Stage` sem duplicar conteúdo. Testado explicitamente em `stage.service.test.ts` — vincular a mesma `Lesson` a duas `Stage`s distintas, e confirmar que desvincular de uma não afeta a outra.

Reordenação (`reorder.ts`, `assertValidReorder`) é **por conjunto completo**, não item a item: quem chama `reorderXxx(actor, parentId, orderedChildIds)` precisa enviar exatamente o mesmo conjunto de ids já vinculado — omissão, duplicata ou id estranho é rejeitado (`ReorderError`), evitando `order` inconsistente ou um filho "esquecido" fora da lista. Aplicada nos 5 níveis (`TrackArea`, `AreaUnit`, `UnitStage`, `StageLesson`, `LessonBlock`) dentro de uma `$transaction`. `LessonBlock` precisa de um passo extra: como `@@unique([lessonId, order])` rejeitaria uma troca direta de posições dentro da mesma transação (a posição intermediária colidiria com uma linha ainda não atualizada), `reorderLessonBlocks` passa por uma posição negativa temporária antes de gravar a ordem final.

## 8. Associação com a Base de Conhecimento e com questões

- `LessonKnowledgeTag` (Lesson ↔ nó de conhecimento) reaproveita `resolveEntity`/`entityExists` (Módulo 1/2) — mesmo mecanismo de `QuestionKnowledgeTag` (Módulo 3), validando existência do nó antes de gravar.
- Associação de questões às lições (capacidade 14) usa o campo já existente `LessonBlock.questionId` — uma FK real (não polimórfica) para `Question`. `assertLessonBlockShapeValid` exige `questionId` para blocos `QUESTION` e proíbe os demais tipos de referenciar uma questão.
- **Mudança no Módulo 2**: `citation.service.ts` (`citationTargetExists`) rejeitava explicitamente `LESSON` como "módulo ainda não implementado". Como `Lesson` agora existe, essa lacuna foi fechada — `LESSON` passa a ser resolvido diretamente (`prisma.lesson.findUnique`), igual a `ACADEMIC_RELATION`. `QUESTION`/`EXAM_EDITION` permanecem fora do escopo desta função (pertencem ao Módulo 3, não tocado aqui). Teste correspondente atualizado em `citation.service.test.ts` (o teste antigo que esperava rejeição de `LESSON` foi substituído por um teste que confirma a resolução).

## 9. Consultas

`pedagogy-query.service.ts` — todas de leitura pura, sem mutação:

- `getFullTrack(trackId)` — monta Track → LearningArea → Unit → Stage → Lesson → LessonBlock, cada nível ordenado pelo `order` do join.
- `listContentByArea(areaId)` — units → stages → lessons de uma área.
- `listLessonsByConcept`/`ByTheory`/`BySchool` — via `LessonKnowledgeTag.entityType`.
- `listLessonsByDifficulty(difficulty)` — nenhum nó pedagógico tem `difficulty` própria (não é dono da verdade acadêmica); a dificuldade é **derivada** do(s) `Concept`(s) que a Lesson ensina, via `LessonKnowledgeTag` → `Concept.difficulty`.
- `listPublishedLessons()` — lições com `status = PUBLISHED`.

**Preparação para aprendizado adaptativo futuro** (capacidade 28, sem implementação funcional aqui): `LessonKnowledgeTag`/`QuestionKnowledgeTag`/`TopicMastery` já compartilham a mesma chave (`KnowledgeEntityType` + `entityId`, tipicamente `CONCEPT`) desde os Módulos 1-3 — um módulo futuro de aprendizado adaptativo pode juntar `Progress`/`TopicMastery` com o conteúdo pedagógico deste módulo sem nenhuma migration nova. Nenhum código de recomendação/adaptação foi escrito.

## 10. Autorização

Reaproveita `Actor`/`assertRole`/`CURATOR_ROLES`/`PUBLISHER_ROLES` dos Módulos 2/3, sem alteração.

- **CONTENT_EDITOR ou ADMIN**: criar/editar Track/LearningArea/Unit/Stage/Lesson/LessonBlock, vincular/desvincular/reordenar em qualquer nível, associar conhecimento.
- **Só ADMIN**: publicar (mesma convenção — "publicar" é ato administrativo). Arquivar continua com CURATOR_ROLES, igual aos Módulos 2/3.

## 11. Auditoria

`ContentAuditLog` (mecanismo já existente, Módulo 1/2) integrado a toda mutação: criação/atualização/publicação/arquivamento de cada entidade, e cada link/unlink/reorder — registrado sob o `entityType` do lado "pai" da relação (ex.: vincular uma `Lesson` a uma `Stage` é auditado como `STAGE`/`LINK`; criar/editar/reordenar um `LessonBlock` é auditado como `LESSON`/`CREATE`|`UPDATE`, já que `LessonBlock` não tem entrada própria em `AuditableEntityType` — é conteúdo interno da Lesson).

## 12. Testes

**179 testes, 29 arquivos, todos verdes** (124 dos Módulos 1-3 + 1 teste novo em `citation.service.test.ts` (item 8) + 54 novos deste módulo, em 7 arquivos): `track.service.test.ts` (8), `learning-area.service.test.ts` (7), `unit.service.test.ts` (9), `stage.service.test.ts` (9), `lesson.service.test.ts` (9), `lesson-block.service.test.ts` (7), `pedagogy-query.service.test.ts` (5). Cobertura: CRUD de cada entidade, segurança (STUDENT bloqueado/CONTENT_EDITOR permitido/ADMIN exclusivo para publicar), publicação bottom-up completa (Lesson→Stage→Unit→Area→Track), gates de publicação rejeitados (sem filho publicado, sem citation, sem block), reuso de Lesson entre Stages, link/unlink/reorder nos 5 níveis (incluindo rejeição de reordenação parcial/com id estranho), validação de forma de `LessonBlock` por tipo, âncora acadêmica opcional de `Unit` (válida e inexistente), e as 7 consultas.

## 13. Decisões técnicas

1. **Gate de publicação estrutural (bottom-up) para Track/LearningArea/Unit/Stage, distinto do gate de Citation do Módulo 2** — essas 4 entidades nunca estiveram em `CitationEntityType`; inventar uma exigência de Citation para elas seria forçar um mecanismo que não se aplica. O gate estrutural (≥1 filho publicado) é a tradução direta de "publicação controlada"/"validação estrutural" (capacidades 15/17) para entidades curatoriais, não acadêmicas.
2. **`Lesson` reaproveita o gate de Citation do Módulo 2** em vez de ganhar um mecanismo de procedência próprio — o enum já a incluía em `CitationEntityType` desde o Módulo 1; criar um campo `sourceId` próprio seria um segundo mecanismo paralelo de procedência, não pedido e não necessário.
3. **`citationTargetExists` passa a resolver `LESSON`** — fechar essa lacuna era indispensável: sem isso, `assertLessonPublishable` nunca teria como ser satisfeito (impossível criar uma Citation com `entityType=LESSON` antes desta mudança), tornando a publicação de qualquer Lesson permanentemente impossível. `QUESTION`/`EXAM_EDITION` foram deliberadamente deixados de fora — não é escopo do Módulo 4 corrigi-los.
4. **Reordenação por conjunto completo, não por swap/patch parcial** — um `PATCH` de "mover item X para a posição N" pareceria mais simples, mas deixa em aberto o que fazer com os itens deslocados (renumerar em cascata? rejeitar?). Exigir a lista completa elimina essa ambiguidade: quem chama já decidiu a ordem final inteira.
5. **`LessonBlock` reordena via posição negativa temporária** — necessário por causa do `@@unique([lessonId, order])`; sem esse passo intermediário, uma troca de posições dentro da mesma `$transaction` colidiria consigo mesma.
6. **Nenhuma entidade nova, nenhuma migration** — todo o Módulo 4 foi construído sobre o schema já existente desde o Módulo 1; a única mudança fora de `src/modules/pedagogy` foi a correção pontual em `citation.service.ts` (item 3), justificada pela dependência direta com a regra de publicação de `Lesson`.

## 14. Limitações

- Sem sessão/autenticação real (herdado dos Módulos 1-3) — `Actor` continua explícito.
- Nenhuma rota HTTP/Server Action exposta — só serviços de domínio, como pedido.
- Nenhum job de integridade referencial para `LessonKnowledgeTag` (mesma limitação já documentada no Módulo 2 para `AcademicRelation`/`QuestionKnowledgeTag` — mitigada por validação em tempo de escrita, não por constraint de banco).
- `listLessonsByDifficulty` só enxerga dificuldade via `Concept` — uma Lesson tagueada só por `Theory`/`School`/`Discipline` (sem nenhum `Concept`) não aparece em nenhuma faixa de dificuldade; é uma consequência direta de "Lesson não tem difficulty própria" (seção 9), documentada, não um bug.

## 15. O que ficou para módulos posteriores

UI de qualquer tipo; gamificação funcional (XP por lição, streak, conquistas); aprendizado adaptativo funcional (a estrutura que o viabiliza já existe, ver seção 9); dashboard; biblioteca de livros gratuitos; sistema de atualidades/notícias; ETL/importação em massa/scraping; assinaturas; analytics; Mapa do Conhecimento e Linha do Tempo (Módulos 13/14 do roadmap original); autenticação/sessão real; conteúdo real cadastrado.
