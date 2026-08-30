#!/usr/bin/env node
/**
 * Povoamento acadêmico REAL inicial (fase "povoamento acadêmico real",
 * pós-fechamento — ver `docs/FASE-CONTEUDO-ACADEMICO.md`). Usa
 * EXCLUSIVAMENTE os serviços de domínio já existentes (`src/modules/
 * knowledge`, `assessment`, `pedagogy`, `curation`) — nenhuma regra de
 * negócio duplicada, nenhum `prisma.x.create` fora desses serviços (exceto
 * as próprias verificações de idempotência deste script, que só LEEM).
 *
 * Conteúdo: 6 psicólogos historicamente reais (mesmos 6 já usados pelo
 * sistema de personagens em `src/config/characters.ts` — os `slug` de
 * `School` aqui são EXATAMENTE os mesmos usados lá, o que ativa a
 * resolução de personagem por escola pela primeira vez), cada um com
 * Escola → Teoria → Conceito → Obra real → Questão autoral → Lição
 * publicada, todos citando uma fonte real e verificável (artigo da
 * Wikipédia em português para os fatos biográficos/conceituais — nenhuma
 * data, título de obra ou fato foi inventado; todos conferidos via busca
 * antes de escrever este script). Datas de nascimento/morte, títulos e anos
 * de publicação das obras são fatos históricos públicos, verificados nesta
 * sessão.
 *
 * NÃO povoa: ENADE/vestibulares com questões oficiais (nenhuma fonte
 * legalmente segura e verificada foi encontrada nesta sessão para
 * reproduzir questões reais — só a estrutura `Exam` "ENEM" é criada,
 * citando a Matriz de Referência oficial do INEP, sem nenhuma edição/
 * questão inventada). Também não povoa `CurrentAffair` (nenhum
 * acontecimento específico foi verificado com confiança suficiente nesta
 * sessão — ver `docs/FASE-CONTEUDO-ACADEMICO.md`, seção de limitações).
 *
 * Idempotente: cada entidade é buscada pela sua chave natural (slug/título/
 * prompt exato) antes de criar; rodar o script várias vezes não duplica
 * nada. Nunca apaga dados existentes, nunca faz `reset` do banco.
 *
 * Uso:
 *   npm run db:seed-academic
 *
 * Pré-requisito: precisa existir pelo menos um usuário ADMIN (rode
 * `npm run db:seed-admin` primeiro se ainda não houver nenhum) — este
 * script nunca cria um Actor fictício; toda a trilha de auditoria
 * (`ContentAuditLog`) fica associada a um usuário ADMIN real.
 */
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import type { Actor } from "@/server/auth/authorize";
import {
  AcademicWorkType,
  AcademicWorkRole,
  CitationEntityType,
  Difficulty,
  KnowledgeEntityType,
  LibraryMaterialType,
  FreeAccessReason,
  PublicationStatus,
  QuestionType,
  BlockType,
  StudyMode,
} from "@/generated/prisma/enums";

import { createSource } from "@/modules/curation/server/services/source.service";
import {
  createCitation,
  listCitationsForEntity,
} from "@/modules/curation/server/services/citation.service";
import {
  createDiscipline,
  publishDiscipline,
  getDiscipline,
} from "@/modules/knowledge/server/services/discipline.service";
import {
  createSchool,
  publishSchool,
  getSchool,
  linkSchoolToDiscipline,
} from "@/modules/knowledge/server/services/school.service";
import {
  createTheory,
  publishTheory,
  getTheory,
  linkTheoryToSchool,
  linkTheoryToConcept,
} from "@/modules/knowledge/server/services/theory.service";
import {
  createConcept,
  publishConcept,
  getConcept,
} from "@/modules/knowledge/server/services/concept.service";
import {
  createAcademicPerson,
  publishAcademicPerson,
  getAcademicPerson,
} from "@/modules/knowledge/server/services/academicPerson.service";
import {
  createAcademicWork,
  publishAcademicWork,
  getAcademicWork,
  addAuthorToWork,
} from "@/modules/knowledge/server/services/academicWork.service";
import {
  createAcademicRelation,
  publishAcademicRelation,
  listRelationsForEntity,
} from "@/modules/knowledge/server/services/academicRelation.service";

import {
  createQuestion,
  publishQuestion,
  linkQuestionToKnowledge,
} from "@/modules/assessment/server/services/question.service";
import { createExam, publishExam } from "@/modules/assessment/server/services/exam.service";

import {
  createTrack,
  publishTrack,
  linkTrackToArea,
} from "@/modules/pedagogy/server/services/track.service";
import {
  createLearningArea,
  publishLearningArea,
  linkAreaToUnit,
} from "@/modules/pedagogy/server/services/learning-area.service";
import {
  createUnit,
  publishUnit,
  linkUnitToStage,
} from "@/modules/pedagogy/server/services/unit.service";
import {
  createStage,
  publishStage,
  linkStageToLesson,
} from "@/modules/pedagogy/server/services/stage.service";
import {
  createLesson,
  publishLesson,
  linkLessonToKnowledge,
} from "@/modules/pedagogy/server/services/lesson.service";
import { createLessonBlock } from "@/modules/pedagogy/server/services/lesson-block.service";

import {
  createLibraryItem,
  publishLibraryItem,
} from "@/modules/curation/server/services/library.service";
import { linkLibraryItemToKnowledge } from "@/modules/curation/server/services/content-linking.service";

// ============================================================================
// Actor real (nunca um Actor fictício — ver comentário no topo do arquivo)
// ============================================================================

