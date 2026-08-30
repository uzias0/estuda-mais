# Arquitetura — Plataforma de Aprendizagem + Enciclopédia Acadêmica de Psicologia

> **v2 — revisão arquitetural obrigatória.** Substitui a v1 (que tratava o produto como "app de cursos de Psicologia gamificado"). Nenhum código de produto foi implementado ainda — este documento é só análise e proposta, aguardando autorização explícita para o Módulo 1.
>
> **Status:** Módulo 1 (Fundação Técnica), Módulo 2 (Base de Conhecimento funcional), Módulo 3 (Avaliações, Banco de Questões e Diagnóstico Inicial), Módulo 4 (Núcleo Pedagógico funcional), Módulo 5 (Revisão, Memorização e Aprendizagem Adaptativa determinística), Módulo 6 (Simulados Completos, Desempenho Acadêmico e Preparação para Provas) e Módulo 7 (Biblioteca Acadêmica, Atualidades e Curadoria de Conteúdo) implementados e validados — ver [`docs/MODULO-1.md`](MODULO-1.md), [`docs/MODULO-2.md`](MODULO-2.md), [`docs/MODULO-3.md`](MODULO-3.md), [`docs/MODULO-4.md`](MODULO-4.md), [`docs/MODULO-5.md`](MODULO-5.md), [`docs/MODULO-6.md`](MODULO-6.md), [`docs/MODULO-7.md`](MODULO-7.md) e o schema corrigido em [`docs/RELATORIO_REVISAO_V3.md`](RELATORIO_REVISAO_V3.md). A direção conceitual desta v2 permanece a fonte de verdade; nada abaixo foi alterado pela implementação. Aguardando autorização explícita para o Módulo 8.

**O que mudou da v1 para a v2, em uma frase:** o conhecimento acadêmico (pessoas, obras, teorias, conceitos, escolas, relações entre eles) deixa de estar embutido dentro da trilha e passa a ser um núcleo próprio, dono da verdade acadêmica — a trilha passa a ser apenas uma _curadoria pedagógica_ sobre esse núcleo, e ganha um irmão dedicado a avaliações (vestibular/ENADE/concurso) com a mesma lógica de reuso.

---

## 1. Arquitetura geral revisada

O produto não é "um curso". É uma plataforma com **quatro núcleos** desacoplados, mais uma camada transversal de curadoria/procedência — exatamente como no diagrama que você definiu:

```
┌──────────────────────────────────────────────────────────┐
│  EXPERIÊNCIA DO ALUNO                                     │
│  Trilhas · Lições · Questões · Revisão · Simulados ·      │
│  Desafios · Gamificação                                    │
└───────────────────────────┬────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  MOTOR PEDAGÓGICO                                          │
│  Progresso · Mastery · Fila de Revisão · XP/Regras         │
└───────────────────────────┬────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  BASE DE CONHECIMENTO  (núcleo acadêmico — dono da verdade) │
│  Pessoas · Obras · Teorias · Conceitos · Escolas ·          │
│  Disciplinas · Relações · Períodos históricos · Fases do    │
│  desenvolvimento                                            │
└───────────────────────────┬────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  BASE DE AVALIAÇÕES                                         │
│  Vestibulares · ENADE · Concursos · Bancas · Órgãos/Cargos · │
│  Provas/Edições · Questões · Simulados                       │
└───────────────────────────┬────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  CURADORIA E FONTES  (transversal — atravessa todos os núcleos)│
│  Procedência · Licenças · Versionamento · Fluxo de revisão ·  │
│  Publicação                                                  │
└──────────────────────────────────────────────────────────┘
```

Regras de dependência (o que pode referenciar o quê):

- **Experiência do Aluno** e **Motor Pedagógico** podem ler de qualquer núcleo, mas não possuem dado acadêmico/avaliativo — só referenciam.
- **Base de Conhecimento** não depende de nada abaixo dela nem da trilha. É a camada mais estável — poderia existir mesmo sem gamificação nenhuma.
- **Base de Avaliações** referencia a Base de Conhecimento (uma questão aponta para conceitos/teorias/pessoas), mas o inverso nunca acontece.
- **Curadoria e Fontes** é transversal: qualquer entidade "de conteúdo" (pessoa, obra, teoria, conceito, escola, questão, lição, edição de prova, referência legal) carrega status de publicação e procedência da mesma forma — um único vocabulário de curadoria para o produto inteiro.
- A **Trilha nunca é dona do conhecimento** (sua regra 21): `Unit`/`Stage`/`Lesson` apontam _para_ nós da Base de Conhecimento/Avaliações; nunca duplicam o conteúdo desses nós.

Isso resolve o risco principal apontado por você: sem esse núcleo, `Approach` ia virar, ao mesmo tempo, "escola de pensamento" (acadêmico) e "categoria da trilha" (pedagógico) — dois conceitos colididos na mesma tabela. Agora eles são entidades diferentes, relacionadas, não sobrepostas (detalhe na seção 3).

---

## 2. Nova estrutura de pastas

Organização por **bounded context** (módulo de domínio), não mais só "feature flat" — reflete os 4 núcleos do diagrama:

```
estuda-mais/
├── app/                                   # Next.js App Router (rotas — fino, delega para src/modules)
│   ├── (marketing)/
│   ├── (auth)/
│   ├── (app)/                             # experiência do aluno
│   │   ├── dashboard/ | trilha/[trackSlug]/ | licao/[stageId]/
│   │   ├── revisao/ | desafios/ | simulados/ | perfil/
│   │   └── conhecimento/                  # mapa/linha do tempo (módulos futuros — rota já reservada)
│   ├── admin/
│   │   ├── conhecimento/                  # CRUD de pessoas, obras, teorias, conceitos, escolas
│   │   ├── avaliacoes/                    # CRUD de exams, edições, bancas, órgãos, cargos
│   │   ├── conteudo-pedagogico/           # trilhas, áreas, unidades, etapas, lições
│   │   ├── questoes/
│   │   ├── curadoria/                     # fila de revisão/publicação, fontes
│   │   └── configuracoes/
│   └── api/
│
├── src/
│   ├── modules/
│   │   ├── knowledge/                     # === BASE DE CONHECIMENTO ===
│   │   │   ├── domain/                    # regras puras (ex.: montar grafo, validar relação)
│   │   │   ├── server/ (services, repositories)
│   │   │   ├── components/                # CRUD admin + futuro mapa/timeline
│   │   │   └── types/
│   │   ├── assessment/                    # === BASE DE AVALIAÇÕES ===
│   │   │   ├── domain/ | server/ | components/ | types/
│   │   ├── pedagogy/                      # === NÚCLEO PEDAGÓGICO (trilha/lição) ===
│   │   │   ├── domain/ | server/ | components/ | types/
│   │   ├── gamification/                  # XP, streak, conquistas, metas
│   │   ├── review/                        # repetição espaçada, mastery
│   │   ├── simulation/
│   │   └── curation/                      # === CURADORIA E FONTES (transversal) ===
│   │       ├── domain/ (máquina de estados de publicação)
│   │       ├── server/ (auditoria, versionamento)
│   │       └── components/ (fila de revisão genérica, reaproveitável por qualquer entidade)
│   │
│   ├── components/ui/                     # design system (Button, Card, Badge…)
│   ├── lib/                               # motion tokens, cn(), api client, graph helpers
│   ├── config/                            # xp-table, modos, tipos de questão, relationTypes permitidos
│   ├── server/ (auth, prisma client, middlewares)
│   └── types/                             # enums e tipos globais compartilhados
│
├── prisma/
│   └── schema.prisma
├── public/
├── tests/
└── docs/
    └── ARQUITETURA.md
```

