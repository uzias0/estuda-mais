# Módulo 3 — Avaliações, Banco de Questões e Diagnóstico Inicial

> Constrói sobre o Módulo 1 (Fundação Técnica) e o Módulo 2 (Base de Conhecimento funcional) sem alterar a arquitetura conceitual aprovada. Bounded context principal: `src/modules/assessment`. Não implementa UI, trilhas, gamificação, revisão espaçada, simulados completos, biblioteca ou atualidades.

## 1. Objetivo

Transformar `Question`/`Exam`/`ExamEdition`/`QuestionAttempt` (só schema desde o Módulo 1) em um domínio funcional: banco de questões corrigível no servidor, provas com procedência, tentativas registradas com segurança, e um diagnóstico inicial que descobre o ponto de partida do aluno.

## 2. Escopo

Implementado: as 20 capacidades da seção 3 do prompt (banco de questões, CRUD, alternativas, tipos, provas/edições, bancas/órgãos/cargos, vinculação questão↔prova, procedência, publicação, validação, tags/conhecimento, tentativas, desempenho, diagnóstico completo, cálculo de nível, lacunas, recomendação de ponto de partida, consultas por atualidade, tratamento de questões recentes, separação conhecimento/avaliação).

Fora do escopo (confirmado vazio): UI, trilhas, aulas, gamificação funcional, revisão espaçada, simulados completos, biblioteca, notícias/atualidades, ETL/scraping, assinatura, dashboard.

## 3. Entidades utilizadas

Todas já existiam desde o Módulo 1: `Question`, `QuestionOption`, `QuestionKnowledgeTag`, `Exam`, `ExamEdition`, `ExamBoard`, `Organization`, `Position`, `QuestionAttempt`, `StudySession`, `Source`. Nenhuma entidade nova de conteúdo foi criada — o "resultado diagnóstico" é computado, não persistido (ver seção 8). Duas mudanças de schema, ambas aditivas (seção 13).

## 4. Serviços criados

| Arquivo                      | Funções                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `question.service.ts`        | `createQuestion`, `updateQuestion`, `publishQuestion`, `archiveQuestion`, `linkQuestionToKnowledge`/`unlink...`, `linkQuestionToTag`, `getQuestion`, `assertQuestionShapeValid` |
| `questionQuery.service.ts`   | `listQuestions(filters)` — filtros tipados (seção 37)                                                                                                                           |
| `exam.service.ts`            | `createExam`, `updateExam`, `publishExam`, `archiveExam`, `getExam`, `listExams`                                                                                                |
| `examEdition.service.ts`     | `createExamEdition`, `updateExamEdition`, `publishExamEdition`, `archiveExamEdition`, `getExamEdition`, `listExamEditions`                                                      |
| `examReference.service.ts`   | CRUD+publish+archive de `ExamBoard`/`Organization`/`Position` (3 blocos explícitos)                                                                                             |
| `answerGrading.ts`           | `gradeAnswer()` — correção pura, por tipo de questão                                                                                                                            |
| `questionAttempt.service.ts` | `recordAttempt`, `getAttempt`, `listAttemptsForUser`                                                                                                                            |
| `performance.service.ts`     | `computePerformance()`                                                                                                                                                          |
| `diagnostic.service.ts`      | `startDiagnostic`, `submitDiagnosticAnswer`, `getDiagnosticResult`, `finishDiagnostic`                                                                                          |
| `errors.ts`                  | `QuestionValidationError`, `AttemptValidationError`, `DiagnosticError`                                                                                                          |
| `src/config/diagnostic.ts`   | `DIAGNOSTIC_QUESTION_COUNT`, pesos de dificuldade, teto por conceito, faixas de domínio                                                                                         |

## 5. Regras de questões

`sourceId` obrigatório desde a criação (nunca `null`, nem por serviço nem por fluxo — reforçado por `NOT NULL` no banco desde o Módulo 1). A estrutura exigida depende do `type`:

| Tipo            | Estrutura exigida                                                                          |
| --------------- | ------------------------------------------------------------------------------------------ |
| MULTIPLE_CHOICE | ≥2 alternativas, exatamente 1 correta                                                      |
| TRUE_FALSE      | exatamente 2 alternativas, exatamente 1 correta                                            |
| MULTI_SELECT    | ≥2 alternativas, ≥1 correta (nenhuma totalmente incorreta)                                 |
| ORDERING        | ≥2 alternativas, `order` único por item (a sequência correta é a própria ordem armazenada) |
| MATCHING        | `answerKey` `{kind:"MATCHING", pairs:[...]}`, ≥2 pares                                     |
| FILL_BLANK      | `answerKey` `{kind:"FILL_BLANK", blanks:[...]}`; rejeita se vier com `options`             |
| SHORT_ANSWER    | `answerKey` `{kind:"SHORT_ANSWER", accepted:[...]}`; rejeita se vier com `options`         |
| CASE_STUDY      | `options` OU `answerKey` (ao menos um)                                                     |

Validado em `assertQuestionShapeValid()`, chamado em `createQuestion`, `updateQuestion` e `publishQuestion` — nunca só na criação.

## 6. Regras de provas

`Exam`/`ExamEdition`/`ExamBoard`/`Organization`/`Position` seguem CRUD + publish/archive centralizados (mesmo padrão do Módulo 2, sem gate de Citation — ver seção 15). `ExamEdition` valida existência de `Exam`/`ExamBoard`/`Organization`/`Position`/`Source` quando informados, e `year` dentro de uma faixa sã (1900–ano atual+1) — não é possível inventar datas. `Question.examEditionId` só aceita uma edição existente; questões autorais continuam sem `examEditionId`, desde que tenham `Source`.

## 7. Procedência

`Question.sourceId`: obrigatória, sempre. `ExamEdition.sourceId`: opcional, validada por existência quando informada. Nenhum atalho contorna isso — `QuestionCreateInputSchema` exige `sourceId` no tipo, e o serviço valida a `Source` existir antes de gravar.

## 8. Correção de respostas

`answerGrading.gradeAnswer()` — função pura, recebe a `Question` armazenada (tipo, `options`, `answerKey`) e a resposta enviada, devolve um booleano. Chamada exclusivamente por `questionAttempt.service.recordAttempt()`, nunca pelo cliente. `isCorrect` não existe como campo de entrada em nenhum schema Zod deste módulo — é sempre campo de saída. Testado explicitamente enviando campos forjados (`isCorrect: true`, `score: 100`) junto com uma resposta errada: o resultado gravado reflete a correção real do servidor, os campos extras são ignorados (`question.service.test.ts`/`questionAttempt.service.test.ts`).

## 9. QuestionAttempt

`recordAttempt(actor, input)` grava usuário (de `actor.userId`, nunca do payload), questão, resposta, resultado calculado, tempo, contexto, sessão/tentativa de simulado quando houver — e atualiza `Question.answerCount`/`correctRate` na mesma transação. Qualquer `Actor` autenticado pode registrar tentativa própria (STUDENT incluso). `getAttempt`/`listAttemptsForUser` restringem STUDENT à própria tentativa.

## 10. Diagnóstico inicial

`startDiagnostic(actor, count = DIAGNOSTIC_QUESTION_COUNT)`:

1. Busca candidatas: `reviewStatus = PUBLISHED` + ≥1 `QuestionKnowledgeTag` (seção 29).
2. Exclui questões já respondidas em diagnóstico anterior pelo mesmo usuário, se houver candidatas suficientes; senão permite repetição (documentado, banco pequeno é esperado sem conteúdo real).
3. Distribui por dificuldade conforme `DIAGNOSTIC_DIFFICULTY_WEIGHTS`, limitando a `DIAGNOSTIC_MAX_QUESTIONS_PER_CONCEPT` por conceito; completa o restante relaxando o teto só se o banco for pequeno demais para respeitá-lo.
4. Abre uma `StudySession` (mode `FORMACAO`) para agrupar as tentativas — não uma tabela nova (seção 22).
5. Devolve `{ sessionId, questions }` — a "visão pública" nunca inclui `isCorrect`/`answerKey` (testado explicitamente).