/**
 * Resolve um Actor ADMIN real — usado por este script e por
 * `seed-academic-content-v2.ts` (não duplicado).
 *
 * CORREÇÃO (fase de expansão acadêmica): excluir admins com o padrão de
 * e-mail usado por `createFixtureUser` (`src/test/fixtures.ts`:
 * `test-fixture-*@example.invalid`). Sem esse filtro, `orderBy: { createdAt:
 * "asc" }` pode escolher um admin-fixture órfão (remanescente de uma suíte de
 * teste interrompida — problema já sinalizado em
 * `docs/FASE-CONTEUDO-ACADEMICO.md`, seção 17.3) em vez do admin real
 * bootstrapado por `scripts/bootstrap-admin.ts`, prendendo a autoria/
 * auditoria do conteúdo real a um usuário descartável. Confirmado no banco de
 * dev desta sessão: o admin mais antigo por `createdAt` era de fato um
 * `test-fixture-*@example.invalid`, não `admin@estuda.local`.
 */
export async function resolveSeedActor(): Promise<Actor> {
  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN, email: { not: { contains: "@example.invalid" } } },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    throw new Error(
      "Nenhum usuário ADMIN real encontrado (excluindo admins de fixture de teste, " +
        "padrão `*@example.invalid`). Rode `npm run db:seed-admin` antes deste script " +
        "— o povoamento de conteúdo precisa de um Actor ADMIN real para autoria/auditoria.",
    );
  }
  return { userId: admin.id, role: admin.role };
}

// ============================================================================
// Helpers de idempotência — cada um busca pela chave natural antes de criar.
// Nenhum duplica regra de negócio: toda ESCRITA passa pelo serviço de
// domínio já existente; estes helpers só fazem a LEITURA de verificação.
// ============================================================================

async function ensureSource(actor: Actor, data: Parameters<typeof createSource>[1]) {
  const existing = data.url
    ? await prisma.source.findFirst({ where: { url: data.url } })
    : await prisma.source.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return createSource(actor, data);
}

async function ensureCitation(
  actor: Actor,
  entityType: CitationEntityType,
  entityId: string,
  sourceId: string,
  note?: string,
) {
  const existing = await listCitationsForEntity(entityType, entityId);
  const already = existing.find((c) => c.sourceId === sourceId);
  if (already) return already;
  return createCitation(actor, { entityType, entityId, sourceId, note });
}

async function ensureDiscipline(actor: Actor, data: Parameters<typeof createDiscipline>[1]) {
  const existing = await prisma.discipline.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createDiscipline(actor, data);
}

async function ensureSchool(actor: Actor, data: Parameters<typeof createSchool>[1]) {
  const existing = await prisma.school.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createSchool(actor, data);
}

async function ensureTheory(actor: Actor, data: Parameters<typeof createTheory>[1]) {
  const existing = await prisma.theory.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createTheory(actor, data);
}

async function ensureConcept(actor: Actor, data: Parameters<typeof createConcept>[1]) {
  const existing = await prisma.concept.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createConcept(actor, data);
}

async function ensureAcademicPerson(
  actor: Actor,
  data: Parameters<typeof createAcademicPerson>[1],
) {
  const existing = await prisma.academicPerson.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createAcademicPerson(actor, data);
}

async function ensureAcademicWork(actor: Actor, data: Parameters<typeof createAcademicWork>[1]) {
  const existing = await prisma.academicWork.findFirst({ where: { title: data.title } });
  if (existing) return existing;
  return createAcademicWork(actor, data);
}

async function ensureAuthorOnWork(actor: Actor, personId: string, workId: string) {
  const existing = await prisma.academicWorkAuthor.findUnique({
    where: { personId_workId: { personId, workId } },
  });
  if (existing) return existing;
  return addAuthorToWork(actor, { personId, workId, role: AcademicWorkRole.AUTOR });
}

async function ensureAcademicRelation(
  actor: Actor,
  input: Parameters<typeof createAcademicRelation>[1],
) {
  const existing = await listRelationsForEntity(input.sourceType, input.sourceId);
  const already = existing.find(
    (r) =>
      r.relationType === input.relationType &&
      r.targetType === input.targetType &&
      r.targetId === input.targetId,
  );
  if (already) return already;
  return createAcademicRelation(actor, input);
}

async function ensureQuestion(actor: Actor, data: Parameters<typeof createQuestion>[1]) {
  const existing = await prisma.question.findFirst({ where: { prompt: data.prompt } });
  if (existing) return existing;
  return createQuestion(actor, data);
}

async function ensureExam(actor: Actor, data: Parameters<typeof createExam>[1]) {
  const existing = await prisma.exam.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createExam(actor, data);
}

async function ensureTrack(actor: Actor, data: Parameters<typeof createTrack>[1]) {
  const existing = await prisma.track.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createTrack(actor, data);
}

async function ensureLearningArea(actor: Actor, data: Parameters<typeof createLearningArea>[1]) {
  const existing = await prisma.learningArea.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createLearningArea(actor, data);
}

async function ensureUnit(actor: Actor, data: Parameters<typeof createUnit>[1]) {
  const existing = await prisma.unit.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return createUnit(actor, data);
}

async function ensureStage(actor: Actor, data: Parameters<typeof createStage>[1]) {
  const existing = await prisma.stage.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return createStage(actor, data);
}

async function ensureLesson(actor: Actor, data: Parameters<typeof createLesson>[1]) {
  const existing = await prisma.lesson.findFirst({ where: { title: data.title } });
  if (existing) return existing;
  return createLesson(actor, data);
}

async function ensureLessonBlock(
  actor: Actor,
  lessonId: string,
  data: Parameters<typeof createLessonBlock>[2],
) {
  const existing = await prisma.lessonBlock.findUnique({
    where: { lessonId_order: { lessonId, order: data.order } },
  });
  if (existing) return existing;
  return createLessonBlock(actor, lessonId, data);
}

