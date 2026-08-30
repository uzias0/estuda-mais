# Relatório de Revisão Arquitetural v3

> Direção conceitual da v2 (4 núcleos, Base de Conhecimento como dona da verdade, N:N em `StageLesson`, `TopicMastery` por `Concept`, grafo híbrido) **permanece aprovada e inalterada**. Este relatório corrige exclusivamente inconsistências estruturais do schema.
>
> **Status:** Módulo 1 implementado — ver [`docs/MODULO-1.md`](MODULO-1.md). Única alteração mecânica do schema abaixo em relação ao arquivo real (`prisma/schema.prisma`): o bloco `generator client` mudou de `provider = "prisma-client-js"` (sem `output`) para `provider = "prisma-client"` + `output = "../src/generated/prisma"` — exigência confirmada da Prisma CLI 7.9.1 instalada, não uma escolha de design; nenhuma entidade, relação, enum ou índice foi tocado. Detalhes em `docs/MODULO-1.md`, seção "Prisma 7".
>
> O schema abaixo foi de fato submetido a `npx prisma validate` (Prisma CLI **7.9.1**, a versão estável instalada hoje) em um diretório isolado, fora do projeto — resultado: `The schema at prisma\schema.prisma is valid 🚀`. Também passou por `npx prisma format` sem alterações estruturais (só alinhamento de colunas). Isso não é uma alegação — é um resultado reproduzível de uma ferramenta real.

---

## 1. Problemas encontrados na v2

1. **Schema não compilável.** A v2 usava pseudo-Prisma com comentários como `/* ...profile, progress, attempts etc. como na v1 */` no lugar de campos reais — não era um artefato que o Prisma pudesse sequer tentar carregar.
2. **Polimorfismo inconsistente.** Alguns campos polimórficos (`AcademicRelation.sourceType/targetType`) já usavam o enum `KnowledgeEntityType`; outros (`Citation.entityType`, em vários trechos da prosa) ficavam como `String` genérica sem tipo estrutural, mesmo havendo um conjunto fechado óbvio por trás.
3. **`CitationEntityType` não existia como tipo próprio** — havia risco real de alguém reutilizar `KnowledgeEntityType` para `Citation`, o que estaria errado: `Citation` precisa citar `Question`/`Lesson`/`ExamEdition`/`AcademicRelation`, que **não são** nós do grafo de conhecimento.
4. **`ReviewItem` permitia estado inválido.** `questionId` e `conceptId` eram ambos `String?` sem nenhuma regra declarada — nada impedia um registro com os dois nulos (revisão "fantasma", sem alvo) ou os dois preenchidos (ambíguo: revisão de quê?).
5. **Reuso pedagógico incompleto.** Só `Stage↔Lesson` era N:N (via `StageLesson`). `Unit.areaId` e `Stage.unitId` continuavam FK diretas 1:N — ou seja, uma `Unit` só podia pertencer a uma única `LearningArea`, forçando duplicação de conteúdo pedagógico caro (uma Unidade inteira) caso ela devesse aparecer em duas trilhas com curadorias diferentes.
6. **Campos "fechados" declarados como `String` livre**, sem enum, onde um conjunto finito e conhecido já existia: `AcademicWork.type`, `AcademicWorkAuthor.role`, `LegalReference.vigencyStatus`, `Progress.status`, `Subscription.status`.
7. **Política de procedência implícita, não escrita.** Ficava subentendido que `Question` teria `Source` obrigatória e outras entidades usariam `Citation`, mas não havia uma regra explícita dizendo quais entidades usam qual mecanismo — risco real de inconsistência de implementação no Módulo 1.
8. **Relações unidirecionais.** Vários relacionamentos da v2 só apareciam em um lado (ex.: `Question.examEditionId` sem `ExamEdition.questions[]` explícito na prosa) — não formalmente verificável como Prisma real.
9. **Ausência de FK nativa não estava tratada como regra formal.** Era mencionada como observação, não como uma lista fechada de "o que o banco garante" vs. "o que a aplicação precisa garantir".

---

## 2. Correções realizadas

| # (problema) | Correção                                                                                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1            | Schema reescrito do zero, 100% literal, sem omissões — arquivo `prisma/schema.prisma`, validado via CLI real.                                                                                                                                                                                           |
| 2, 3         | Dois enums estruturais distintos e documentados: `KnowledgeEntityType` (nós do grafo) e `CitationEntityType` (alvos de citação) — conjuntos deliberadamente diferentes, com comentário no schema explicando a diferença. Criado também `AuditableEntityType` (mais amplo, inclui a espinha pedagógica). |
| 4            | Criado `enum ReviewScope { QUESTION CONCEPT }` + regra de domínio obrigatória + CHECK constraint via migration SQL manual (seção 5).                                                                                                                                                                    |
| 5            | Toda a espinha pedagógica virou N:N com `order` no join: `Track↔LearningArea` (`TrackArea`, já existia), `LearningArea↔Unit` (novo `AreaUnit`), `Unit↔Stage` (novo `UnitStage`), `Stage↔Lesson` (`StageLesson`, já existia). `Unit` e `Stage` não têm mais FK direta para o pai.                        |
| 6            | Novos enums: `AcademicWorkType`, `AcademicWorkRole`, `LegalStatus`, `ProgressStatus`, `SubscriptionStatus`.                                                                                                                                                                                             |
| 7            | Política de procedência escrita e fechada — seção 6 abaixo, sem entidade publicável órfã de regra.                                                                                                                                                                                                      |
| 8            | Todas as relações no schema final têm os dois lados explícitos — validado mecanicamente pelo próprio Prisma (ele recusa relação com lado faltando).                                                                                                                                                     |
| 9            | Regras de integridade separadas formalmente em "garantida pelo banco" (seção 4) e "garantida pela aplicação" (seção 5), sem itens soltos.                                                                                                                                                               |

---

## 3. Schema Prisma final completo