Cada módulo em `src/modules/*` expõe só o que os outros precisam (um `index.ts` de fachada) — a Trilha nunca importa direto de dentro de `knowledge/server/repositories`, só do `knowledge` público. Isso é o que permite ao Módulo 1 nascer com os 4 núcleos desenhados sem forçar a construir tudo agora.

---

## 3. Entidades adicionadas

| Núcleo                 | Entidade                                     | Papel                                                                                                                                |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Conhecimento           | `Discipline`                                 | Grande campo (Filosofia, Psicologia, Sociologia, Antropologia, Neurociência, Educação, Psiquiatria, Metodologia...)                  |
| Conhecimento           | `School`                                     | Escola/corrente/abordagem teórica (Psicanálise, Behaviorismo, Gestalt, Existencialismo...) — **substitui** o antigo `Approach` da v1 |
| Conhecimento           | `Theory`                                     | Teoria específica (Teoria Psicanalítica, do Apego, Hierarquia das Necessidades...)                                                   |
| Conhecimento           | `Concept`                                    | Conceito (inconsciente, condicionamento operante, apego, ZDP...)                                                                     |
| Conhecimento           | `AcademicPerson`                             | Pessoa relevante (psicólogo, filósofo, pesquisador, psiquiatra, socióloga, educador — sem restrição de profissão)                    |
| Conhecimento           | `AcademicWork`                               | Obra (livro, artigo, ensaio, experimento publicado...)                                                                               |
| Conhecimento           | `AcademicWorkAuthor`                         | Join N:N pessoa↔obra, com papel (autor/coautor/organizador/tradutor)                                                                 |
| Conhecimento           | `HistoricalPeriod`                           | Período (Filosofia Antiga, Medieval, Moderna, Contemporânea; eras da Psicologia)                                                     |
| Conhecimento           | `DevelopmentalStage`                         | Fase do ciclo de vida (pré-natal, primeira infância, infância, adolescência, adultez, velhice)                                       |
| Conhecimento           | `Tag`                                        | Rótulo transversal reutilizável (ex.: "Mulheres, Gênero e História do Pensamento")                                                   |
| Conhecimento           | `AcademicRelation`                           | Aresta genérica e tipada do grafo de conhecimento                                                                                    |
| Conhecimento/Curadoria | `Source`                                     | Fonte (substitui/expande `ContentSource` da v1)                                                                                      |
| Conhecimento/Curadoria | `Citation`                                   | Join genérico entidade↔fonte                                                                                                         |
| Curadoria              | `LegalReference`                             | Extensão de `Source` para legislação (vigência, versão)                                                                              |
| Curadoria              | `ContentAuditLog`                            | Histórico de mudança de status/conteúdo                                                                                              |
| Avaliações             | `Exam`                                       | Categoria de prova (Vestibular, ENADE, Concurso, Simulado Autoral...)                                                                |
| Avaliações             | `ExamEdition`                                | Edição específica (ENADE Psicologia 2024)                                                                                            |
| Avaliações             | `ExamBoard`                                  | Banca organizadora (Cebraspe, FGV, FCC...)                                                                                           |
| Avaliações             | `Organization`                               | Órgão público (para concursos)                                                                                                       |
| Avaliações             | `Position`                                   | Cargo (Psicólogo, Psicólogo Judiciário...)                                                                                           |
| Pedagogia              | `StageLesson`                                | Join N:N etapa↔lição — **corrige** a v1, onde `Lesson` era presa 1:1 a uma `Stage` e não podia ser reaproveitada entre trilhas       |
| Pedagogia/Avaliações   | `QuestionKnowledgeTag`, `LessonKnowledgeTag` | Join genérico questão/lição ↔ nó de conhecimento                                                                                     |

`Question`, `TopicMastery` e `ReviewItem` (já existentes na v1) são **revisados**, não recriados — ver seção 5.

---

## 4. Relações entre entidades

Dois mecanismos, escolhidos deliberadamente por tipo de relação (ver o trade-off na seção 12):

**a) Relações "de primeira classe" — tabelas de junção tipadas**, para os pares que são previsíveis e consultados o tempo todo:

- `AcademicWorkAuthor` (Pessoa ↔ Obra)
- `TheoryConcept` (Teoria ↔ Conceito)
- `TheorySchool` (Teoria ↔ Escola)
- `QuestionKnowledgeTag` / `LessonKnowledgeTag` (Questão/Lição ↔ qualquer nó de conhecimento)
- `Citation` (qualquer entidade ↔ Fonte)

**b) Relações "de grafo" — `AcademicRelation` genérica**, para os pares heterogêneos e abertos que você listou (Pessoa→INFLUENCIOU→Pessoa, Teoria→CRITICADA_POR→Pessoa, Conceito→RELACIONADO_A→Conceito, Pessoa→ESTUDOU→Fenômeno...):

```prisma
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

model AcademicRelation {
  id             String   @id @default(cuid())
  sourceType     KnowledgeEntityType
  sourceId       String
  relationType   String            // "INFLUENCIOU" | "CRITICADA_POR" | "RELACIONADO_A" | ...
  targetType     KnowledgeEntityType
  targetId       String
  description    String?
  citationId     String?
  status         PublicationStatus @default(DRAFT)
  citation       Citation? @relation(fields: [citationId], references: [id])

  @@index([sourceType, sourceId])
  @@index([targetType, targetId])
  @@index([relationType])
}
```

