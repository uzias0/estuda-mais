# Módulo 2 — Base de Conhecimento Acadêmica (camada funcional)

> Constrói sobre o Módulo 1 (Fundação Técnica) sem alterar a arquitetura aprovada em `docs/ARQUITETURA.md`/`docs/RELATORIO_REVISAO_V3.md`. Não implementa UI de produto, dashboard, mapa do conhecimento ou linha do tempo — só domínio + serviços + validação + testes, como pedido.

## 1. Objetivo

Transformar as entidades da Base de Conhecimento (criadas apenas como schema no Módulo 1) em um domínio funcional: serviços que criam, atualizam, relacionam, citam e publicam `Discipline`, `School`, `Theory`, `Concept`, `AcademicPerson`, `AcademicWork`, `HistoricalPeriod`, `DevelopmentalStage`, `Tag`, `AcademicRelation`, `Source`, `Citation` e `LegalReference` — respeitando a política de procedência e a autorização por papel.

## 2. Escopo

Implementado: os 14 serviços de domínio pedidos na seção 6 do prompt, todos com validação Zod, autorização, e (onde aplicável) auditoria e gate de publicação.

Fora do escopo (confirmado vazio): questões/provas/simulados, lições/trilhas, gamificação, dashboard, mapa do conhecimento, linha do tempo, ETL, conteúdo real.

## 3. Entidades envolvidas

Nenhuma entidade nova foi criada no schema — todas já existiam desde o Módulo 1. **Uma mudança aditiva de enum** foi necessária (ver seção 12).

`Discipline · School · Theory · Concept · AcademicPerson · AcademicWork · AcademicWorkAuthor · HistoricalPeriod · DevelopmentalStage · Tag · AcademicRelation · Source · Citation · LegalReference`

## 4. Serviços criados