Arquivo: [`prisma/schema.prisma`](prisma/schema.prisma) — validado com `npx prisma validate` (Prisma CLI 7.9.1) e formatado com `npx prisma format`.

```prisma
// ============================================================================
// SCHEMA v3 — Plataforma de Aprendizagem + Enciclopédia Acadêmica de Psicologia
// Implementado no Módulo 1 — ver docs/MODULO-1.md.
// ============================================================================

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

// NOTA — validado com Prisma CLI 7.9.1 (`npx prisma validate`/`generate`) em
// 2026-08-18: na major 7 do Prisma, `url` deixou de ser aceita dentro do
// bloco datasource do schema.prisma; a conexão é configurada em
// `prisma.config.ts` (ver docs/MODULO-1.md, seção "Prisma 7", para o
// arquivo completo e as fontes oficiais consultadas).
datasource db {
  provider = "postgresql"
}

// ============================================================================
// ENUMS ESTRUTURAIS (conjuntos fechados, mudam raramente por design)
// ============================================================================

enum Role {
  STUDENT
  CONTENT_EDITOR
  ADMIN
}

enum Plan {
  FREE
  PREMIUM
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIALING
}

enum PublicationStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  PUBLISHED
  ARCHIVED
}

enum StudyMode {
  FORMACAO
  FACULDADE
  VESTIBULAR
  CONCURSO
  REVISAO
  DESAFIO
  SIMULADO
}

enum StageType {
  LESSON
  REVIEW
  CHECKPOINT
  CHALLENGE
}

enum BlockType {
  INTRO
  CONCEPT
  EXAMPLE
  QUESTION
  CONCLUSION
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  MATCHING
  ORDERING
  FILL_BLANK
  SHORT_ANSWER
  CASE_STUDY
  MULTI_SELECT
}

enum AttemptContext {
  LESSON
  REVIEW
  CHALLENGE
  SIMULATION
}

enum Difficulty {
  INICIANTE
  BASICO
  INTERMEDIARIO
  AVANCADO
  DOMINIO
}

enum ProgressStatus {
  LOCKED
  AVAILABLE
  IN_PROGRESS
  COMPLETED
}

enum ChallengeType {
  DAILY
  WEEKLY
  EVENT
}

enum SourceType {
  AUTORAL
  LICENCIADO
  OFICIAL
  ACADEMICA
  DIDATICA
  ADMINISTRATIVA
  EXTERNA
}

enum SourceClass {
  PRIMARIA
  SECUNDARIA
  OFICIAL
  ACADEMICA
  DIDATICA
}

enum LegalStatus {
  VIGENTE
  REVOGADA
  SUSPENSA
  SUBSTITUIDA
}

enum AcademicWorkType {
  LIVRO
  ARTIGO
  ENSAIO
  EXPERIMENTO_PUBLICADO
  DOCUMENTO
  TEORIA_PUBLICADA
  OUTRO
}

enum AcademicWorkRole {
  AUTOR
  COAUTOR
  ORGANIZADOR
  TRADUTOR
}

// Conjunto fechado dos TIPOS DE NÓ do grafo de conhecimento.
// Usado por AcademicRelation (sourceType/targetType) e por
// QuestionKnowledgeTag/LessonKnowledgeTag (entityType).
// NÃO confundir com CitationEntityType (ver abaixo) — conjuntos
// deliberadamente diferentes (item 6 da revisão solicitada).
enum KnowledgeEntityType {
  PERSON
  WORK
  THEORY
  CONCEPT
  SCHOOL
  DISCIPLINE
  PERIOD
  DEVELOPMENTAL_STAGE
}

// Conjunto fechado de entidades que podem RECEBER uma Citation.
// Inclui itens que KnowledgeEntityType não inclui (QUESTION, LESSON,
// EXAM_EDITION, ACADEMIC_RELATION) porque citação é uma preocupação de
// procedência, não de grafo acadêmico — não são a mesma coisa.
enum CitationEntityType {
  PERSON
  WORK
  THEORY
  CONCEPT
  SCHOOL
  DISCIPLINE
  QUESTION
  LESSON
  EXAM_EDITION
  ACADEMIC_RELATION
}

// Conjunto fechado de entidades auditáveis (curadoria/versionamento).
// Deliberadamente mais amplo que CitationEntityType: inclui nós puramente
// pedagógicos (Track/LearningArea/Unit/Stage) e a própria Source, que não
// fazem sentido como alvo de Citation mas precisam de trilha de auditoria.
enum AuditableEntityType {
  PERSON
  WORK
  THEORY
  CONCEPT
  SCHOOL
  DISCIPLINE
  QUESTION
  LESSON
  EXAM_EDITION
  ACADEMIC_RELATION
  LEGAL_REFERENCE
  SOURCE
  TRACK
  LEARNING_AREA
  UNIT
  STAGE
}

// Escopo de um item de revisão espaçada — ver seção 7 do relatório.
enum ReviewScope {
  QUESTION
  CONCEPT
}

// ============================================================================
// IDENTIDADE
// ============================================================================

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String?
  role         Role     @default(STUDENT)
  createdAt    DateTime @default(now())

  profile      Profile?
  progress     Progress[]
  attempts     QuestionAttempt[]
  sessions     StudySession[]
  mastery      TopicMastery[]
  reviewItems  ReviewItem[]
  achievements UserAchievement[]
  streak       Streak?
  dailyGoal    DailyGoal?
  simAttempts  SimulationAttempt[]
  subscription Subscription?
  auditLogs    ContentAuditLog[]

  @@index([role])
}

model Profile {
  userId        String    @id
  name          String
  avatarUrl     String?
  preferredMode StudyMode @default(FORMACAO)
  xp            Int       @default(0)
  level         Int       @default(1)

  user User @relation(fields: [userId], references: [id])
}

// ============================================================================
// BASE DE CONHECIMENTO — dona da verdade acadêmica
// ============================================================================

model Discipline {
  id          String            @id @default(cuid())
  slug        String            @unique
  name        String
  description String?
  status      PublicationStatus @default(DRAFT)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  schools School[] // implícita N:N (sem coluna extra necessária)
  units   Unit[] // 1:N via Unit.primaryDisciplineId

  @@index([status])
}

model School {
  id          String            @id @default(cuid())
  slug        String            @unique
  name        String
  description String?
  status      PublicationStatus @default(DRAFT)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  disciplines Discipline[] // implícita N:N
  theories    Theory[] // implícita N:N
  units       Unit[] // 1:N via Unit.primarySchoolId

  @@index([status])
}

model Theory {
  id             String            @id @default(cuid())
  slug           String            @unique
  name           String
  description    String?
  originPeriodId String?
  status         PublicationStatus @default(DRAFT)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  originPeriod HistoricalPeriod? @relation(fields: [originPeriodId], references: [id])
  schools      School[] // implícita N:N
  concepts     Concept[] // implícita N:N

  @@index([status])
  @@index([originPeriodId])
}

model Concept {
  id                   String            @id @default(cuid())
  slug                 String            @unique
  name                 String
  definition           String
  didacticExplanation  String?
  difficulty           Difficulty?
  developmentalStageId String?
  status               PublicationStatus @default(DRAFT)
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  developmentalStage DevelopmentalStage? @relation(fields: [developmentalStageId], references: [id])
  theories           Theory[] // implícita N:N
  works              AcademicWork[] // implícita N:N ("obra apresenta conceito")
  tags               Tag[] // implícita N:N
  reviewItems        ReviewItem[] // 1:N via ReviewItem.conceptId (revisão no nível do conceito)

  @@index([status])
  @@index([developmentalStageId])
}

model AcademicPerson {
  id             String            @id @default(cuid())
  slug           String            @unique
  name           String
  fullName       String?
  displayName    String?
  bio            String?
  birthDate      DateTime?
  deathDate      DateTime?
  periodId       String?
  countryContext String?
  imageUrl       String?
  status         PublicationStatus @default(DRAFT)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  period HistoricalPeriod?    @relation(fields: [periodId], references: [id])
  works  AcademicWorkAuthor[]
  tags   Tag[] // implícita N:N

  @@index([status])
  @@index([periodId])
}

model AcademicWork {
  id        String            @id @default(cuid())
  title     String
  subtitle  String?
  year      Int?
  type      AcademicWorkType
  isbn      String?
  doi       String?
  sourceId  String? // procedência bibliográfica OPCIONAL e secundária — ver política na seção 6 do relatório
  status    PublicationStatus @default(DRAFT)
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  source   Source?              @relation(fields: [sourceId], references: [id])
  authors  AcademicWorkAuthor[]
  concepts Concept[] // implícita N:N

  @@index([status])
  @@index([sourceId])
}

model AcademicWorkAuthor {
  personId String
  workId   String
  role     AcademicWorkRole @default(AUTOR)

  person AcademicPerson @relation(fields: [personId], references: [id])
  work   AcademicWork   @relation(fields: [workId], references: [id])

  @@id([personId, workId])
  @@index([workId])
}

model HistoricalPeriod {
  id          String  @id @default(cuid())
  slug        String  @unique
  name        String
  startYear   Int?
  endYear     Int?
  description String?

  people   AcademicPerson[]
  theories Theory[]

  @@index([startYear, endYear])
}

model DevelopmentalStage {
  id    String @id @default(cuid())
  slug  String @unique
  name  String
  order Int

  concepts Concept[]

  @@index([order])
}

model Tag {
  id   String @id @default(cuid())
  slug String @unique
  name String

  concepts  Concept[] // implícita N:N
  people    AcademicPerson[] // implícita N:N
  questions Question[] // implícita N:N
}

// ---- Grafo de conhecimento genérico -----------------------------------
// Sem FK nativa em sourceId/targetId: entityId aponta para uma de várias
// tabelas dependendo de sourceType/targetType (KnowledgeEntityType), e o
// Postgres/Prisma não suporta FK polimórfica de verdade. Integridade
// garantida em camada de aplicação (ver seção 4/5 do relatório) + job de
// auditoria periódico. relationType é String validada por allow-list em
// código (config/relation-types.ts), não enum de banco, para poder crescer
// sem migration — decisão deliberada, distinta de KnowledgeEntityType.
model AcademicRelation {
  id           String              @id @default(cuid())
  sourceType   KnowledgeEntityType
  sourceId     String
  relationType String
  targetType   KnowledgeEntityType
  targetId     String
  description  String?
  citationId   String?
  status       PublicationStatus   @default(DRAFT)
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  citation Citation? @relation(fields: [citationId], references: [id])

  @@unique([sourceType, sourceId, relationType, targetType, targetId], name: "uniqRelationEdge")
  @@index([sourceType, sourceId])
  @@index([targetType, targetId])
  @@index([relationType])
}

// ============================================================================
// CURADORIA E FONTES (transversal)
// ============================================================================

model Source {
  id             String            @id @default(cuid())
  name           String
  sourceType     SourceType
  classification SourceClass?
  author         String?
  institution    String?
  url            String?
  doi            String?
  isbn           String?
  license        String?
  publishedAt    DateTime?
  accessedAt     DateTime?
  version        String?
  rightsNote     String?
  status         PublicationStatus @default(DRAFT)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  legalReference LegalReference?
  citations      Citation[]
  academicWorks  AcademicWork[]
  examEditions   ExamEdition[]
  questions      Question[]

  @@index([status])
  @@index([sourceType])
}

model LegalReference {
  sourceId       String      @id
  jurisdiction   String?
  legalStatus    LegalStatus @default(VIGENTE)
  effectiveFrom  DateTime?
  effectiveTo    DateTime?
  supersededById String?

  source       Source           @relation(fields: [sourceId], references: [id])
  supersededBy LegalReference?  @relation("LegalReferenceSupersession", fields: [supersededById], references: [sourceId])
  supersedes   LegalReference[] @relation("LegalReferenceSupersession")

  @@index([legalStatus])
}

// entityId sem FK nativa (polimórfico via CitationEntityType) — sourceId
// É uma FK real e não-polimórfica (aponta sempre para Source).
model Citation {
  id         String             @id @default(cuid())
  entityType CitationEntityType
  entityId   String
  sourceId   String
  note       String?

  source            Source             @relation(fields: [sourceId], references: [id])
  academicRelations AcademicRelation[]

  @@index([entityType, entityId])
  @@index([sourceId])
}

model ContentAuditLog {
  id          String              @id @default(cuid())
  entityType  AuditableEntityType
  entityId    String
  action      String
  actorUserId String
  snapshot    Json?
  createdAt   DateTime            @default(now())

  actor User @relation(fields: [actorUserId], references: [id])

  @@index([entityType, entityId])
  @@index([actorUserId])
}

// ============================================================================
// NÚCLEO PEDAGÓGICO — curadoria sobre a Base de Conhecimento
// Track ⇄ LearningArea ⇄ Unit ⇄ Stage ⇄ Lesson são TODOS N:N via joins com
// `order` próprio — decisão explícita (seção 8 do relatório): qualquer nó
// pedagógico pode ser reaproveitado em mais de um pai sem duplicar conteúdo.
// ============================================================================

model Track {
  id     String            @id @default(cuid())
  slug   String            @unique
  name   String
  mode   StudyMode
  status PublicationStatus @default(DRAFT)

  areas TrackArea[]
}

model TrackArea {
  trackId String
  areaId  String
  order   Int

  track Track        @relation(fields: [trackId], references: [id])
  area  LearningArea @relation(fields: [areaId], references: [id])

  @@id([trackId, areaId])
  @@index([areaId])
}

model LearningArea {
  id     String            @id @default(cuid())
  slug   String            @unique
  name   String
  status PublicationStatus @default(DRAFT)

  tracks TrackArea[]
  units  AreaUnit[]
}

model AreaUnit {
  areaId String
  unitId String
  order  Int

  area LearningArea @relation(fields: [areaId], references: [id])
  unit Unit         @relation(fields: [unitId], references: [id])

  @@id([areaId, unitId])
  @@index([unitId])
}

model Unit {
  id                  String            @id @default(cuid())
  name                String
  primaryDisciplineId String? // âncora acadêmica opcional — não obrigatória
  primarySchoolId     String?
  status              PublicationStatus @default(DRAFT)

  primaryDiscipline Discipline? @relation(fields: [primaryDisciplineId], references: [id])
  primarySchool     School?     @relation(fields: [primarySchoolId], references: [id])
  areas             AreaUnit[]
  stages            UnitStage[]

  @@index([primaryDisciplineId])
  @@index([primarySchoolId])
}

model UnitStage {
  unitId  String
  stageId String
  order   Int

  unit  Unit  @relation(fields: [unitId], references: [id])
  stage Stage @relation(fields: [stageId], references: [id])

  @@id([unitId, stageId])
  @@index([stageId])
}

model Stage {
  id       String            @id @default(cuid())
  name     String
  type     StageType         @default(LESSON)
  xpReward Int               @default(10)
  status   PublicationStatus @default(DRAFT)

  units         UnitStage[]
  lessons       StageLesson[]
  progress      Progress[]
  studySessions StudySession[]

  @@index([status])
}

model StageLesson {
  stageId  String
  lessonId String
  order    Int    @default(0)

  stage  Stage  @relation(fields: [stageId], references: [id])
  lesson Lesson @relation(fields: [lessonId], references: [id])

  @@id([stageId, lessonId])
  @@index([lessonId])
}

model Lesson {
  id     String            @id @default(cuid())
  title  String
  status PublicationStatus @default(DRAFT)

  blocks        LessonBlock[]
  stages        StageLesson[]
  knowledgeTags LessonKnowledgeTag[]

  @@index([status])
}

model LessonBlock {
  id         String    @id @default(cuid())
  lessonId   String
  order      Int
  type       BlockType
  content    String?
  questionId String?

  lesson   Lesson    @relation(fields: [lessonId], references: [id])
  question Question? @relation(fields: [questionId], references: [id])

  @@unique([lessonId, order])
  @@index([questionId])
}

// entityId sem FK nativa (polimórfico via KnowledgeEntityType) — lessonId
// é a única FK real desta tabela.
model LessonKnowledgeTag {
  lessonId   String
  entityType KnowledgeEntityType
  entityId   String

  lesson Lesson @relation(fields: [lessonId], references: [id])

  @@id([lessonId, entityType, entityId])
  @@index([entityType, entityId])
}

// ============================================================================
// BASE DE AVALIAÇÕES
// ============================================================================

model Exam {
  id     String            @id @default(cuid())
  slug   String            @unique
  name   String
  status PublicationStatus @default(DRAFT)

  editions ExamEdition[]
}

model ExamEdition {
  id             String            @id @default(cuid())
  examId         String
  name           String
  year           Int
  examBoardId    String?
  organizationId String?
  positionId     String?
  sourceId       String?
  status         PublicationStatus @default(DRAFT)

  exam         Exam          @relation(fields: [examId], references: [id])
  examBoard    ExamBoard?    @relation(fields: [examBoardId], references: [id])
  organization Organization? @relation(fields: [organizationId], references: [id])
  position     Position?     @relation(fields: [positionId], references: [id])
  source       Source?       @relation(fields: [sourceId], references: [id])
  questions    Question[]

  @@index([examId])
  @@index([examBoardId])
  @@index([organizationId])
  @@index([positionId])
  @@index([year])
}

model ExamBoard {
  id     String            @id @default(cuid())
  slug   String            @unique
  name   String
  status PublicationStatus @default(DRAFT)

  editions ExamEdition[]
}

model Organization {
  id     String            @id @default(cuid())
  slug   String            @unique
  name   String
  status PublicationStatus @default(DRAFT)

  editions ExamEdition[]
}

model Position {
  id     String            @id @default(cuid())
  slug   String            @unique
  name   String
  status PublicationStatus @default(DRAFT)

  editions ExamEdition[]
}

model Question {
  id                  String            @id @default(cuid())
  prompt              String
  type                QuestionType
  explanation         String?
  difficulty          Difficulty
  subject             String? // BOOTSTRAP TRANSITÓRIO — nunca fonte de verdade (ver seção 6)
  subtopic            String? // BOOTSTRAP TRANSITÓRIO — nunca fonte de verdade (ver seção 6)
  examEditionId       String? // null = questão autoral avulsa (sem prova de origem)
  sourceId            String // obrigatória — toda questão tem procedência (ver seção 3)
  reproductionAllowed Boolean           @default(true)
  correctRate         Float?
  answerCount         Int               @default(0)
  reviewStatus        PublicationStatus @default(DRAFT)

  examEdition   ExamEdition?           @relation(fields: [examEditionId], references: [id])
  source        Source                 @relation(fields: [sourceId], references: [id])
  options       QuestionOption[]
  knowledgeTags QuestionKnowledgeTag[]
  tags          Tag[] // implícita N:N
  attempts      QuestionAttempt[]
  lessonBlocks  LessonBlock[]
  simulations   SimulationQuestion[]
  reviewItems   ReviewItem[]

  @@index([examEditionId])
  @@index([sourceId])
  @@index([difficulty])
  @@index([reviewStatus])
}

model QuestionOption {
  id         String  @id @default(cuid())
  questionId String
  text       String
  isCorrect  Boolean
  order      Int

  question Question @relation(fields: [questionId], references: [id])

  @@index([questionId])
}

// entityId sem FK nativa (polimórfico via KnowledgeEntityType) — questionId
// é a única FK real desta tabela.
model QuestionKnowledgeTag {
  questionId String
  entityType KnowledgeEntityType
  entityId   String

  question Question @relation(fields: [questionId], references: [id])

  @@id([questionId, entityType, entityId])
  @@index([entityType, entityId])
}

// ============================================================================
// PROGRESSO, TENTATIVAS, MASTERY, REVISÃO
// ============================================================================

model Progress {
  userId      String
  stageId     String
  status      ProgressStatus @default(LOCKED)
  score       Float?
  attempts    Int            @default(0)
  completedAt DateTime?

  user  User  @relation(fields: [userId], references: [id])
  stage Stage @relation(fields: [stageId], references: [id])

  @@id([userId, stageId])
  @@index([stageId])
}

model StudySession {
  id        String    @id @default(cuid())
  userId    String
  mode      StudyMode
  stageId   String?
  startedAt DateTime  @default(now())
  endedAt   DateTime?
  xpEarned  Int       @default(0)

  user     User              @relation(fields: [userId], references: [id])
  stage    Stage?            @relation(fields: [stageId], references: [id])
  attempts QuestionAttempt[]

  @@index([userId])
  @@index([stageId])
}

model QuestionAttempt {
  id           String         @id @default(cuid())
  userId       String
  questionId   String
  answerData   Json
  isCorrect    Boolean
  timeSpentMs  Int
  context      AttemptContext
  sessionId    String?
  simAttemptId String?
  createdAt    DateTime       @default(now())

  user       User               @relation(fields: [userId], references: [id])
  question   Question           @relation(fields: [questionId], references: [id])
  session    StudySession?      @relation(fields: [sessionId], references: [id])
  simAttempt SimulationAttempt? @relation(fields: [simAttemptId], references: [id])

  @@index([userId])
  @@index([questionId])
  @@index([sessionId])
  @@index([simAttemptId])
}

// entityId sem FK nativa (polimórfico via KnowledgeEntityType) — não existe
// coluna própria por tipo porque mastery é calculada tipicamente sobre
// Concept, mas o mesmo mecanismo serve para rollups manuais em Theory/School.
model TopicMastery {
  userId          String
  entityType      KnowledgeEntityType
  entityId        String
  masteryScore    Float               @default(0)
  correctCount    Int                 @default(0)
  incorrectCount  Int                 @default(0)
  reviewCount     Int                 @default(0)
  lastPracticedAt DateTime?

  user User @relation(fields: [userId], references: [id])

  @@id([userId, entityType, entityId])
  @@index([entityType, entityId])
}

// scope determina qual dos dois (questionId XOR conceptId) é obrigatório.
// Prisma/Postgres não expressam essa exclusividade nativamente no DSL —
// reforçada por CHECK constraint via migration SQL manual (ver seção 10
// do relatório) + validação obrigatória na camada de domínio.
model ReviewItem {
  id             String      @id @default(cuid())
  userId         String
  scope          ReviewScope
  questionId     String?
  conceptId      String?
  dueAt          DateTime
  intervalDays   Int         @default(1)
  easeFactor     Float       @default(2.5)
  repetitions    Int         @default(0)
  lastReviewedAt DateTime?
  createdAt      DateTime    @default(now())

  user     User      @relation(fields: [userId], references: [id])
  question Question? @relation(fields: [questionId], references: [id])
  concept  Concept?  @relation(fields: [conceptId], references: [id])

  @@index([userId, dueAt])
  @@index([questionId])
  @@index([conceptId])
}

// ============================================================================
// GAMIFICAÇÃO
// ============================================================================

model Achievement {
  id          String  @id @default(cuid())
  code        String  @unique
  name        String
  description String
  icon        String?
  criteria    Json
  xpReward    Int     @default(0)

  users UserAchievement[]
}

model UserAchievement {
  userId        String
  achievementId String
  unlockedAt    DateTime @default(now())

  user        User        @relation(fields: [userId], references: [id])
  achievement Achievement @relation(fields: [achievementId], references: [id])

  @@id([userId, achievementId])
  @@index([achievementId])
}

model Streak {
  userId         String    @id
  currentStreak  Int       @default(0)
  longestStreak  Int       @default(0)
  lastStudyDate  DateTime?
  daysStudied    Int       @default(0)
  minutesStudied Int       @default(0)

  user User @relation(fields: [userId], references: [id])
}

model DailyGoal {
  userId      String   @id
  targetXp    Int      @default(20)
  todayXp     Int      @default(0)
  lastResetAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model Challenge {
  id       String        @id @default(cuid())
  type     ChallengeType
  title    String
  criteria Json
  xpReward Int
  startsAt DateTime
  endsAt   DateTime
}

// ============================================================================
// SIMULADOS
// ============================================================================

model Simulation {
  id          String  @id @default(cuid())
  title       String
  config      Json
  isPublished Boolean @default(false)

  questions SimulationQuestion[]
  attempts  SimulationAttempt[]
}

model SimulationQuestion {
  simulationId String
  questionId   String
  order        Int

  simulation Simulation @relation(fields: [simulationId], references: [id])
  question   Question   @relation(fields: [questionId], references: [id])

  @@id([simulationId, questionId])
  @@index([questionId])
}

model SimulationAttempt {
  id           String    @id @default(cuid())
  userId       String
  simulationId String
  startedAt    DateTime  @default(now())
  finishedAt   DateTime?
  score        Float?
  correctCount Int       @default(0)
  totalCount   Int       @default(0)

  user             User              @relation(fields: [userId], references: [id])
  simulation       Simulation        @relation(fields: [simulationId], references: [id])
  questionAttempts QuestionAttempt[]

  @@index([userId])
  @@index([simulationId])
}

// ============================================================================
// SAAS
// ============================================================================

model Subscription {
  userId           String             @id
  plan             Plan               @default(FREE)
  status           SubscriptionStatus @default(ACTIVE)
  currentPeriodEnd DateTime?

  user User @relation(fields: [userId], references: [id])
}
```