`relationType` é **string validada em código** (allow-list em `config/relation-types.ts`), não um `enum` nativo do Postgres — para que o administrador (ou você) possa propor um tipo de relação novo sem gerar migration. A lista inicial cobre os exemplos que você deu (`INFLUENCIOU`, `RELACIONADO_A`, `AUTOR_DE`, `APRESENTA`, `POSSUI`, `DESENVOLVEU`, `ESTUDOU`, `CRITICADA_POR`) e cresce por configuração.

Exemplo do fluxo completo que você descreveu (seção 22 do seu prompt), agora todo relacional e sem hardcode de nomes:

```
AcademicPerson(Freud) --AUTOR_DE--> AcademicWork(obra)
AcademicWork(obra)    --APRESENTA--> Concept(Inconsciente)
Theory(Teoria Psicanalítica) --[TheoryConcept]--> Concept(Inconsciente)
School(Psicanálise)   --[TheorySchool]--> Theory(Teoria Psicanalítica)
Lesson("Introdução ao inconsciente") --[LessonKnowledgeTag]--> Concept(Inconsciente)
Question("...") --[QuestionKnowledgeTag]--> Concept(Inconsciente)
QuestionAttempt(usuário) --responde--> Question
TopicMastery(usuário, Concept=Inconsciente) --atualizado por--> QuestionAttempt
ReviewItem(usuário, Question ou Concept=Inconsciente) --agendado por--> TopicMastery
```

Troque "Freud" por qualquer `AcademicPerson` e a cadeia inteira funciona sem mudar uma linha de código — é exatamente a garantia pedida na sua regra 24.

---

## 5. Modelo de dados revisado