async function ensureLibraryItem(actor: Actor, data: Parameters<typeof createLibraryItem>[1]) {
  const existing = await prisma.libraryItem.findFirst({ where: { title: data.title } });
  if (existing) return existing;
  return createLibraryItem(actor, data);
}

/** Ignora "já existe"/violação de unicidade — usado para os `link*` que não fazem upsert internamente. */
async function ensureLink(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") return; // já vinculado — idempotente
    throw e;
  }
}

async function publishIfDraft<T extends { status: PublicationStatus }>(
  get: () => Promise<T | null>,
  publish: () => Promise<unknown>,
): Promise<void> {
  const current = await get();
  if (current && current.status === PublicationStatus.PUBLISHED) return;
  await publish();
}

async function publishQuestionIfDraft(questionId: string, publish: () => Promise<unknown>) {
  const current = await prisma.question.findUnique({ where: { id: questionId } });
  if (current && current.reviewStatus === PublicationStatus.PUBLISHED) return;
  await publish();
}

// ============================================================================
// Dados — 6 figuras históricas reais, fatos verificados por busca antes de
// escrever este script (datas de nascimento/morte, nacionalidade, título e
// ano da obra principal). `schoolSlug` é EXATAMENTE o slug usado em
// `src/config/characters.ts` — publicar essas 6 Schools ativa a resolução
// de personagem por escola pela primeira vez desde que o sistema existe.
// ============================================================================

interface PsychologistSeed {
  personSlug: string;
  personName: string;
  fullName: string;
  birthDate: string;
  deathDate: string;
  countryContext: string;
  bio: string;
  wikipediaUrl: string;
  schoolSlug: string;
  schoolName: string;
  schoolDescription: string;
  theorySlug: string;
  theoryName: string;
  theoryDescription: string;
  conceptSlug: string;
  conceptName: string;
  conceptDefinition: string;
  conceptDidactic: string;
  workTitle: string;
  workYear: number;
  questionPrompt: string;
  questionOptions: Array<{ text: string; isCorrect: boolean }>;
  questionExplanation: string;
  lessonTitle: string;
  introContent: string;
  exampleContent: string;
  conclusionContent: string;
}