---

## 4. Regras de integridade do banco (garantidas pelo Postgres/Prisma)

- **Chaves primárias compostas** em toda tabela de junção, impedindo duplicata exata da mesma relação: `TrackArea`, `AreaUnit`, `UnitStage`, `StageLesson`, `AcademicWorkAuthor`, `UserAchievement`, `SimulationQuestion`, `Progress`, `TopicMastery`, `QuestionKnowledgeTag`, `LessonKnowledgeTag`.
- **`@unique` em `slug`** para toda entidade de conteúdo nomeada (`Discipline`, `School`, `Theory`, `Concept`, `AcademicPerson`, `Track`, `LearningArea`, `Exam`, `ExamBoard`, `Organization`, `Position`, `Tag`, `HistoricalPeriod`, `DevelopmentalStage`).
- **`@unique([lessonId, order])` em `LessonBlock`** — impede dois blocos com a mesma posição na mesma lição.
- **`@unique([...], name: "uniqRelationEdge")` em `AcademicRelation`** — impede a mesma aresta exata (`sourceType+sourceId+relationType+targetType+targetId`) duplicada.
- **FKs reais com integridade referencial** em toda relação não-polimórfica: `Unit→Discipline/School`, `Theory→HistoricalPeriod`, `AcademicPerson→HistoricalPeriod`, `Concept→DevelopmentalStage`, `AcademicWork→Source`, `Question→Source/ExamEdition`, `ExamEdition→Exam/ExamBoard/Organization/Position/Source`, `LessonBlock→Lesson/Question`, `Citation→Source`, `AcademicRelation→Citation`, `ContentAuditLog→User`, e todas as tabelas de junção.
- **`NOT NULL` nos campos estruturalmente obrigatórios**: `Question.sourceId`, `Question.type`, `Question.difficulty`, `AcademicWork.type`, `ExamEdition.year`, etc.
- **Enums nativos do Postgres** garantindo domínio fechado de valores em todo campo estrutural — 20 enums no total, listados na seção 3.
- **Índices** em toda FK e em todo campo de filtro frequente (`status`, `difficulty`, `year`, `entityType+entityId`, `dueAt`).