```prisma
// ========== ENUMS COMPARTILHADOS ==========
enum PublicationStatus { DRAFT IN_REVIEW APPROVED PUBLISHED ARCHIVED }
enum SourceType        { AUTORAL LICENCIADO OFICIAL ACADEMICA DIDATICA ADMINISTRATIVA EXTERNA }
enum SourceClass       { PRIMARIA SECUNDARIA OFICIAL ACADEMICA DIDATICA }
enum Difficulty        { INICIANTE BASICO INTERMEDIARIO AVANCADO DOMINIO }
enum QuestionType      { MULTIPLE_CHOICE TRUE_FALSE MATCHING ORDERING FILL_BLANK SHORT_ANSWER CASE_STUDY MULTI_SELECT }
enum AttemptContext    { LESSON REVIEW CHALLENGE SIMULATION }
enum StudyMode         { FORMACAO FACULDADE VESTIBULAR CONCURSO REVISAO DESAFIO SIMULADO }
enum StageType         { LESSON REVIEW CHECKPOINT CHALLENGE }
enum BlockType         { INTRO CONCEPT EXAMPLE QUESTION CONCLUSION }
enum Role              { STUDENT CONTENT_EDITOR ADMIN }
enum Plan              { FREE PREMIUM }

// ========== IDENTIDADE (inalterado da v1) ==========
model User { id String @id @default(cuid()) email String @unique role Role @default(STUDENT) /* ...profile, progress, attempts etc. como na v1 */ }
model Profile { userId String @id name String preferredMode StudyMode @default(FORMACAO) xp Int @default(0) level Int @default(1) }

// ========== BASE DE CONHECIMENTO ==========
model Discipline {
  id String @id @default(cuid())
  slug String @unique
  name String                    // "Filosofia", "Psicologia", "Sociologia"...
  description String?
  status PublicationStatus @default(DRAFT)
  schools School[]
}

model School {                    // Escola/Abordagem/Corrente teórica
  id String @id @default(cuid())
  slug String @unique
  name String                    // "Psicanálise", "Behaviorismo", "Existencialismo"...
  description String?
  disciplines Discipline[]        // N:N — Existencialismo cruza Filosofia e Psicologia
  theories TheorySchool[]
  status PublicationStatus @default(DRAFT)
}

model Theory {
  id String @id @default(cuid())
  slug String @unique
  name String
  description String?
  originPeriodId String?
  originPeriod HistoricalPeriod? @relation(fields: [originPeriodId], references: [id])
  schools TheorySchool[]
  concepts TheoryConcept[]
  status PublicationStatus @default(DRAFT)
}
model TheorySchool  { theoryId String; schoolId String; theory Theory @relation(fields:[theoryId],references:[id]); school School @relation(fields:[schoolId],references:[id]); @@id([theoryId, schoolId]) }
model TheoryConcept { theoryId String; conceptId String; theory Theory @relation(fields:[theoryId],references:[id]); concept Concept @relation(fields:[conceptId],references:[id]); @@id([theoryId, conceptId]) }

model Concept {
  id String @id @default(cuid())
  slug String @unique
  name String
  definition String
  didacticExplanation String?
  difficulty Difficulty?
  developmentalStageId String?
  developmentalStage DevelopmentalStage? @relation(fields: [developmentalStageId], references: [id])
  theories TheoryConcept[]
  tags ConceptTag[]
  status PublicationStatus @default(DRAFT)
}

model AcademicPerson {
  id String @id @default(cuid())
  slug String @unique
  name String
  fullName String?
  displayName String?
  bio String?
  birthDate DateTime?
  deathDate DateTime?
  periodId String?
  period HistoricalPeriod? @relation(fields: [periodId], references: [id])
  countryContext String?
  imageUrl String?               // só quando houver direito de uso
  works AcademicWorkAuthor[]
  tags PersonTag[]
  status PublicationStatus @default(DRAFT)
}

model AcademicWork {
  id String @id @default(cuid())
  title String
  subtitle String?
  year Int?
  type String                    // livro | artigo | ensaio | experimento publicado...
  isbn String?
  doi String?
  sourceId String?
  source Source? @relation(fields: [sourceId], references: [id])
  authors AcademicWorkAuthor[]
  concepts WorkConcept[]         // "obra apresenta conceito"
  status PublicationStatus @default(DRAFT)
}
model AcademicWorkAuthor { personId String; workId String; role String @default("autor"); person AcademicPerson @relation(fields:[personId],references:[id]); work AcademicWork @relation(fields:[workId],references:[id]); @@id([personId, workId]) }
model WorkConcept { workId String; conceptId String; work AcademicWork @relation(fields:[workId],references:[id]); concept Concept @relation(fields:[conceptId],references:[id]); @@id([workId, conceptId]) }

model HistoricalPeriod {
  id String @id @default(cuid())
  name String                    // "Filosofia Antiga", "Estruturalismo"...
  startYear Int?
  endYear Int?
  description String?
  people AcademicPerson[]
  theories Theory[]
}

model DevelopmentalStage {
  id String @id @default(cuid())
  slug String @unique
  name String                    // "Primeira infância", "Adolescência"...
  order Int
  concepts Concept[]
}

model Tag { id String @id @default(cuid()) slug String @unique name String }
model ConceptTag { conceptId String; tagId String; @@id([conceptId, tagId]) }
model PersonTag   { personId String; tagId String; @@id([personId, tagId]) }

// grafo genérico — ver seção 4
model AcademicRelation { /* como definido acima */ }

// ========== CURADORIA E FONTES ==========
model Source {
  id String @id @default(cuid())
  name String
  sourceType SourceType
  classification SourceClass?
  author String?
  institution String?
  url String?
  doi String?
  isbn String?
  license String?
  publishedAt DateTime?
  accessedAt DateTime?
  version String?
  rightsNote String?
  status PublicationStatus @default(DRAFT)
  legalReference LegalReference?
}
model LegalReference {
  sourceId String @id
  source Source @relation(fields: [sourceId], references: [id])
  jurisdiction String?           // ex.: "Federal", "CFP"
  vigencyStatus String @default("vigente")
  effectiveFrom DateTime?
  effectiveTo DateTime?
  supersededById String?
}
model Citation {
  id String @id @default(cuid())
  entityType String              // "CONCEPT" | "THEORY" | "PERSON" | "QUESTION" | "LESSON" | ...
  entityId String
  sourceId String
  note String?
  source Source @relation(fields: [sourceId], references: [id])
  @@index([entityType, entityId])
}
model ContentAuditLog {
  id String @id @default(cuid())
  entityType String
  entityId String
  action String                  // "STATUS_CHANGE" | "EDIT" | "PUBLISH" ...
  actorUserId String
  snapshot Json?
  createdAt DateTime @default(now())
  @@index([entityType, entityId])
}

// ========== NÚCLEO PEDAGÓGICO ==========
model Track { id String @id @default(cuid()) slug String @unique name String mode StudyMode areas TrackArea[] }
model TrackArea { trackId String; areaId String; order Int; @@id([trackId, areaId]) }
model LearningArea {                 // agora é só "prateleira" curatorial, não taxonomia acadêmica
  id String @id @default(cuid())
  slug String @unique
  name String                       // "Fundamentos", "Abordagens Teóricas"... — livre, definido pelo admin
  order Int
  units Unit[]
}
model Unit {
  id String @id @default(cuid())
  areaId String
  name String
  order Int
  primaryDisciplineId String?        // âncora acadêmica opcional
  primarySchoolId String?
  stages Stage[]
}
model Stage {
  id String @id @default(cuid())
  unitId String
  name String
  order Int
  type StageType @default(LESSON)
  xpReward Int @default(10)
  lessons StageLesson[]              // N:N — corrige a v1
}
model Lesson {                       // agora reutilizável entre trilhas
  id String @id @default(cuid())
  title String
  blocks LessonBlock[]
  stages StageLesson[]
  knowledgeTags LessonKnowledgeTag[]
  status PublicationStatus @default(DRAFT)
}
model StageLesson { stageId String; lessonId String; order Int @default(0); @@id([stageId, lessonId]) }
model LessonBlock { id String @id @default(cuid()) lessonId String order Int type BlockType content String? questionId String? }
model LessonKnowledgeTag { lessonId String; entityType KnowledgeEntityType; entityId String; @@id([lessonId, entityType, entityId]) }

// ========== BASE DE AVALIAÇÕES ==========
model Exam { id String @id @default(cuid()) slug String @unique name String /* "Vestibular"|"ENADE"|"Concurso"|"Simulado Autoral" */ editions ExamEdition[] }
model ExamEdition {
  id String @id @default(cuid())
  examId String
  exam Exam @relation(fields: [examId], references: [id])
  name String                        // "ENADE Psicologia 2024"
  year Int
  examBoardId String?
  examBoard ExamBoard? @relation(fields: [examBoardId], references: [id])
  organizationId String?
  organization Organization? @relation(fields: [organizationId], references: [id])
  positionId String?
  position Position? @relation(fields: [positionId], references: [id])
  questions Question[]
  status PublicationStatus @default(DRAFT)
}
model ExamBoard    { id String @id @default(cuid()) slug String @unique name String editions ExamEdition[] }
model Organization { id String @id @default(cuid()) slug String @unique name String editions ExamEdition[] }
model Position     { id String @id @default(cuid()) slug String @unique name String editions ExamEdition[] }

model Question {
  id String @id @default(cuid())
  prompt String
  type QuestionType
  explanation String?
  difficulty Difficulty
  subject String?                    // campo-ponte transitório — meta é migrar para QuestionKnowledgeTag
  subtopic String?
  examEditionId String?              // null = questão autoral avulsa
  examEdition ExamEdition? @relation(fields: [examEditionId], references: [id])
  sourceId String
  source Source @relation(fields: [sourceId], references: [id])
  reproductionAllowed Boolean @default(true)   // false => armazenar só metadados/paráfrase, não o enunciado original
  options QuestionOption[]
  knowledgeTags QuestionKnowledgeTag[]
  tags QuestionTag[]
  attempts QuestionAttempt[]
  correctRate Float?
  answerCount Int @default(0)
  reviewStatus PublicationStatus @default(DRAFT)
}
model QuestionOption { id String @id @default(cuid()) questionId String text String isCorrect Boolean order Int }
model QuestionKnowledgeTag { questionId String; entityType KnowledgeEntityType; entityId String; @@id([questionId, entityType, entityId]) }
model QuestionTag { questionId String; tagId String; @@id([questionId, tagId]) }

// ========== TENTATIVAS, PROGRESSO, MASTERY (revisados) ==========
model QuestionAttempt { id String @id @default(cuid()) userId String questionId String answerData Json isCorrect Boolean timeSpentMs Int context AttemptContext sessionId String? simAttemptId String? createdAt DateTime @default(now()) }
model StudySession { id String @id @default(cuid()) userId String mode StudyMode stageId String? startedAt DateTime @default(now()) endedAt DateTime? xpEarned Int @default(0) }
model Progress { userId String; stageId String; status String @default("LOCKED"); score Float?; attempts Int @default(0); completedAt DateTime?; @@id([userId, stageId]) }

model TopicMastery {                 // agora por NÓ DE CONHECIMENTO, não por "Approach"
  userId String
  entityType KnowledgeEntityType     // tipicamente CONCEPT; pode ser THEORY/SCHOOL para rollup manual
  entityId String
  masteryScore Float @default(0)
  correctCount Int @default(0)
  incorrectCount Int @default(0)
  reviewCount Int @default(0)
  lastPracticedAt DateTime?
  @@id([userId, entityType, entityId])
}

model ReviewItem {
  id String @id @default(cuid())
  userId String
  questionId String?
  conceptId String?                  // revisão no nível do conceito (qualquer questão relacionada serve)
  dueAt DateTime
  intervalDays Int @default(1)
  easeFactor Float @default(2.5)
  repetitions Int @default(0)
  lastReviewedAt DateTime?
}

// ========== GAMIFICAÇÃO, SIMULADOS, SAAS (inalterados da v1) ==========
// Achievement, UserAchievement, Streak, DailyGoal, Challenge,
// Simulation, SimulationQuestion, SimulationAttempt, Subscription — mantidos como na v1.
```