`submitDiagnosticAnswer` delega a `recordAttempt` com `context=DIAGNOSTIC`, validando: sessão pertence ao ator, sessão ainda aberta, questão ainda não respondida nesta sessão. `finishDiagnostic` marca `endedAt` e devolve o resultado. `getDiagnosticResult` é idempotente/determinístico: recalcula sempre a partir dos `QuestionAttempt` da sessão, nunca de um valor armazenado à parte.

## 11. Cálculo do nível

`percentual de acerto = corretas / respondidas × 100`, mapeado para `Difficulty` pelas faixas já convencionadas no produto (`docs/ARQUITETURA.md`, seção 7): 0–20% INICIANTE · 21–40% BASICO · 41–60% INTERMEDIARIO · 61–80% AVANCADO · 81–100% DOMINIO (`percentageToMasteryLevel`, `src/config/diagnostic.ts`). Nenhum enum novo — reaproveita `Difficulty`. Determinístico, sem LLM/IA externa.

## 12. Identificação de lacunas

Para cada `Concept` presente nas `QuestionKnowledgeTag` das questões respondidas, calcula-se `acerto% = corretas/total` daquele conceito na sessão. `≥ 61%` → conceito forte; `≤ 40%` → conceito fraco (`STRONG_CONCEPT_THRESHOLD`/`WEAK_CONCEPT_THRESHOLD`). A recomendação de ponto de partida é só um resultado de domínio (`{level, startingConceptIds, note}`) — não gera `Track`/`Stage`/`Unit`, não desbloqueia nada (isso é Módulo 4).

## 13. Autorização

Reaproveita `Actor`/`assertRole`/`CURATOR_ROLES`/`PUBLISHER_ROLES` do Módulo 2, sem alteração.

- **CONTENT_EDITOR ou ADMIN**: criar/editar questões e provas, associar conhecimento/tags, gerenciar fontes.
- **Só ADMIN**: publicar/arquivar (mesma convenção do Módulo 2 — "publicar" é o ato administrativo).
- **STUDENT**: iniciar diagnóstico, responder questões, ver as próprias tentativas/resultados. Bloqueado de: criar/editar questão, publicar, ler tentativa alheia, ler/responder sessão de diagnóstico alheia.

## 14. Auditoria

`ContentAuditLog` (mecanismo já existente) integrado a: criação/atualização/publicação/arquivamento de `Question`, `Exam`, `ExamEdition`, `ExamBoard`, `Organization`, `Position`; associação questão↔conhecimento/tag. Tentativas de aluno (`QuestionAttempt`) **não** geram `ContentAuditLog` — são evento de uso, não curadoria de conteúdo (seção 33 do prompt, aplicada literalmente).

## 15. Banco / Migrations

Duas migrations reais, ambas aditivas (nenhum dado ou coluna existente alterado/removido):

1. `20260819003810_module3_diagnostic_context_and_answer_key` — adiciona `DIAGNOSTIC` a `AttemptContext` e a coluna `Question.answerKey Json?`.
2. `20260819004246_auditable_entity_type_assessment_extras` — adiciona `EXAM`, `EXAM_BOARD`, `ORGANIZATION`, `POSITION` a `AuditableEntityType`.

Ambas geradas com `prisma migrate dev`, aplicadas no Postgres real de desenvolvimento, `prisma generate` executado em seguida.

## 16. Testes