---

## 5. Regras de integridade da camada de domínio (o banco NÃO garante)

| Regra                                                                                                                                                                                             | Por quê o banco não garante                                                                                                                                | Como reforçamos                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Existência do nó-alvo em campos polimórficos (`AcademicRelation.sourceId/targetId`, `Citation.entityId`, `QuestionKnowledgeTag.entityId`, `LessonKnowledgeTag.entityId`, `TopicMastery.entityId`) | Não existe FK polimórfica nativa no Postgres/Prisma — `entityId` é uma `String` que pode apontar para qualquer uma de 8 tabelas dependendo do `entityType` | Serviço único de resolução (`knowledge/server/services/resolveEntity(type, id)`) chamado em toda escrita, mais um job periódico de auditoria de integridade que varre essas tabelas em busca de `id`s órfãos (módulo futuro, não Módulo 1) |
| `relationType` válido                                                                                                                                                                             | É `String`, não `enum`, deliberadamente (para crescer sem migration)                                                                                       | Validação contra allow-list centralizada em `config/relation-types.ts`, revisada em PR                                                                                                                                                     |
| Nenhuma entidade "de conhecimento sintetizado" chega a `PUBLISHED` sem citação                                                                                                                    | Constraint de banco travaria rascunhos incompletos, que precisam poder existir                                                                             | Checagem obrigatória na service layer no momento da transição de status (ver política completa na seção 6)                                                                                                                                 |
| `AcademicRelation` só publica se `sourceId`/`targetId` existirem **e** estiverem em status ≥ `APPROVED`                                                                                           | Mesma razão acima — decisão de publicação é de domínio, não de schema                                                                                      | Serviço de publicação resolve ambos os nós antes de permitir a transição; se um deles não existir ou estiver em `DRAFT`, a transição é rejeitada                                                                                           |
| `ReviewItem.scope` determina exclusividade `questionId` XOR `conceptId`                                                                                                                           | O DSL estável do Prisma não expõe `CHECK` constraint nem índice único parcial de forma portátil e garantida entre versões                                  | Ver bloco de migration SQL abaixo — **regra de banco real, mas aplicada fora do `schema.prisma`**, complementada por validação obrigatória na camada de domínio antes de qualquer `INSERT`/`UPDATE`                                        |