Mudanças estruturais mais importantes em relação à v1 (para ficar explícito, não escondido):

1. `Approach` (v1) foi **removido** e substituído por `School` (Base de Conhecimento), com `LearningArea` reduzida a uma prateleira curatorial sem carga acadêmica.
2. `Lesson` deixa de ser 1:1 com `Stage` — agora é N:N via `StageLesson`, o que resolve diretamente o requisito de reuso entre Formação/Faculdade/Concurso/Revisão sem duplicar conteúdo.
3. `TopicMastery` e `ReviewItem` passam a ser calculados por **nó de conhecimento** (principalmente `Concept`), não por matéria solta — é isso que permite responder "em quais conceitos o aluno está errando" e não só "em qual matéria".
4. `Question.subject/subtopic` (string livre) viram campos de bootstrap transitórios; o alvo é `QuestionKnowledgeTag` apontando para conceitos reais.
5. Origem de questão deixa de ser uma string (`originYear`/`institution`) e vira uma cadeia própria: `Exam → ExamEdition → ExamBoard/Organization/Position`.

---

## 6. Estratégia para o Knowledge Graph

- **Sem banco de grafos por agora.** Na escala inicial (milhares de nós/arestas), Postgres com `AcademicRelation` indexado + CTEs recursivas dá conta de qualquer travessia (“o que Freud influenciou, recursivamente”, “todos os conceitos de uma escola”). Introduzir Neo4j/similar seria otimização prematura — revisitar só se a tela de Mapa do Conhecimento mostrar gargalo real de travessia em produção.
- **Leitura do mapa é derivada, nunca hardcoded no frontend** (sua regra 9 da Base de Conhecimento): a tela futura de Mapa do Conhecimento consulta `AcademicRelation` + as tabelas tipadas (`TheoryConcept`, `WorkConcept`...) e monta o grafo em memória no servidor (ex.: com uma lib leve tipo `graphology` só na camada de apresentação), devolvendo nós/arestas já filtrados por período/área/pessoa/escola/gênero/tema.
- **Polimorfismo sem FK garantida pelo banco** é uma decisão consciente (ver seção 12): validação de existência do nó referenciado acontece na camada de serviço (`knowledge/server/services`) no momento da escrita, mais um job de integridade periódico (módulo futuro) que varre `AcademicRelation`/`*KnowledgeTag` procurando referências órfãs.
- **Timeline** é uma projeção do mesmo grafo, não uma estrutura paralela: qualquer entidade com `periodId` (Pessoa, Teoria) ou datas próprias entra automaticamente na linha do tempo; filtros (período/área/autor/escola/gênero/tema) são apenas queries sobre as mesmas tabelas.

---

## 7. Estratégia para autores/obras/teorias/conceitos

- CRUD independente de cada entidade no admin (`modules/knowledge`), sem qualquer relação obrigatória no momento da criação — uma `Concept` pode existir sem teoria associada ainda, e ser conectada depois.
- Relações são atos editoriais explícitos (criar uma `AcademicRelation` ou preencher um join tipado), nunca inferidas magicamente — mantém curadoria humana no centro, coerente com sua regra de "não inventar biografia/relação sem fonte".
- **Regra de publicação:** uma entidade só sai de `DRAFT`/`IN_REVIEW` para `PUBLISHED` se tiver pelo menos uma `Citation` associada (checagem de aplicação, não constraint de banco — para não travar rascunhos incompletos). Isso opera a exigência de não apresentar conteúdo gerado como se fosse citação oficial.
- Reuso automático: como `Lesson`, `Question` e o próprio nó acadêmico são independentes da trilha, a mesma `AcademicPerson`/`Concept` aparece organicamente em: perfil do autor, história da Psicologia, questões relacionadas, linha do tempo, e qualquer trilha que a referencie — sem duplicar dado, só multiplicando pontos de entrada (exatamente o pedido da seção 3/11 do seu prompt: mulheres não ficam isoladas em uma página especial, aparecem em todos os lugares relevantes por conexão real).
- Dimensão transversal ("Mulheres, Gênero e História do Pensamento") é modelada como `Tag`, não como tabela especial — qualquer recorte transversal futuro (ex.: "Psicologia e Relações Raciais") usa o mesmo mecanismo sem nova migration.

---

## 8. Estratégia para vestibulares/ENADE/concursos

- Hierarquia `Exam → ExamEdition → Question`, com `ExamBoard`/`Organization`/`Position` como dimensões opcionais de `ExamEdition` (vestibular não precisa de cargo/órgão; concurso precisa dos três).
- Filtros banca→cargo→área→assunto→ano→dificuldade tornam-se joins diretos e indexados (`ExamEdition.examBoardId`, `.positionId`, `Question.difficulty`, `QuestionKnowledgeTag`).
- Admin cadastra nova banca/órgão/cargo/prova como dado, nunca como código — cumpre diretamente a regra 25 do seu prompt original.
- **ENADE/provas oficiais:** o sistema guarda os metadados de competência/habilidade e a filiação a `ExamEdition`, mas a **reprodução do enunciado literal só ocorre quando `reproductionAllowed = true`** (uso permitido/oficial verificado); quando não, o registro guarda apenas metadados + explicação/paráfrase autoral, preservando o valor pedagógico sem violar direitos de reprodução.
- Preparado para escala (milhares → centenas de milhares de questões): índices em `examEditionId`, `difficulty`, e nas tabelas de junção `QuestionKnowledgeTag`/`QuestionTag`, sem overengineering agora (sem particionamento, sem sharding — decisão adiada para quando o volume justificar).