const PSYCHOLOGISTS: PsychologistSeed[] = [
  {
    personSlug: "sigmund-freud",
    personName: "Sigmund Freud",
    fullName: "Sigmund Schlomo Freud",
    birthDate: "1856-05-06",
    deathDate: "1939-09-23",
    countryContext: "Áustria (nascido na Morávia, então Império Austríaco)",
    bio: "Médico neurologista austríaco, considerado o fundador da psicanálise. Propôs que boa parte da vida psíquica é determinada por processos inconscientes e desenvolveu um método clínico de investigação baseado na associação livre e na interpretação de sonhos e sintomas.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Sigmund_Freud",
    schoolSlug: "psicanalise",
    schoolName: "Psicanálise",
    schoolDescription:
      "Corrente teórica e clínica fundada por Freud que investiga os processos inconscientes da mente e sua influência sobre pensamentos, emoções, sintomas e comportamentos.",
    theorySlug: "teoria-psicanalitica",
    theoryName: "Teoria Psicanalítica",
    theoryDescription:
      "Conjunto de conceitos freudianos sobre a estrutura da mente, os mecanismos de defesa e o papel do inconsciente na formação de sintomas e na vida psíquica cotidiana.",
    conceptSlug: "inconsciente",
    conceptName: "Inconsciente",
    conceptDefinition:
      "Conjunto de conteúdos mentais — desejos, lembranças, impulsos — inacessíveis à consciência direta, mas capazes de influenciar pensamentos, emoções e comportamentos.",
    conceptDidactic:
      "Para Freud, sonhos, lapsos de linguagem (popularmente chamados de 'atos falhos') e sintomas neuróticos podem ser entendidos como manifestações indiretas de conteúdos inconscientes recalcados.",
    workTitle: "A Interpretação dos Sonhos",
    workYear: 1900,
    questionPrompt:
      "Segundo a teoria psicanalítica de Freud, o conceito de 'inconsciente' se refere a:",
    questionOptions: [
      {
        text: "Conteúdos mentais inacessíveis à consciência que ainda assim influenciam o comportamento",
        isCorrect: true,
      },
      { text: "A parte da mente responsável apenas pelo raciocínio lógico", isCorrect: false },
      { text: "Um estado de sono profundo sem nenhuma atividade mental", isCorrect: false },
      { text: "A memória de curto prazo usada em tarefas do dia a dia", isCorrect: false },
    ],
    questionExplanation:
      "Freud propôs que grande parte da vida psíquica ocorre fora da consciência, e que esses conteúdos inconscientes se manifestam indiretamente — por exemplo, em sonhos e sintomas.",
    lessonTitle: "Freud e o Inconsciente",
    introContent:
      "Nesta lição você vai conhecer a ideia central da psicanálise: a existência de uma vida mental que ocorre fora da consciência, mas que influencia diretamente o que sentimos e fazemos.",
    exampleContent:
      "Um exemplo clássico é o do 'ato falho': quando alguém troca o nome de uma pessoa por engano, Freud via nisso não um simples acaso, mas uma pista sobre um conteúdo inconsciente.",
    conclusionContent:
      "Você concluiu a lição sobre o inconsciente, um dos pilares da psicanálise de Freud — base para entender autores que depois dialogaram, concordando ou discordando, com essa ideia.",
  },
  {
    personSlug: "carl-gustav-jung",
    personName: "Carl Gustav Jung",
    fullName: "Carl Gustav Jung",
    birthDate: "1875-07-26",
    deathDate: "1961-06-06",
    countryContext: "Suíça",
    bio: "Psiquiatra suíço que colaborou inicialmente com Freud, mas rompeu com a psicanálise clássica para fundar a psicologia analítica, ampliando a noção de inconsciente para incluir uma camada coletiva, compartilhada entre os seres humanos.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Carl_Gustav_Jung",
    schoolSlug: "psicologia-analitica",
    schoolName: "Psicologia Analítica",
    schoolDescription:
      "Corrente fundada por Jung que propõe, além do inconsciente pessoal, um inconsciente coletivo compartilhado entre os seres humanos, povoado por padrões simbólicos universais.",
    theorySlug: "teoria-analitica",
    theoryName: "Teoria Analítica",
    theoryDescription:
      "Conjunto de ideias junguianas sobre a estrutura da psique, incluindo o inconsciente coletivo, os arquétipos e o processo de individuação.",
    conceptSlug: "arquetipo",
    conceptName: "Arquétipo",
    conceptDefinition:
      "Padrão simbólico universal, presente no inconsciente coletivo, que organiza experiências e imagens recorrentes em diferentes culturas e épocas.",
    conceptDidactic:
      "Jung identificou padrões simbólicos recorrentes — como a Sombra e a Persona — em mitos, sonhos e tradições de culturas muito distintas entre si, o que o levou a propor uma camada coletiva do inconsciente.",
    workTitle: "Tipos Psicológicos",
    workYear: 1921,
    questionPrompt: "Na psicologia analítica de Jung, o conceito de 'arquétipo' descreve:",
    questionOptions: [
      {
        text: "Um padrão simbólico universal presente no inconsciente coletivo",
        isCorrect: true,
      },
      { text: "Uma técnica de associação livre criada por Freud", isCorrect: false },
      { text: "Um tipo de reforço usado no condicionamento operante", isCorrect: false },
      { text: "Uma fase do desenvolvimento cognitivo infantil", isCorrect: false },
    ],
    questionExplanation:
      "Arquétipos são padrões simbólicos que Jung identificou como compartilhados entre culturas diferentes — não uma técnica clínica nem um conceito de outra escola.",
    lessonTitle: "Jung e os Arquétipos",
    introContent:
      "Nesta lição você vai conhecer a psicologia analítica de Jung e sua proposta de um inconsciente coletivo, compartilhado entre todos os seres humanos.",
    exampleContent:
      "Jung notou que símbolos parecidos — como as figuras do 'herói' ou da 'grande mãe' — aparecem em mitos de povos que nunca tiveram contato entre si, o que o levou a propor os arquétipos como padrões universais.",
    conclusionContent:
      "Você concluiu a lição sobre os arquétipos junguianos. Repare como essa ideia dialoga — e diverge — do inconsciente proposto por Freud.",
  },
  {
    personSlug: "b-f-skinner",
    personName: "B. F. Skinner",
    fullName: "Burrhus Frederic Skinner",
    birthDate: "1904-03-20",
    deathDate: "1990-08-18",
    countryContext: "Estados Unidos",
    bio: "Psicólogo estadunidense, principal expoente do behaviorismo radical. Desenvolveu o conceito de condicionamento operante, estudando como as consequências de um comportamento (reforços e punições) alteram a probabilidade de ele se repetir.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/B._F._Skinner",
    schoolSlug: "behaviorismo",
    schoolName: "Behaviorismo",
    schoolDescription:
      "Corrente que estuda o comportamento observável e sua relação com o ambiente, priorizando explicações baseadas em estímulos, respostas e consequências.",
    theorySlug: "analise-experimental-do-comportamento",
    theoryName: "Análise Experimental do Comportamento",
    theoryDescription:
      "Abordagem skinneriana que investiga como reforços e punições, aplicados após uma resposta, alteram a probabilidade de esse comportamento ocorrer novamente no futuro.",
    conceptSlug: "condicionamento-operante",
    conceptName: "Condicionamento Operante",
    conceptDefinition:
      "Processo pelo qual a frequência de um comportamento é alterada pelas consequências que o seguem — reforços aumentam a probabilidade de repetição, punições tendem a diminuí-la.",
    conceptDidactic:
      "Skinner estudou esse processo com animais em uma câmara controlada (a chamada 'caixa de Skinner'), registrando como a frequência de uma resposta mudava conforme o tipo de consequência aplicada.",
    workTitle: "The Behavior of Organisms (A Conduta dos Organismos)",
    workYear: 1938,
    questionPrompt: "No condicionamento operante descrito por Skinner, um reforço tem a função de:",
    questionOptions: [
      { text: "Aumentar a probabilidade de o comportamento se repetir", isCorrect: true },
      { text: "Eliminar completamente um comportamento", isCorrect: false },
      { text: "Ativar um arquétipo do inconsciente coletivo", isCorrect: false },
      { text: "Organizar estágios do desenvolvimento cognitivo", isCorrect: false },
    ],
    questionExplanation:
      "Reforços aumentam a frequência futura de um comportamento; punições, ao contrário, tendem a diminuí-la.",
    lessonTitle: "Skinner e o Condicionamento Operante",
    introContent:
      "Nesta lição você vai entender como consequências moldam o comportamento, segundo o behaviorismo de Skinner.",
    exampleContent:
      "Um exemplo simples: se um cão recebe um petisco toda vez que senta ao comando, a tendência é que ele passe a sentar com mais frequência — isso é reforço operante em ação.",
    conclusionContent:
      "Você concluiu a lição sobre condicionamento operante, um dos conceitos centrais do behaviorismo skinneriano.",
  },
  {
    personSlug: "jean-piaget",
    personName: "Jean Piaget",
    fullName: "Jean William Fritz Piaget",
    birthDate: "1896-08-09",
    deathDate: "1980-09-16",
    countryContext: "Suíça",
    bio: "Psicólogo e epistemólogo suíço que investigou como o conhecimento se desenvolve na infância. Propôs que a criança passa por estágios qualitativamente diferentes de desenvolvimento cognitivo até a adolescência.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Jean_Piaget",
    schoolSlug: "psicologia-do-desenvolvimento",
    schoolName: "Psicologia do Desenvolvimento",
    schoolDescription:
      "Campo que estuda as mudanças psicológicas ao longo do ciclo de vida, com destaque para os processos de desenvolvimento cognitivo, emocional e social na infância.",
    theorySlug: "epistemologia-genetica",
    theoryName: "Epistemologia Genética",
    theoryDescription:
      "Teoria piagetiana sobre como o conhecimento humano se constrói progressivamente, por meio da ação da criança sobre o ambiente e da adaptação de suas estruturas mentais.",
    conceptSlug: "estagios-do-desenvolvimento-cognitivo",
    conceptName: "Estágios do Desenvolvimento Cognitivo",
    conceptDefinition:
      "Fases qualitativamente distintas pelas quais, segundo Piaget, a criança passa ao construir progressivamente sua capacidade de pensar e conhecer o mundo.",
    conceptDidactic:
      "Piaget descreveu quatro estágios — sensório-motor, pré-operatório, operatório concreto e operatório formal —, cada um com formas próprias de raciocínio, até a criança alcançar o pensamento abstrato na adolescência.",
    workTitle: "A Psicologia da Inteligência",
    workYear: 1947,
    questionPrompt: "De acordo com Piaget, os estágios do desenvolvimento cognitivo são:",
    questionOptions: [
      {
        text: "Fases qualitativamente distintas de organização do pensamento ao longo da infância",
        isCorrect: true,
      },
      { text: "Etapas de reforço e punição no condicionamento operante", isCorrect: false },
      { text: "Camadas do inconsciente coletivo", isCorrect: false },
      { text: "Níveis de autoeficácia percebida", isCorrect: false },
    ],
    questionExplanation:
      "Piaget propôs que a criança constrói o conhecimento em fases com lógicas próprias, reorganizando qualitativamente sua forma de pensar — não apenas acumulando informação.",
    lessonTitle: "Piaget e os Estágios do Desenvolvimento",
    introContent:
      "Nesta lição você vai conhecer como Piaget descreveu a construção do pensamento infantil ao longo de estágios.",
    exampleContent:
      "Uma criança pequena, no estágio sensório-motor, pode agir como se um objeto escondido tivesse deixado de existir — só mais tarde ela desenvolve a noção de que ele continua ali, mesmo fora de vista.",
    conclusionContent:
      "Você concluiu a lição sobre os estágios do desenvolvimento cognitivo propostos por Piaget.",
  },
  {
    personSlug: "carl-rogers",
    personName: "Carl Rogers",
    fullName: "Carl Ransom Rogers",
    birthDate: "1902-01-08",
    deathDate: "1987-02-04",
    countryContext: "Estados Unidos",
    bio: "Psicólogo estadunidense, um dos fundadores da psicologia humanista ao lado de Abraham Maslow. Propôs uma abordagem terapêutica centrada na pessoa, baseada em empatia, aceitação incondicional e congruência.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Carl_Rogers",
    schoolSlug: "humanismo",
    schoolName: "Humanismo",
    schoolDescription:
      "Corrente que enfatiza a capacidade de autodeterminação e crescimento do indivíduo, valorizando a experiência subjetiva e uma visão otimista sobre o potencial humano.",
    theorySlug: "abordagem-centrada-na-pessoa",
    theoryName: "Abordagem Centrada na Pessoa",
    theoryDescription:
      "Modelo terapêutico rogeriano em que o terapeuta oferece empatia, aceitação incondicional e congruência, criando condições para que o próprio cliente promova sua mudança e crescimento.",
    conceptSlug: "tendencia-a-autorrealizacao",
    conceptName: "Tendência à Autorrealização",
    conceptDefinition:
      "Motivação inata, proposta por Rogers, que impulsiona o indivíduo a desenvolver suas potencialidades e buscar crescimento pessoal quando as condições do ambiente são favoráveis.",
    conceptDidactic:
      "Para Rogers, quando o indivíduo recebe aceitação e empatia genuínas — inclusive na relação terapêutica —, essa tendência natural ao crescimento tende a se expressar de forma mais plena.",
    workTitle: "Terapia Centrada no Cliente",
    workYear: 1951,
    questionPrompt:
      "Na abordagem centrada na pessoa de Carl Rogers, a 'tendência à autorrealização' descreve:",
    questionOptions: [
      {
        text: "Uma motivação inata ao crescimento e ao desenvolvimento do potencial pessoal",
        isCorrect: true,
      },
      { text: "Um estágio do desenvolvimento cognitivo infantil", isCorrect: false },
      { text: "Um mecanismo de reforço comportamental", isCorrect: false },
      { text: "Um arquétipo do inconsciente coletivo", isCorrect: false },
    ],
    questionExplanation:
      "Rogers via os seres humanos como naturalmente motivados a crescer e desenvolver seu potencial, desde que em um ambiente de aceitação e empatia.",
    lessonTitle: "Rogers e a Autorrealização",
    introContent:
      "Nesta lição você vai conhecer a visão humanista de Carl Rogers sobre o potencial de crescimento de cada pessoa.",
    exampleContent:
      "Na terapia centrada no cliente, o terapeuta evita julgar ou dar conselhos diretos — em vez disso, oferece escuta empática, confiando que o próprio cliente encontrará seu caminho de crescimento.",
    conclusionContent:
      "Você concluiu a lição sobre a tendência à autorrealização, conceito central do humanismo de Rogers.",
  },
  {
    personSlug: "albert-bandura",
    personName: "Albert Bandura",
    fullName: "Albert Bandura",
    birthDate: "1925-12-04",
    deathDate: "2021-07-26",
    countryContext:
      "Canadá (naturalizado estadunidense, atuou principalmente na Universidade Stanford)",
    bio: "Psicólogo canadense-americano, criador da teoria social cognitiva. Demonstrou que grande parte da aprendizagem humana ocorre pela observação de outras pessoas, e propôs o conceito de autoeficácia.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Albert_Bandura",
    schoolSlug: "aprendizagem-social",
    schoolName: "Aprendizagem Social",
    schoolDescription:
      "Corrente que investiga como comportamentos, atitudes e reações emocionais são aprendidos pela observação de outras pessoas, e não apenas pela experiência direta de reforço.",
    theorySlug: "teoria-social-cognitiva",
    theoryName: "Teoria Social Cognitiva",
    theoryDescription:
      "Modelo de Bandura que descreve a aprendizagem como resultado da interação entre fatores pessoais (crenças, cognições), comportamentais e ambientais.",
    conceptSlug: "autoeficacia",
    conceptName: "Autoeficácia",
    conceptDefinition:
      "Crença de uma pessoa em sua própria capacidade de realizar as ações necessárias para alcançar um resultado desejado.",
    conceptDidactic:
      "Bandura mostrou que pessoas com maior senso de autoeficácia tendem a persistir mais diante de dificuldades, pois acreditam que suas ações podem produzir o resultado esperado.",
    workTitle: "Self-Efficacy: The Exercise of Control (Autoeficácia: o Exercício do Controle)",
    workYear: 1997,
    questionPrompt: "Segundo Albert Bandura, o conceito de 'autoeficácia' se refere a:",
    questionOptions: [
      {
        text: "A crença da pessoa em sua própria capacidade de realizar as ações necessárias para atingir um objetivo",
        isCorrect: true,
      },
      { text: "Um estágio do desenvolvimento cognitivo infantil", isCorrect: false },
      { text: "Um padrão simbólico do inconsciente coletivo", isCorrect: false },
      { text: "A consequência que aumenta a frequência de um comportamento", isCorrect: false },
    ],
    questionExplanation:
      "Autoeficácia é uma crença sobre a própria capacidade — diferente de estágios de desenvolvimento, arquétipos ou reforço comportamental, conceitos de outras teorias.",
    lessonTitle: "Bandura e a Autoeficácia",
    introContent:
      "Nesta lição você vai conhecer a teoria social cognitiva de Bandura e o papel da autoeficácia na motivação e na aprendizagem.",
    exampleContent:
      "Duas pessoas diante do mesmo desafio podem agir de forma bem diferente: quem acredita ser capaz tende a persistir mais, mesmo diante de dificuldades — essa crença é a autoeficácia.",
    conclusionContent:
      "Você concluiu a lição sobre autoeficácia, conceito central da teoria social cognitiva de Bandura.",
  },
];