Migration SQL complementar (a ser aplicada no Módulo 1, junto da primeira migration gerada pelo Prisma):

```sql
ALTER TABLE "ReviewItem" ADD CONSTRAINT review_item_scope_target_chk CHECK (
  (scope = 'QUESTION' AND "questionId" IS NOT NULL AND "conceptId" IS NULL) OR
  (scope = 'CONCEPT'  AND "conceptId"  IS NOT NULL AND "questionId" IS NULL)
);

CREATE UNIQUE INDEX review_item_question_uniq ON "ReviewItem" ("userId", "questionId") WHERE scope = 'QUESTION';
CREATE UNIQUE INDEX review_item_concept_uniq  ON "ReviewItem" ("userId", "conceptId")  WHERE scope = 'CONCEPT';
```

Isso é banco garantindo a regra de verdade (CHECK + índice único parcial) — só não está no `schema.prisma` porque a sintaxe de `@@check`/índice parcial não é estável entre versões do Prisma sem depender de uma preview feature cujo nome exato pode mudar; aplicá-la via SQL de migration é mais seguro que arriscar documentar uma API instável.

---

## 6. Política definitiva de procedência/citação

**Regra geral, sem exceção:** toda entidade que pode chegar a `PUBLISHED` tem uma estratégia de procedência definida — nenhuma fica de fora.