---

## 9. Estratégia de procedência e direitos autorais

- `Source` é obrigatória em toda `Question` (`sourceId` não-nulo) e disponível para qualquer outra entidade via `Citation` — não existe conteúdo acadêmico "sem pai" na base.
- Classificação dupla: `sourceType` (autoral/licenciado/oficial/acadêmica/didática/administrativa/externa) + `classification` (primária/secundária/oficial/acadêmica/didática) — responde tanto "de onde veio" quanto "que tipo de fonte é" (sua seção 21).
- `LegalReference` estende `Source` para legislação/normas técnicas (CFP, SUS, SUAS): guarda vigência, data efetiva, e encadeamento para a versão que a substituiu — preparado para atualização legislativa sem perder histórico.
- **Nenhum scraping automatizado de bancos comerciais.** Ingestão de conteúdo é sempre: (1) autoral, (2) licenciado com contrato, (3) oficial de uso permitido (ex.: provas/gabaritos públicos do INEP quando o uso é compatível com a licença), (4) referência acadêmica citável. Cada nova fonte de dados em massa exige aprovação humana antes de virar um pipeline de importação (módulo futuro dedicado, fora do Módulo 1).

---

## 10. Roadmap revisado

Reordenado para refletir os 4 núcleos — Módulo 1 fica estritamente restrito ao que sua regra 25 pediu (scaffold/infra, nada de UI de produto).

| Fase                        | #   | Módulo                       | Escopo                                                                                                                                                                                                                                           |
| --------------------------- | --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fundação**                | 1   | **Arquitetura Base**         | scaffold, config, estrutura de pastas, schema Prisma completo (4 núcleos), migrations, tipos/schemas Zod, auth mínima (só o necessário para as FKs de `User` existirem) — **sem** dashboard, trilha, questões, gamificação ou UI de conhecimento |
|                             | 2   | Design System                | tokens, componentes `ui/` base, dark mode                                                                                                                                                                                                        |
|                             | 3   | Layout Principal             | shell logado, navegação mobile-first, autenticação funcional                                                                                                                                                                                     |
| **Conteúdo acadêmico**      | 4   | Base de Conhecimento (admin) | CRUD de Pessoa/Obra/Teoria/Conceito/Escola/Disciplina + relações                                                                                                                                                                                 |
|                             | 5   | Base de Avaliações (admin)   | CRUD de Exam/ExamEdition/ExamBoard/Organization/Position                                                                                                                                                                                         |
| **Experiência pedagógica**  | 6   | Trilha                       | curadoria de Track/LearningArea/Unit/Stage referenciando a Base de Conhecimento                                                                                                                                                                  |
|                             | 7   | Lição                        | fluxo intro→conceito→exemplo→questão→conclusão, `StageLesson`                                                                                                                                                                                    |
|                             | 8   | Questões                     | `QuestionRenderer`, tags de conhecimento, procedência, tipo múltipla escolha primeiro                                                                                                                                                            |
|                             | 9   | Progresso                    | `Progress`, `TopicMastery` por conceito, desbloqueio                                                                                                                                                                                             |
| **Avaliação e retenção**    | 10  | Gamificação                  | XP, nível, streak, metas, conquistas (config, não hardcode)                                                                                                                                                                                      |
|                             | 11  | Revisão                      | `ReviewItem`, spaced repetition, recomendação inteligente                                                                                                                                                                                        |
|                             | 12  | Simulados                    | configuração, tentativa, relatório de desempenho                                                                                                                                                                                                 |
| **Visualizações avançadas** | 13  | Mapa do Conhecimento         | visualização do grafo (leitura apenas, gerado do banco)                                                                                                                                                                                          |
|                             | 14  | Linha do Tempo               | projeção temporal do grafo                                                                                                                                                                                                                       |
| **Produto**                 | 15  | Admin completo               | fluxos de curadoria fim a fim, versionamento, auditoria                                                                                                                                                                                          |
|                             | 16  | Assinaturas                  | planos free/premium, preparação Stripe                                                                                                                                                                                                           |
|                             | 17  | Analytics                    | retenção, conversão, dashboards internos                                                                                                                                                                                                         |
|                             | 18  | Polimento                    | acessibilidade fina, performance, celebrações (GSAP), e2e                                                                                                                                                                                        |

Cada módulo continua exigindo autorização explícita antes de começar (regra mantida).

---

## 11. Decisões que considero necessárias antes do primeiro commit

1. **Confirmar o vocabulário definitivo** — `School` (não mais `Approach`), `Discipline` (não confundir com `LearningArea`, que agora é só prateleira pedagógica). Se preferir outros nomes em português no schema (`Escola`, `Disciplina`, `Pessoa`), me avise antes do Módulo 1 — depois de gerada a primeira migration, renomear tem custo.
2. **Validar o trade-off do grafo genérico** (`AcademicRelation` sem FK garantida pelo banco, mitigada por validação de aplicação) — é a decisão de maior risco técnico do documento; se preferir mais rigidez (tabelas tipadas por par de relação), o custo é uma tabela nova a cada tipo de relação que surgir.
3. **Escopo real da autenticação no Módulo 1** — só os campos de `User`/`Profile` no schema, ou já um login funcional (Auth.js)? Isso muda o tamanho do Módulo 1.
4. **Política de conteúdo oficial (ENADE/vestibulares/concursos)** — confirmar se já existe alguma fonte/autorização específica em mãos, ou se o Módulo 5 nasce vazio (só estrutura, conteúdo populado depois por curadoria humana).
5. **Idioma/i18n** — assumido pt-BR único por ora; avisar se internacionalização entra no radar (afeta como `name`/`description` são modelados: string simples vs. tabela de traduções).
6. **Volume inicial esperado** (ordem de grandeza de questões/pessoas/conceitos no primeiro ano) — só para calibrar índices com realismo, sem otimizar prematuramente.

---

## 12. Problemas em aberto / riscos reconhecidos