| Arquivo                                                       | Funções                                                                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/knowledge/server/services/discipline.service.ts` | `createDiscipline`, `updateDiscipline`, `publishDiscipline`, `archiveDiscipline`, `getDiscipline`, `listDisciplines`                                      |
| `.../school.service.ts`                                       | idem + `linkSchoolToDiscipline`/`unlinkSchoolFromDiscipline`                                                                                              |
| `.../theory.service.ts`                                       | idem + `linkTheoryToSchool`/`unlink...`, `linkTheoryToConcept`/`unlink...`                                                                                |
| `.../concept.service.ts`                                      | idem + `linkConceptToWork`/`unlink...`, `linkConceptToTag`/`unlink...`                                                                                    |
| `.../academicPerson.service.ts`                               | idem + `linkPersonToTag`/`unlink...`                                                                                                                      |
| `.../academicWork.service.ts`                                 | `createAcademicWork`, `updateAcademicWork`, `publishAcademicWork`, `archiveAcademicWork`, `addAuthorToWork`, `removeAuthorFromWork`                       |
| `.../historicalPeriod.service.ts`                             | `createHistoricalPeriod`, `updateHistoricalPeriod`, `getHistoricalPeriod`, `listHistoricalPeriods` (consulta por nome/faixa de ano)                       |
| `.../developmentalStage.service.ts`                           | `createDevelopmentalStage`, `updateDevelopmentalStage`, `getDevelopmentalStage`, `listDevelopmentalStages`                                                |
| `.../tag.service.ts`                                          | `createTag`, `updateTag`, `getTag`, `listTags`                                                                                                            |
| `.../academicRelation.service.ts`                             | `createAcademicRelation`, `updateAcademicRelation`, `archiveAcademicRelation`, `publishAcademicRelation`, `listRelationsForEntity`, `getAcademicRelation` |
| `src/modules/curation/server/services/source.service.ts`      | `createSource`, `updateSource`, `getSource`, `listSources`                                                                                                |
| `.../citation.service.ts`                                     | `createCitation`, `updateCitationNote`, `listCitationsForEntity`, `getCitation`, `citationTargetExists`                                                   |
| `.../legalReference.service.ts`                               | `createLegalReference`, `updateLegalReference`, `getLegalReference`                                                                                       |
| `.../publicationPolicy.ts`                                    | `assertPublishable`, `assertArchivable`, `hasCitation` (regra centralizada, seção 5/7)                                                                    |
| `.../auditLog.ts`                                             | `recordAudit`, `toAuditableEntityType`, vocabulário `AUDIT_ACTIONS`                                                                                       |
| `src/server/auth/authorize.ts`                                | `Actor`, `assertRole`, `CURATOR_ROLES`, `PUBLISHER_ROLES` — **novo primitivo**, ver seção 10                                                              |

## 5. Regras de publicação

Centralizadas em `publicationPolicy.ts` — nenhum serviço decide "posso publicar?" sozinho.

- **`Discipline`, `School`, `Theory`, `Concept`, `AcademicPerson`**: `publishX()` exige `role=ADMIN` **e** ≥1 `Citation` associada (`assertPublishable`). Testado: sem citation → rejeitado; com citation → permitido (todas as 5 entidades).
- **`AcademicWork`**: `publishAcademicWork()` **não** exige Citation (não está na lista da seção 7 do prompt — sua procedência é `sourceId`, opcional e secundária) — mas a transição continua centralizada, auditada, e bloqueada se já `PUBLISHED`/`ARCHIVED`.
- **`AcademicRelation`**: regra própria em `academicRelation.service.ts` — exige (1) evidência (`citationId` preenchido OU uma `Citation` com `entityType=ACADEMIC_RELATION`) **e** (2) que os nós de origem e destino existam e estejam em status `APPROVED`/`PUBLISHED` (nós sem `status` — `HistoricalPeriod`/`DevelopmentalStage` — são tratados como sempre aprovados). Testado: publicação rejeitada com nós não aprovados; permitida com evidência + nós aprovados.
- **`HistoricalPeriod`, `DevelopmentalStage`, `Tag`**: sem `status` no schema — sem publicação, é taxonomia de referência (decisão da v3, preservada).

## 6. Procedência (Source vs. Citation)

Distinção da seção 8 do prompt, aplicada literalmente no código:

- `Citation.sourceId` é sempre uma FK real para `Source` — **nunca** aponta para `AcademicWork` diretamente.
- Quando uma `AcademicWork` deve embasar um `Concept`/`Theory`, a obra precisa de seu próprio `Source` (`AcademicWork.sourceId`, opcional) — é esse `Source` que uma `Citation` cita, não a obra.
- `createCitation()` valida que `sourceId` existe e que a entidade citada (`entityType`+`entityId`) existe, antes de gravar.

## 7. AcademicRelation

`createAcademicRelation()` valida, nesta ordem: `relationType` na allow-list (`assertValidRelationType`, sem enum de banco), nó de origem existe (`resolveEntity` do Módulo 1, reaproveitado), nó de destino existe, `citationId` existe (se informado), e duplicata (mesma tupla `sourceType+sourceId+relationType+targetType+targetId` — o `@@unique("uniqRelationEdge")` do banco é a última linha de defesa; o serviço já checa antes, defesa em profundidade). `updateAcademicRelation()` só altera `description`/`citationId` (a identidade da aresta é imutável). `archiveAcademicRelation()`/`publishAcademicRelation()` como descrito na seção 5.

Nenhum `relationType` novo foi adicionado à allow-list — os 10 tipos já existentes (`INFLUENCIOU`, `CRITICADA_POR`, `RELACIONADO_A`, `DESENVOLVEU`, `EXPANDIU`, `OPOSICAO_A`, `DERIVOU_DE`, `APLICADO_EM`, `ESTUDOU`, `COLABOROU_COM`) cobriram todos os cenários de teste deste módulo.

## 8. Citation / Source

`citationTargetExists()` resolve a existência do alvo citado: reaproveita `entityExists()` do Módulo 1 para os 6 tipos que se sobrepõem a `KnowledgeEntityType` (PERSON/WORK/THEORY/CONCEPT/SCHOOL/DISCIPLINE), resolve `ACADEMIC_RELATION` diretamente, e **rejeita explicitamente** `QUESTION`/`LESSON`/`EXAM_EDITION` com um erro claro ("ainda não é suportada — fora do escopo do Módulo 2"), em vez de aceitar silenciosamente uma citação para um módulo que não existe.

## 9. Autorização

**Novo primitivo** (`src/server/auth/authorize.ts`) — não existia sistema de sessão/autenticação real até este módulo (Módulo 1 deferiu isso deliberadamente). Como os serviços já precisavam checar papel no servidor, um `Actor` explícito (`{ userId, role }`) é passado pela camada que chama o serviço, em vez de lido de uma sessão inexistente. Quando o módulo de autenticação for implementado, ele passa a montar esse `Actor` a partir da sessão real — os serviços não mudam.

Mapeamento de papel → operação:

- **CONTENT_EDITOR ou ADMIN** (`CURATOR_ROLES`): criar, atualizar, arquivar, relacionar, citar.
- **Só ADMIN** (`PUBLISHER_ROLES`): publicar — é o ato final e administrativo de tornar conteúdo visível, tratado como a "operação administrativa" da seção 28.
- **STUDENT**: nenhuma operação de escrita.

Toda mutation chama `assertRole()` no início — nunca depende de a UI esconder um botão.

## 10. Auditoria

`recordAudit()` grava em `ContentAuditLog` (mecanismo já existente do Módulo 1) para toda mutação relevante: `CREATE`, `UPDATE`, `PUBLISH`, `ARCHIVE`, `LINK`, `UNLINK` (vocabulário centralizado em `AUDIT_ACTIONS`). Comprovado por teste dedicado (`auditLog.test.ts`) que consulta `ContentAuditLog` diretamente após operações reais, não apenas assume que a chamada funcionou.

## 11. Testes

**72 testes, 15 arquivos, 100% verdes**, todos rodando contra o Postgres real de desenvolvimento (nenhum mock de banco onde a regra depende dele). Cobertura da matriz da seção 28:

- **Concept / AcademicPerson**: criação, atualização, publicação sem citation (rejeitada), publicação com citation (permitida).
- **Theory**: criação, relações (School/Concept, N:N preservada), publicação, procedência.
- **AcademicWork**: criação, autor (add/remove), fonte (sourceId inexistente rejeitado), conceitos.
- **AcademicRelation**: relação válida; source/target inexistente; relationType inválido; duplicata; publicação com nós não aprovados (rejeitada); publicação com evidência válida e nós aprovados (permitida); nós sem status sempre aprovados.
- **Citation**: Source válido; Source inexistente; entidade válida; entidade inexistente; tipos fora de escopo rejeitados explicitamente.
- **Segurança**: STUDENT bloqueado de criar (Concept/AcademicPerson/School/Source); CONTENT_EDITOR cria mas não publica; ADMIN publica e arquiva.
- **Taxonomia leve**: Discipline (+ arquivamento), School (+ link N:N com Discipline), HistoricalPeriod (consulta por ano, validação de intervalo), DevelopmentalStage, Tag.
- **Auditoria**: `ContentAuditLog` de fato populado por `createConcept`/`publishConcept`.

Os 22 testes do Módulo 1 continuam passando, intactos, dentro dos 72.

## 12. Alterações de banco/migrations

Uma migration foi necessária: `20260819000023_auditable_entity_type_knowledge_extras` — adiciona os valores `PERIOD`, `DEVELOPMENTAL_STAGE` e `TAG` ao enum `AuditableEntityType`. Lacuna descoberta ao implementar `historicalPeriod.service.ts`/`developmentalStage.service.ts`/`tag.service.ts`: essas três entidades da Base de Conhecimento também precisam de trilha de auditoria, mas o enum do Módulo 1 não previa nós sem `status`/curadoria própria. Adição puramente aditiva de valores de enum — nenhum modelo, relação, índice ou valor existente foi alterado ou removido.

## 13. Decisões técnicas

1. **`Actor` explícito em vez de sessão** — ver seção 9. Decisão registrada para não bloquear este módulo esperando o módulo de autenticação.
2. **Extensão do `AuditableEntityType`** — ver seção 12. Migration aditiva, mínima, testada.
3. **Publicação de `AcademicRelation` não gated pela mesma função `assertPublishable`** usada pelas 5 entidades simples — tem regra própria (evidência + aprovação dos nós), centralizada em seu próprio serviço, porque a regra é genuinamente diferente (depende de dois nós externos, não só de si mesma).
4. **`AcademicWork` sem gate de Citation na publicação** — decisão explícita da seção 7 do prompt, não uma omissão; documentado no código e aqui.
5. **`z.input` (não `z.infer`/`z.output`) para tipos de entrada com campos `.default(...)`** — `UserCreateInput`, `ProfileCreateInput`, `LegalReferenceCreateInput`, `ReviewItemCreateInput`, `AcademicWorkAuthorInput`. Sem isso, o tipo TypeScript exigia um campo que o Zod preenche sozinho — descoberto pelo próprio `tsc` durante a validação final, corrigido e documentado no código.
6. **`relationType`/`config/relation-types.ts` mantido em `src/config/`**, não em um `config/` na raiz — consistente com a decisão já registrada no Módulo 1 (seção 4 do prompt já apontava `src/config/` como a pasta de infraestrutura).
7. **Nenhum `relationType` novo adicionado** — a allow-list existente cobriu todos os cenários necessários (seção 12 do prompt permitia adicionar se necessário; não foi).

## 14. Limitações

- Sem sessão/autenticação real — `Actor` é passado explicitamente por quem chama (aceitável para uma camada de domínio/serviço; será substituído quando o módulo de autenticação existir).
- `AcademicRelation`/`Citation`/`QuestionKnowledgeTag`/`LessonKnowledgeTag`/`TopicMastery` continuam sem FK nativa nos campos polimórficos (decisão arquitetural da v3, não deste módulo) — validação de existência é 100% em aplicação.
- `listSources`/`listDisciplines`/etc. usam paginação simples (`take`/`skip`), sem cursor — adequado ao volume atual (base vazia), sem otimização especulativa.
- Nenhuma UI, nenhuma rota HTTP/Server Action exposta ainda — os serviços são chamados diretamente nos testes; a camada de apresentação é de um módulo futuro.

## 15. O que não foi implementado (confirmado)

Questões/provas/simulados funcionais, lições/trilhas, gamificação, dashboard do aluno, CRUD administrativo com UI, Mapa do Conhecimento, Linha do Tempo, ETL/importação em massa, qualquer conteúdo acadêmico real (a base permanece vazia — só fixtures de teste descartáveis, removidas ao final de cada suíte).