**124 testes, 22 arquivos, todos verdes** (72 do Módulo 1+2, intactos, + 52 novos do Módulo 3, em 7 arquivos): `question.service.test.ts` (20), `exam.service.test.ts` (6), `examReference.service.test.ts` (3), `questionAttempt.service.test.ts` (5), `diagnostic.service.test.ts` (9), `questionQuery.service.test.ts` (5), `performance.service.test.ts` (4). Cobertura: todos os tipos de questão (válido/inválido), source obrigatório, publicação/arquivamento, provas/edições/vínculos/ano/source, correção pelo servidor (inclusive tentando forjar `isCorrect`), estatística agregada da questão, segurança (STUDENT/CONTENT_EDITOR/ADMIN em cada operação sensível), diagnóstico completo (seleção, diversidade, execução, duplicata, sessão finalizada, acesso cruzado entre usuários, usuário sem/com histórico), filtros de consulta, desempenho agregado.

## 17. Decisões técnicas

1. **`AttemptContext.DIAGNOSTIC`** — indispensável (seção 22 do prompt já antecipava a possibilidade); sem strings mágicas.
2. **`Question.answerKey Json?`** — MATCHING/FILL_BLANK/SHORT_ANSWER não cabem em `QuestionOption`; JSON é coerente e já é o padrão do projeto para dado de forma variável por tipo (`QuestionAttempt.answerData`, `Achievement.criteria`, `Simulation.config`) — não é gambiarra nova, é o mesmo padrão aplicado onde ele já existia.
3. **`AuditableEntityType.EXAM/EXAM_BOARD/ORGANIZATION/POSITION`** — mesma lacuna já corrigida no Módulo 2 para `PERIOD/DEVELOPMENTAL_STAGE/TAG`: essas 4 entidades têm CRUD/status próprios e precisam de auditoria correta, não atribuída a `EXAM_EDITION` por conveniência.
4. **Resultado do diagnóstico não é uma entidade persistida** — computado sob demanda a partir de `QuestionAttempt`, usando `StudySession` só como agrupador (seção 27: "determinístico a partir dos dados armazenados").
5. **ORDERING reaproveita `QuestionOption.order`** como a sequência correta, em vez de duplicar a informação em `answerKey` — evita redundância.
6. **Tentativa inicial de generalizar o CRUD de `ExamBoard`/`Organization`/`Position` via uma interface `Delegate` comum foi abandonada** — incompatível com os tipos estritos do Prisma; optou-se por 3 blocos explícitos (mais linhas, tipagem correta).
7. **`z.input` (não `z.infer`) para tipos de entrada com `.default(...)`** — mesma correção já aplicada no Módulo 2, replicada nos novos schemas quando aplicável.

## 18. Limitações

- `Question` não tem `createdAt`/`updatedAt` — não adicionado por não ser indispensável neste módulo (seção 38 já orienta a nunca usar isso como "recente" de qualquer forma); questões autorais não têm hoje um sinal de atualidade comparável ao `ExamEdition.year`. Documentado em `questionQuery.service.ts`.
- Diversidade de conceitos no diagnóstico usa apenas o **primeiro** `QuestionKnowledgeTag` do tipo `CONCEPT` de cada questão como "conceito primário" para o teto por conceito — uma questão com múltiplos conceitos tagueados conta só uma vez para esse teto (o cálculo de lacunas, por outro lado, considera **todos** os conceitos tagueados).
- Sem sessão/autenticação real (herdado do Módulo 1/2) — `Actor` continua explícito.
- Nenhuma rota HTTP/Server Action exposta — só serviços de domínio, como pedido.

## 19. O que ficou para módulos posteriores

Construção de trilha/`Track`/`Stage`/`Unit`/`Lesson` a partir da recomendação do diagnóstico; UI de qualquer tipo; gamificação funcional (XP por questão, streak, conquistas); revisão espaçada (algoritmo SM-2/FSRS sobre `ReviewItem`); simulados completos (`Simulation`/`SimulationAttempt` como fluxo de produto); biblioteca de livros gratuitos; sistema de atualidades/notícias; ETL/importação em massa/scraping; assinaturas; analytics; dashboard.