- **Polimorfismo sem integridade referencial de banco** em `AcademicRelation`, `QuestionKnowledgeTag`, `LessonKnowledgeTag`, `Citation` — o Postgres não impede apontar para um `entityId` inexistente. Mitigação: validação na camada de serviço + job de auditoria de integridade (não faz parte do Módulo 1, mas está previsto).
- **Escala do Mapa do Conhecimento** — travessias amplas (milhares de arestas) podem exigir cache/materialização (view materializada, ou export para estrutura em memória no servidor) quando o conteúdo crescer; não resolver agora, mas monitorar quando o Módulo 13 chegar.
- **Direitos autorais de provas históricas** é decisão jurídica caso a caso, não só técnica — a arquitetura suporta (`reproductionAllowed`, `Source`), mas cada fonte em massa (ex.: um banco de questões de uma banca específica) precisa de aprovação humana antes de virar pipeline de importação.
- **Pipeline de importação em lote** (CSV/JSON) para popular milhares de questões/conceitos não está no roadmap ainda — vai ser necessário assim que a curadoria manual não acompanhar o volume desejado; proponho módulo dedicado de "Import/ETL de conteúdo" a inserir no roadmap quando chegar a hora.
- **Enum nativo vs. string validada** — optei por `String` (com allow-list em código) em `relationType` e mantenho `KnowledgeEntityType` como `enum` porque esse conjunto (tipos de nó) é estrutural e muda raramente; já `relationType` (tipos de relação) é o que você pediu para crescer livremente, então não pode ficar preso a uma migration.
- **`subject`/`subtopic` como strings soltas em `Question`** é uma dívida técnica assumida conscientemente para bootstrap (curadoria não vai ter o grafo todo populado desde o dia 1) — o alvo real é `QuestionKnowledgeTag`; ambos convivem até a base de conceitos amadurecer.

---

## 13. Tecnologia (reavaliação de versões)

Mantida a direção da v1 (Next.js/TypeScript, Tailwind, shadcn/ui, Prisma/PostgreSQL, Auth.js, Motion como motor de animação padrão, GSAP reservado para celebrações), mas **sem fixar números de versão neste documento** — pin de versão será feito no dia do scaffold real (Módulo 1), usando a versão estável mais recente de cada uma na época, com estas prioridades: estabilidade, suporte de longo prazo, documentação madura, segurança. Nada experimental/beta no núcleo do produto sem justificativa técnica explícita registrada aqui.

Bibliotecas de UI/animação candidatas (React Bits, 21st.dev, Uiverse, Origin UI, Skiper UI, Cult UI, React Spring, Lumen UI, GetLayers, Motion Sites) continuam na lista de avaliação — nenhuma será adicionada por padrão; cada uma só entra quando um componente específico do Módulo 2+ justificar (critérios da sua regra 11: necessidade, performance, bundle, manutenção, acessibilidade).

---

## Resumo executivo

- O produto passa a ter **4 núcleos desacoplados** (Conhecimento, Avaliações, Pedagógico, Curadoria/Fontes) em vez de um "curso com questões".
- `School`/`Theory`/`Concept`/`AcademicPerson`/`AcademicWork` formam a Base de Conhecimento; relações usam um híbrido de tabelas tipadas (comum) + grafo genérico `AcademicRelation` (aberto/heterogêneo).
- `Exam → ExamEdition → ExamBoard/Organization/Position` formam a Base de Avaliações, com `Question` apontando para lá e para o Conhecimento ao mesmo tempo, sem duplicar nada.
- `Lesson` deixa de ser presa a uma única `Stage` — agora reutilizável entre Formação/Faculdade/Concurso/Revisão via `StageLesson`.
- `TopicMastery`/`ReviewItem` migram para o nível de **conceito**, permitindo saber exatamente onde o aluno está fraco — não só em qual matéria.
- Nenhum autor, tema, teoria, área, prova ou banca fica hardcoded — tudo é dado, administrável, extensível sem migration estrutural (exceto os enums estruturais listados na seção 12, que mudam raramente por design).
- Roadmap revisado para 18 módulos, com o Módulo 1 estritamente limitado a scaffold/schema/infra.

**Aguardando sua autorização explícita para o Módulo 1** — e disponível para ajustar qualquer nome de entidade, o trade-off do grafo genérico, ou o escopo exato da autenticação antes de você aprovar.

---

## 14. Status de implementação (apêndice aditivo — Módulo 8)

Este documento é a proposta original v2 (pré-Módulo 1) e as decisões acima
não foram reescritas por nenhum módulo — cada `docs/MODULO-N.md` registra o
que realmente foi construído (e onde a implementação divergiu deste roadmap
original, ex.: renumeração/fusão de módulos, `ReviewState`/`ReviewLog`,
`LibraryItem`/`CurrentAffair`, etc.). Este apêndice só resume o estado atual,
sem alterar nada acima:

- **Módulos 1-7**: concluídos — ver `docs/MODULO-1.md` a `docs/MODULO-7.md`.
- **Módulo 8 (Experiência de Aprendizagem)**: concluído — ver `docs/MODULO-8.md`.
  Transforma `Lesson`/`LessonBlock` (Módulo 4) em execução real
  (`LessonProgress`/`LessonBlockCompletion`, aditivo), desbloqueio derivado,
  próximo passo, e integração com diagnóstico/revisão/simulados/biblioteca/
  atualidades — sem UI, sem IA, sem gamificação.
- **Módulo 9 (Gamificação e Progresso)**: concluído — ver `docs/MODULO-9.md`.
  Ativa `Achievement`/`UserAchievement`/`Streak`/`DailyGoal` (Módulo 1,
  schema-only até aqui) com XP/nível/streak/meta/conquistas determinísticos,
  todos derivados de eventos reais dos Módulos 3/5/6/8; um único modelo novo
  (`GamificationEvent`, ledger append-only, aditivo). Sem UI, sem ranking,
  sem monetização de streak, sem IA.
- **Módulo 10 (Orquestração Acadêmica / Motor de Estudo)**: concluído — ver
  `docs/MODULO-10.md`. Novo domínio `src/modules/study-engine/`, camada de
  ORQUESTRAÇÃO pura sobre os Módulos 3/5/6/7/8/9 — nenhuma entidade nova,
  nenhuma migration. `getStudyPlan`/`getNextStudyAction`/
  `getInitialStudyPlan` combinam diagnóstico, revisão vencida, próxima
  lição, questões recentes, simulado recomendado, biblioteca/atualidades
  (incluindo interdisciplinar via `AcademicRelation` real) numa hierarquia
  de prioridade determinística e configurável
  (`src/config/study-engine.ts`). Sem UI, sem IA.