| Entidade                                                                | Mecanismo                                                                                                                        | Obrigatoriedade                                                                                                                        |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Question`                                                              | `sourceId` direto (FK real, `NOT NULL`)                                                                                          | **Sempre obrigatória**, desde a criação — não só antes de publicar. Toda questão tem uma origem primária única.                        |
| `AcademicWork`                                                          | `sourceId` direto (FK real, opcional)                                                                                            | Descreve a procedência **bibliográfica/de metadado** (de onde a ficha catalográfica veio), não a validade do conteúdo em si            |
| `ExamEdition`                                                           | `sourceId` direto (FK real, opcional)                                                                                            | Descreve o documento/edição oficial da prova, quando existir                                                                           |
| `AcademicPerson`, `Theory`, `Concept`, `School`, `Discipline`, `Lesson` | `Citation` (0..N, via `entityType`+`entityId`)                                                                                   | Conhecimento **sintetizado a partir de múltiplas referências** — regra de domínio: **≥ 1 `Citation`** obrigatória antes de `PUBLISHED` |
| `AcademicWork` (conteúdo, não metadado)                                 | `Citation` adicional                                                                                                             | Uma citação pode embasar uma afirmação _sobre_ a obra, distinta do `sourceId` que é só ficha bibliográfica                             |
| `AcademicRelation`                                                      | `citationId` direto (FK real, opcional) **e** pode receber `Citation` própria como alvo (`CitationEntityType.ACADEMIC_RELATION`) | Regra de domínio: **≥ 1 evidência** (via `citationId` ou `Citation`) antes de `PUBLISHED`                                              |
| `LegalReference`                                                        | Campos próprios (`legalStatus`, `effectiveFrom/To`, `supersededById`) + `Citation` opcional complementar                         | Vigência é modelada estruturalmente; comentário técnico adicional usa `Citation`                                                       |

**Como uma `AcademicWork` funciona como evidência de um `Concept`/`Theory`:** a `Citation` **nunca** aponta diretamente para uma `AcademicWork` como fonte — ela aponta sempre para um `Source` (`Citation.sourceId`). Quando uma obra deve servir de evidência, ela precisa primeiro ter seu próprio `Source` associado (`AcademicWork.sourceId`); é esse `Source` que a `Citation` referencia. `Source` continua sendo o único mecanismo formal de procedência do sistema — `AcademicWork` é um nó de conhecimento, não um substituto de `Source`.

**Regra de publicação (camada de domínio, não constraint de banco):** a transição de qualquer entidade da tabela acima para `PUBLISHED` é bloqueada pelo serviço de curadoria se a contagem de citações/`sourceId` aplicável for zero. Isso preserva a exigência de nunca apresentar conteúdo gerado como se fosse citação oficial.

---

## 7. Política definitiva do Knowledge Graph

- **Sem banco de grafos agora.** PostgreSQL + `AcademicRelation` indexada (`sourceType+sourceId`, `targetType+targetId`, `relationType`) + CTEs recursivas cobrem qualquer travessia na escala esperada (milhares de nós/arestas). Neo4j ou similar só entra se uma trava de performance real aparecer no Módulo 13 (Mapa do Conhecimento).
- **Dois mecanismos de relação, por design, não por acidente:**
  - Tabelas/joins tipados para pares previsíveis e de alta frequência de consulta: `Discipline↔School`, `School↔Theory`, `Theory↔Concept`, `Concept↔AcademicWork`, `AcademicWorkAuthor` (com `role`), `Concept/AcademicPerson/Question↔Tag`.
  - `AcademicRelation` genérica para pares heterogêneos e abertos (`Pessoa→INFLUENCIOU→Pessoa`, `Teoria→CRITICADA_POR→Pessoa`, `Conceito→RELACIONADO_A→Conceito`...).
- **Sem FK nativa em `AcademicRelation.sourceId/targetId`** — documentado explicitamente (seção 5), mitigado por validação de aplicação + unicidade de aresta (`uniqRelationEdge`) + job de integridade futuro.
- **Publicação de uma relação exige que ambos os nós existam e estejam em status ≥ `APPROVED`** — regra de domínio (seção 5), nunca uma relação publicada aponta para um rascunho ou para um `id` inexistente.
- **Leitura do grafo é sempre derivada do banco**, nunca hardcoded no frontend — a futura tela de Mapa do Conhecimento monta nós/arestas a partir de `AcademicRelation` + joins tipados, filtráveis por período/área/pessoa/escola/gênero/tema.
- **Linha do tempo é uma projeção do mesmo grafo**, não uma estrutura paralela — qualquer entidade com `periodId` (`AcademicPerson`, `Theory`) entra automaticamente, sem tabela extra.

---

## 8. Decisão definitiva sobre reutilização de Track/LearningArea/Unit/Stage/Lesson

**Decisão fechada:** toda a espinha pedagógica é **N:N em todos os níveis**, via tabelas de junção com `order` próprio:

```
Track ⇄ TrackArea ⇄ LearningArea ⇄ AreaUnit ⇄ Unit ⇄ UnitStage ⇄ Stage ⇄ StageLesson ⇄ Lesson
```

- `Unit` e `Stage` **não têm mais FK direta para o pai** (não existe `Unit.areaId` nem `Stage.unitId`) — a posição e a ordem vivem exclusivamente nos joins (`AreaUnit.order`, `UnitStage.order`).
- **Consequência prática:** uma `Unit` (ex.: "Introdução ao Condicionamento Operante") ou um `Stage` (ex.: "Quem foi Freud?") podem ser curados dentro de mais de uma `LearningArea`/`Unit`/`Track` — em Formação, Faculdade e Concurso — sem duplicar uma única linha de conteúdo, exatamente como já valia para `Lesson`.
- **`Progress` continua chaveado por `(userId, stageId)`** — completar um `Stage` conta para qualquer `Unit`/`Track` que o referencie. Isso é tratado como funcionalidade (o aluno não precisa "refazer" o mesmo conteúdo em duas trilhas), não como inconsistência.
- **Trade-off assumido:** montar "a trilha completa de um `Track`" agora exige uma cadeia de 4 joins (`Track→TrackArea→LearningArea→AreaUnit→Unit→UnitStage→Stage→StageLesson→Lesson`). Aceitável na escala atual; pode ganhar uma view materializada de leitura se o volume de conteúdo justificar (não faz parte do Módulo 1).

---

## 9. Riscos ainda existentes

- **Polimorfismo sem FK nativa** continua sendo o maior risco estrutural do sistema (5 tabelas afetadas: `AcademicRelation`, `Citation`, `QuestionKnowledgeTag`, `LessonKnowledgeTag`, `TopicMastery`). Mitigado, não eliminado — decisão consciente de custo/benefício frente à alternativa (dezenas de tabelas de junção tipadas por par).
- **CHECK constraint e índices únicos parciais do `ReviewItem` vivem fora do `schema.prisma`**, aplicados via SQL de migration manual — exige disciplina de time para não serem perdidos em um `prisma migrate reset` displicente ou numa migration gerada automaticamente que não preserve SQL customizado.
- **Cadeia de joins de 8 tabelas** para montar uma trilha completa pode custar performance visível só quando o catálogo de conteúdo crescer bastante — não otimizado agora, não medido ainda (não há dado real).
- **`relationType` como `String` com allow-list em código** depende de disciplina humana (revisão de PR) para não fragmentar semanticamente (ex.: "INFLUENCIOU" vs. "INFLUENCIA" cadastrados como coisas diferentes por descuido).
- **Prisma mudou de major version (7.x)** durante esta própria revisão — a sintaxe de `prisma.config.ts` para conexão de banco não está fixada neste documento de propósito, o que significa retrabalho de configuração (não de schema) garantido no início do Módulo 1.
- **Nenhum dado real populado ainda** — todas as regras de integridade e índices são estruturais, não testadas sob volume; validação de performance só é possível depois que a curadoria começar a alimentar a base.

---

## 10. O que exatamente será implementado no Módulo 1 (ainda não autorizado)

- Scaffold do projeto (Next.js + TypeScript, config de lint/formatação/teste).
- `prisma/schema.prisma` tal como este documento define, com a migration inicial gerada e aplicada em um banco de desenvolvimento.
- `prisma.config.ts` — resolução da sintaxe exata de conexão da major 7 do Prisma, feita naquele momento com a documentação oficial em mãos.
- Migration SQL complementar do `ReviewItem` (CHECK constraint + índices únicos parciais, seção 5).
- Estrutura de pastas por bounded context (`src/modules/knowledge`, `assessment`, `pedagogy`, `gamification`, `review`, `simulation`, `curation`).
- Tipos e schemas Zod espelhando as entidades do Prisma.
- Autenticação mínima — escopo exato (só schema de `User`/`Profile` vs. login funcional via Auth.js) permanece como decisão pendente já sinalizada na v2, a confirmar antes do início.
- Esqueleto do serviço de resolução de entidade polimórfica (`resolveEntity`), sem a lógica de negócio completa ainda.

## 11. O que explicitamente NÃO será implementado no Módulo 1

- Nenhuma UI de produto, nenhum componente visual, nenhum design system aplicado.
- Nenhum CRUD administrativo (nem de conhecimento, nem de avaliações, nem de conteúdo pedagógico).
- Nenhum dashboard do aluno.
- Nenhuma tela de trilha, lição ou questão funcional.
- Nenhuma tela de Mapa do Conhecimento ou Linha do Tempo.
- Nenhuma lógica de gamificação (XP, streak, conquistas) além dos campos existirem no schema.
- Nenhum conteúdo real cadastrado — nenhuma pessoa, obra, teoria, conceito, questão ou prova populada. Base vazia, só estrutura.
- Nenhum pipeline de importação/ETL de questões em lote.
- Nenhuma assinatura/pagamento, nenhum analytics.

---

**Módulo 1 implementado.** Ver [`docs/MODULO-1.md`](MODULO-1.md) para o relatório final (stack, migrations aplicadas, testes, decisões) e [`docs/ARQUITETURA.md`](ARQUITETURA.md) para a direção conceitual (v2, inalterada).