// ============================================================================
// main()
// ============================================================================

/**
 * Núcleo do povoamento — exportado (não só chamado por `main()`) para que o
 * teste de integração (`scripts/seed-academic-content.test.ts`) possa
 * chamá-lo diretamente com um Actor de teste, sem depender de rodar o CLI
 * primeiro. Idempotente (ver helpers `ensure*` acima) — seguro chamar
 * quantas vezes for preciso, inclusive repetidamente dentro da suíte de
 * testes.
 */
export async function seedAcademicContent(actor: Actor) {
  const counts = {
    sources: 0,
    disciplines: 0,
    schools: 0,
    theories: 0,
    concepts: 0,
    people: 0,
    works: 0,
    questions: 0,
    lessons: 0,
    stages: 0,
    relations: 0,
    libraryItems: 0,
    exams: 0,
  };

  // --- Fonte autoral da plataforma (para as questões autorais) ---
  const autoralSource = await ensureSource(actor, {
    name: "Conteúdo autoral — plataforma Estuda+",
    sourceType: "AUTORAL",
    classification: "DIDATICA",
    rightsNote:
      "Questão redigida originalmente pela equipe da plataforma para fins didáticos — não reproduz nenhuma prova oficial nem é atribuída a nenhuma banca/exame.",
  });
  counts.sources++;

  // --- Discipline "Psicologia" ---
  const psicologiaWikiSource = await ensureSource(actor, {
    name: "Wikipédia — Psicologia",
    sourceType: "EXTERNA",
    classification: "SECUNDARIA",
    url: "https://pt.wikipedia.org/wiki/Psicologia",
    institution: "Wikimedia Foundation",
  });
  counts.sources++;

  const psicologia = await ensureDiscipline(actor, {
    slug: "psicologia",
    name: "Psicologia",
    description:
      "Campo científico que estuda os processos mentais e o comportamento humano, incluindo suas bases biológicas, cognitivas, sociais e de desenvolvimento.",
  });
  await ensureCitation(
    actor,
    CitationEntityType.DISCIPLINE,
    psicologia.id,
    psicologiaWikiSource.id,
  );
  await publishIfDraft(
    () => getDiscipline(psicologia.id),
    () => publishDiscipline(actor, psicologia.id),
  );
  counts.disciplines++;

  // --- Uma trilha por psicólogo: Fonte → Pessoa → Escola → Teoria → Conceito
  //     → Obra → Questão autoral → Lição → Etapa. Tudo publicado ao final. ---
  const personIds: Record<string, string> = {};
  const personCitationIds: Record<string, string> = {};
  const conceptIds: Record<string, string> = {};
  const stageIds: string[] = [];

  for (const p of PSYCHOLOGISTS) {
    const wikiSource = await ensureSource(actor, {
      name: `Wikipédia — ${p.personName}`,
      sourceType: "EXTERNA",
      classification: "SECUNDARIA",
      url: p.wikipediaUrl,
      institution: "Wikimedia Foundation",
    });
    counts.sources++;

    const person = await ensureAcademicPerson(actor, {
      slug: p.personSlug,
      name: p.personName,
      fullName: p.fullName,
      bio: p.bio,
      birthDate: new Date(p.birthDate),
      deathDate: new Date(p.deathDate),
      countryContext: p.countryContext,
    });
    const personCitation = await ensureCitation(
      actor,
      CitationEntityType.PERSON,
      person.id,
      wikiSource.id,
    );
    await publishIfDraft(
      () => getAcademicPerson(person.id),
      () => publishAcademicPerson(actor, person.id),
    );
    personIds[p.personSlug] = person.id;
    personCitationIds[p.personSlug] = personCitation.id;
    counts.people++;

    const school = await ensureSchool(actor, {
      slug: p.schoolSlug,
      name: p.schoolName,
      description: p.schoolDescription,
    });
    await ensureCitation(actor, CitationEntityType.SCHOOL, school.id, wikiSource.id);
    await publishIfDraft(
      () => getSchool(school.id),
      () => publishSchool(actor, school.id),
    );
    await ensureLink(() => linkSchoolToDiscipline(actor, school.id, psicologia.id));
    counts.schools++;

    const theory = await ensureTheory(actor, {
      slug: p.theorySlug,
      name: p.theoryName,
      description: p.theoryDescription,
    });
    await ensureCitation(actor, CitationEntityType.THEORY, theory.id, wikiSource.id);
    await publishIfDraft(
      () => getTheory(theory.id),
      () => publishTheory(actor, theory.id),
    );
    await ensureLink(() => linkTheoryToSchool(actor, theory.id, school.id));
    counts.theories++;

    const concept = await ensureConcept(actor, {
      slug: p.conceptSlug,
      name: p.conceptName,
      definition: p.conceptDefinition,
      didacticExplanation: p.conceptDidactic,
      difficulty: Difficulty.BASICO,
    });
    await ensureCitation(actor, CitationEntityType.CONCEPT, concept.id, wikiSource.id);
    await publishIfDraft(
      () => getConcept(concept.id),
      () => publishConcept(actor, concept.id),
    );
    await ensureLink(() => linkTheoryToConcept(actor, theory.id, concept.id));
    conceptIds[p.personSlug] = concept.id;
    counts.concepts++;

    const work = await ensureAcademicWork(actor, {
      title: p.workTitle,
      year: p.workYear,
      type: AcademicWorkType.LIVRO,
    });
    await ensureAuthorOnWork(actor, person.id, work.id);
    await publishIfDraft(
      () => getAcademicWork(work.id),
      () => publishAcademicWork(actor, work.id),
    );
    counts.works++;

    const question = await ensureQuestion(actor, {
      prompt: p.questionPrompt,
      type: QuestionType.MULTIPLE_CHOICE,
      explanation: p.questionExplanation,
      difficulty: Difficulty.BASICO,
      sourceId: autoralSource.id,
      reproductionAllowed: true,
      options: p.questionOptions.map((o, i) => ({ ...o, order: i })),
    });
    await ensureLink(() =>
      linkQuestionToKnowledge(actor, question.id, {
        entityType: KnowledgeEntityType.CONCEPT,
        entityId: concept.id,
      }),
    );
    await publishQuestionIfDraft(question.id, () => publishQuestion(actor, question.id));
    counts.questions++;

    const lesson = await ensureLesson(actor, { title: p.lessonTitle });
    await ensureLessonBlock(actor, lesson.id, {
      order: 0,
      type: BlockType.INTRO,
      content: p.introContent,
    });
    await ensureLessonBlock(actor, lesson.id, {
      order: 1,
      type: BlockType.CONCEPT,
      content: `${p.conceptDefinition} ${p.conceptDidactic}`,
    });
    await ensureLessonBlock(actor, lesson.id, {
      order: 2,
      type: BlockType.EXAMPLE,
      content: p.exampleContent,
    });
    await ensureLessonBlock(actor, lesson.id, {
      order: 3,
      type: BlockType.QUESTION,
      questionId: question.id,
    });
    await ensureLessonBlock(actor, lesson.id, {
      order: 4,
      type: BlockType.CONCLUSION,
      content: p.conclusionContent,
    });
    await ensureLink(() =>
      linkLessonToKnowledge(actor, lesson.id, {
        entityType: KnowledgeEntityType.CONCEPT,
        entityId: concept.id,
      }),
    );
    await ensureCitation(actor, CitationEntityType.LESSON, lesson.id, wikiSource.id);
    await publishIfDraft(
      () => prisma.lesson.findUnique({ where: { id: lesson.id } }),
      () => publishLesson(actor, lesson.id),
    );
    counts.lessons++;

    const stage = await ensureStage(actor, { name: p.lessonTitle });
    await ensureLink(() => linkStageToLesson(actor, stage.id, { lessonId: lesson.id }));
    await publishIfDraft(
      () => prisma.stage.findUnique({ where: { id: stage.id } }),
      () => publishStage(actor, stage.id),
    );
    stageIds.push(stage.id);
    counts.stages++;
  }

  // --- Relações reais entre as figuras (fatos históricos bem documentados) ---
  await ensureAcademicRelation(actor, {
    sourceType: KnowledgeEntityType.PERSON,
    sourceId: personIds["sigmund-freud"],
    relationType: "INFLUENCIOU",
    targetType: KnowledgeEntityType.PERSON,
    targetId: personIds["carl-gustav-jung"],
    description:
      "Jung foi inicialmente um colaborador próximo de Freud antes de romper com a psicanálise clássica para fundar a psicologia analítica.",
    citationId: personCitationIds["sigmund-freud"],
  });
  counts.relations++;
  await ensureAcademicRelation(actor, {
    sourceType: KnowledgeEntityType.PERSON,
    sourceId: personIds["b-f-skinner"],
    relationType: "INFLUENCIOU",
    targetType: KnowledgeEntityType.PERSON,
    targetId: personIds["albert-bandura"],
    description:
      "A teoria social cognitiva de Bandura se desenvolveu em diálogo com a tradição behaviorista de Skinner, incorporando também processos cognitivos internos.",
    citationId: personCitationIds["albert-bandura"],
  });
  counts.relations++;
  // Publica as relações criadas (busca por par para checar status, já que a
  // listagem não indexa por par sourceId/targetId diretamente).
  for (const rel of await listRelationsForEntity(
    KnowledgeEntityType.PERSON,
    personIds["sigmund-freud"],
  )) {
    if (rel.status !== PublicationStatus.PUBLISHED) await publishAcademicRelation(actor, rel.id);
  }
  for (const rel of await listRelationsForEntity(
    KnowledgeEntityType.PERSON,
    personIds["b-f-skinner"],
  )) {
    if (rel.status !== PublicationStatus.PUBLISHED) await publishAcademicRelation(actor, rel.id);
  }

  // --- Árvore pedagógica: Track → Area → Unit → 6 Stages já criados ---
  const unit = await ensureUnit(actor, {
    name: "Grandes Escolas do Pensamento Psicológico",
    primaryDisciplineId: psicologia.id,
  });
  for (const stageId of stageIds) {
    await ensureLink(() => linkUnitToStage(actor, unit.id, { stageId }));
  }
  await publishIfDraft(
    () => prisma.unit.findUnique({ where: { id: unit.id } }),
    () => publishUnit(actor, unit.id),
  );

  const area = await ensureLearningArea(actor, {
    slug: "escolas-e-teorias",
    name: "Escolas e Teorias Psicológicas",
  });
  await ensureLink(() => linkAreaToUnit(actor, area.id, { unitId: unit.id }));
  await publishIfDraft(
    () => prisma.learningArea.findUnique({ where: { id: area.id } }),
    () => publishLearningArea(actor, area.id),
  );

  const track = await ensureTrack(actor, {
    slug: "fundamentos-psicologia",
    name: "Fundamentos da Psicologia: Escolas e Teorias",
    mode: StudyMode.FORMACAO,
  });
  await ensureLink(() => linkTrackToArea(actor, track.id, { areaId: area.id }));
  await publishIfDraft(
    () => prisma.track.findUnique({ where: { id: track.id } }),
    () => publishTrack(actor, track.id),
  );

  // --- Biblioteca: 1 item real e verificadamente de domínio público ---
  const gutenbergSource = await ensureSource(actor, {
    name: "Project Gutenberg — The Interpretation of Dreams (trad. A. A. Brill)",
    sourceType: "OFICIAL",
    classification: "PRIMARIA",
    url: "https://www.gutenberg.org/ebooks/66048",
    institution: "Project Gutenberg",
    license: "Public Domain (US)",
  });
  counts.sources++;

  const libraryItem = await ensureLibraryItem(actor, {
    title: "The Interpretation of Dreams",
    authorName: "Sigmund Freud",
    academicWorkId: (await prisma.academicWork.findFirst({
      where: { title: "A Interpretação dos Sonhos" },
    }))!.id,
    materialType: LibraryMaterialType.EBOOK,
    language: "en",
    year: 1913,
    isFree: true,
    freeAccessReason: FreeAccessReason.PUBLIC_DOMAIN,
    sourceId: gutenbergSource.id,
  });
  await ensureLink(() =>
    linkLibraryItemToKnowledge(actor, libraryItem.id, {
      entityType: KnowledgeEntityType.CONCEPT,
      entityId: conceptIds["sigmund-freud"],
    }),
  );
  await publishIfDraft(
    () => prisma.libraryItem.findUnique({ where: { id: libraryItem.id } }),
    () => publishLibraryItem(actor, libraryItem.id),
  );
  counts.libraryItems++;

  // --- Exam "ENEM" — só a estrutura, citando a Matriz de Referência oficial
  //     do INEP; NENHUMA edição/questão foi inventada (ver comentário no
  //     topo do arquivo e docs/FASE-CONTEUDO-ACADEMICO.md). ---
  await ensureSource(actor, {
    name: "INEP — Matriz de Referência do ENEM",
    sourceType: "OFICIAL",
    classification: "OFICIAL",
    url: "https://download.inep.gov.br/download/enem/matriz_referencia.pdf",
    institution: "INEP",
  });
  counts.sources++;

  const enem = await ensureExam(actor, {
    slug: "enem",
    name: "Exame Nacional do Ensino Médio (ENEM)",
  });
  await publishIfDraft(
    () => prisma.exam.findUnique({ where: { id: enem.id } }),
    () => publishExam(actor, enem.id),
  );
  counts.exams++;

  return counts;
}

/**
 * Entrada de CLI (`npm run db:seed-academic`) — resolve um Actor ADMIN real
 * do banco (nunca fictício) e roda `seedAcademicContent`. Guardado por
 * `isDirectRun` para que IMPORTAR este arquivo (ex.: do teste de
 * integração) nunca dispare o CLI como efeito colateral do import.
 */
async function runFromCli() {
  const actor = await resolveSeedActor();
  console.log(`[seed-academic-content] rodando como ADMIN userId=${actor.userId}`);
  const counts = await seedAcademicContent(actor);
  console.log("[seed-academic-content] concluído:");
  console.log(JSON.stringify(counts, null, 2));
}

const isDirectRun = !!process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  runFromCli()
    .catch((err) => {
      console.error("[seed-academic-content] falhou:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