- **Módulo 11 (Interface do Estudante)**: concluído — ver
  `docs/MODULO-11.md`. Primeira camada de UI/HTTP do produto: 20 rotas
  reais (`src/app/dashboard/*`), layout responsivo (`Header`/`SidebarNav`/
  `BottomNav`), sistema visual próprio em CSS puro (`src/app/globals.css`,
  sem biblioteca visual nova), `QuestionRenderer` para os 8 tipos de
  questão do Módulo 3, Server Actions finas delegando 100% aos Módulos
  3/5/6/8/9/10, e um mock de desenvolvimento (`src/server/auth/devActor.ts`,
  explicitamente NÃO autenticação real) para resolver o `Actor` exigido
  desde o Módulo 1. Nenhuma entidade/migration nova; contrato de segurança
  testado confirmando que `isCorrect`/`answerKey` nunca chegam à UI.
- **Módulo 12 (Interface Administrativa e de Curadoria)**: concluído — ver
  `docs/MODULO-12.md`. 51 rotas administrativas (`src/app/admin/*`) sobre os
  serviços de domínio dos Módulos 1–9 — disciplinas, base de conhecimento
  (Concept/AcademicPerson/AcademicWork/AcademicRelation), fontes/citações,
  questões (8 tipos), provas/edições/bancas/órgãos/cargos, árvore
  pedagógica (Track→Area→Unit→Stage→Lesson→Block), biblioteca, atualidades
  e leitura de auditoria. Segundo mock de desenvolvimento
  (`getCurrentAdminActor`, role ADMIN, explicitamente não-autenticação) e
  guard de acesso (`assertAdminAreaAccess`) reaproveitando
  `CURATOR_ROLES`/`PUBLISHER_ROLES` já existentes. Duas consultas de leitura
  novas (`listAuditLogEntries`, `listCitationsBySource`) e uma agregação
  (`getAdminDashboardStats`, via `groupBy` atômico). Nenhuma entidade,
  migration ou regra de negócio nova — camada de apresentação fina.
- **Etapa de consolidação (pós-Módulo 12)**: concluída — ver
  `docs/FINALIZACAO-PROJETO.md`. Autenticação real (cadastro/login/logout/
  sessão por cookie httpOnly, novo model `AuthSession`, migration
  `20260824105807_auth_session_real_login`) substitui `devActor.ts` como
  autoridade de `Actor` em toda página/Server Action de produção —
  `devActor.ts` permanece só para testes/scripts. Sistema de personagens
  (avatares SVG originais, resolvidos por `School.slug` real, com
  fallback neutro) e microanimações (respeitando
  `prefers-reduced-motion`) integrados ao dashboard, diagnóstico e
  execução de lição. Nenhuma regra de domínio dos Módulos 1–12 foi
  alterada — só a fonte do `Actor` (de mock para sessão real) e a camada
  visual. 528 testes (510 + 18 novos de autenticação).
- **Fase de fechamento (2ª passagem)**: concluída — flake de paralelismo de
  testes corrigido na causa raiz (`fileParallelism: false`), rate limiting
  de login/cadastro, N+1 real corrigido em `getReviewPerformance`, e as
  seis reações de personagem passaram a aparecer também no diagnóstico e na
  revisão (antes só na lição). 533 testes.
- **Fase de povoamento acadêmico real**: concluída — ver
  `docs/FASE-CONTEUDO-ACADEMICO.md`. `scripts/seed-academic-content.ts`
  (idempotente, reaproveita só os serviços de domínio já existentes) povoa
  uma base vertical real de Psicologia: 6 psicólogos historicamente reais
  (mesmos 6 do sistema de personagens), cada um com Escola → Teoria →
  Conceito → Obra → Questão autoral → Lição publicada, mais 1 item de
  biblioteca de domínio público real e a estrutura do ENEM (sem
  edição/questão inventada). Ativa pela primeira vez a resolução de
  personagem por escola (`resolveCharacterForSchoolSlug`, existia desde a
  etapa de consolidação mas nunca tinha `School` publicada para exercitá-la)
  e adiciona `resolveCharacterForLesson` (Lesson→Concept→Theory→School).
  541 testes.
- **Fase mobile-first + PWA**: concluída — ver `docs/MOBILE-PWA.md`. A base
  visual (`globals.css`, Módulo 11) já era mobile-first na prática (sidebar
  só aparece `@media (min-width: 1024px)`, alvos de toque ≥44px,
  `BottomNav` já existia) — confirmado por leitura antes de mexer, nada
  refeito. O que realmente faltava: PWA instalável (`app/manifest.ts`,
  ícones gerados por código via `ImageResponse`, sem asset de terceiro),
  `viewport-fit=cover` (corrige `env(safe-area-inset-bottom)` do
  `.bottom-nav`, que existia mas estava inerte sem essa diretiva), service
  worker mínimo (`public/sw.js` — só app-shell estático + fallback
  `/offline`, nunca cache de dado acadêmico/de usuário) e a página
  `/dashboard/perfil` (hub de conta, reaproveita só `getGamificationSummary`
  já existente). Nenhum backend/autenticação/Study Engine/gamificação/
  sistema de questões paralelo criado. 555 testes.
- **Fase de redesign visual**: concluída — ver `docs/REDESIGN-UX.md`. Design
  system expandido em `globals.css` (tokens de motion/profundidade/marca,
  todos centralizados, nenhum valor solto) — sem biblioteca de UI/animação
  nova (`package.json` não tinha nenhuma, e nenhum benefício técnico real a
  justificaria agora). Maior mudança: `/dashboard/trilhas/[trackId]` deixa
  de ser uma lista aninhada estilo painel administrativo e passa a ser um
  CAMINHO visual de nós (`LearningPath`, novo componente puro — mesmos dados
  de `getFullTrack`/`getTrackLessonAvailability`, Módulos 4/8, nenhum estado
  novo). Polimento visual em dashboard, questões, conquistas, perfil,
  login/signup e navegação inferior — sempre reaproveitando componentes/
  serviços existentes. Numa 2ª passagem da mesma fase, `lucide-react`
  (única dependência nova de toda a fase) substituiu emoji como ícone de
  interface (navegação/cabeçalho/nós da trilha — emoji seguem só em
  texto/celebração), e `CharacterExpression` ganhou `excited`/`sad`/
  `confused`/`pointing` (mesmo componente paramétrico). 575 testes.
- **Módulo 13 em diante**: não iniciados.
