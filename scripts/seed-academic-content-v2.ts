#!/usr/bin/env node
/**
 * Povoamento acadêmico real — FASE DE EXPANSÃO (segunda leva, complementa
 * `scripts/seed-academic-content.ts` / `docs/FASE-CONTEUDO-ACADEMICO.md`; não
 * o substitui nem o duplica). Usa EXCLUSIVAMENTE os serviços de domínio já
 * existentes (`src/modules/knowledge`, `assessment`, `pedagogy`, `curation`)
 * — nenhuma regra de negócio duplicada, nenhum `prisma.x.create` fora desses
 * serviços (exceto as verificações de idempotência deste script, que só LEEM).
 *
 * Conteúdo novo, todo verificado por busca web ANTES de escrever este script
 * (datas de nascimento/morte, títulos e anos de obras, fatos históricos —
 * ver `docs/FASE-CONTEUDO-ACADEMICO-V2.md` para a lista de fontes por
 * entidade): 14 novos psicólogos historicamente reais — John B. Watson,
 * Ivan Pavlov, Wilhelm Wundt, William James, Kurt Lewin, Lev Vygotsky, Erik
 * Erikson, Melanie Klein, Anna Freud, Donald Winnicott, Aaron Beck, Karen
 * Horney, Mary Ainsworth e Abraham Maslow — cada um com Escola → Teoria →
 * Conceito → Obra real → Questão autoral → Lição publicada. Também povoa:
 * 9 períodos históricos reais, 4 disciplinas interdisciplinares (Filosofia/
 * Sociologia/História/Educação) relacionadas à Psicologia via
 * `AcademicRelation`, 17 tags, 2 itens de biblioteca gratuitos e
 * verificadamente de domínio público (William James, Ivan Pavlov), 2
 * atualidades reais e datadas (OMS/CID-11, CFP nº 11/2018), 7 relações
 * acadêmicas reais entre pessoas/teorias, e 8 novas trilhas pedagógicas
 * completas (reaproveitando as 6 Lessons/Stages da fase anterior sem
 * duplicar nenhuma).
 *
 * Usa os 8 `QuestionType` suportados pelo sistema (Módulo 3) — cada tipo
 * escolhido por adequação pedagógica ao conceito, não forçado:
 * MULTIPLE_CHOICE (6), TRUE_FALSE (1), MULTI_SELECT (2), ORDERING (1),
 * MATCHING (1), FILL_BLANK (1), SHORT_ANSWER (1), CASE_STUDY (1).
 *
 * NÃO povoa questões/edições oficiais de provas (nenhuma fonte legalmente
 * seguraE verificada para reprodução foi encontrada nesta sessão — mesma
 * restrição documentada na fase anterior).
 *
 * Idempotente: cada entidade é buscada pela sua chave natural (slug/título/
 * prompt exato) antes de criar; rodar o script várias vezes não duplica
 * nada — mesmo padrão de `seed-academic-content.ts`.
 *
 * Uso:
 *   npm run db:seed-academic-v2
 *
 * Pré-requisito: `npm run db:seed-academic` já executado (reutiliza a
 * Discipline "Psicologia", o Source autoral, e as Schools/Stages da fase
 * anterior para reaproveitamento pedagógico) e um usuário ADMIN real
 * existente (ver `resolveSeedActor` em `seed-academic-content.ts`).
 */
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { prisma } from "@/server/db";
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
  CurrentAffairRelevance,
} from "@/generated/prisma/enums";

import { resolveSeedActor } from "./seed-academic-content";

import { createSource } from "@/modules/curation/server/services/source.service";
import {
  createCitation,
  listCitationsForEntity,
} from "@/modules/curation/server/services/citation.service";
import {
  createDiscipline,
  getDiscipline,
  publishDiscipline,
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
  linkConceptToTag,
} from "@/modules/knowledge/server/services/concept.service";
import {
  createAcademicPerson,
  publishAcademicPerson,
  getAcademicPerson,
  linkPersonToTag,
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
import { createHistoricalPeriod } from "@/modules/knowledge/server/services/historicalPeriod.service";
import { createTag } from "@/modules/knowledge/server/services/tag.service";

import {
  createQuestion,
  publishQuestion,
  linkQuestionToKnowledge,
} from "@/modules/assessment/server/services/question.service";

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
import {
  linkLibraryItemToKnowledge,
  linkCurrentAffairToKnowledge,
  linkCurrentAffairToTag,
} from "@/modules/curation/server/services/content-linking.service";
import {
  createCurrentAffair,
  publishCurrentAffair,
} from "@/modules/curation/server/services/current-affairs.service";

// ============================================================================
// Helpers de idempotência — mesmo padrão de `seed-academic-content.ts`
// (redeclarados aqui porque não são exportados de lá; são só plumbing de
// busca-antes-de-criar, nenhuma regra de negócio vive nestas funções — a
// regra de negócio real está inteiramente nos serviços importados acima).
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

async function ensureHistoricalPeriod(
  actor: Actor,
  data: Parameters<typeof createHistoricalPeriod>[1],
) {
  const existing = await prisma.historicalPeriod.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createHistoricalPeriod(actor, data);
}

async function ensureTag(actor: Actor, data: Parameters<typeof createTag>[1]) {
  const existing = await prisma.tag.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return createTag(actor, data);
}

async function ensureCurrentAffair(actor: Actor, data: Parameters<typeof createCurrentAffair>[1]) {
  const existing = await prisma.currentAffair.findFirst({ where: { title: data.title } });
  if (existing) return existing;
  return createCurrentAffair(actor, data);
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
// Dados — 9 períodos históricos reais. Cada `startYear`/`endYear` ancorado em
// um fato verificado (fundação de laboratório/publicação/morte), não uma
// estimativa arbitrária — ver justificativa por período nos comentários.
// ============================================================================

interface PeriodSeed {
  slug: string;
  name: string;
  startYear?: number;
  endYear?: number;
  description: string;
}

const PERIODS: PeriodSeed[] = [
  {
    slug: "antecedentes-filosoficos",
    name: "Antecedentes Filosóficos da Psicologia",
    endYear: 1879,
    description:
      "Da Antiguidade grega até a fundação do primeiro laboratório de psicologia experimental (1879) — questões sobre mente, alma e conhecimento tratadas dentro da Filosofia, antes da Psicologia se consolidar como ciência independente com método próprio.",
  },
  {
    slug: "fundacao-psicologia-cientifica",
    name: "Fundação da Psicologia Científica: Estruturalismo e Funcionalismo",
    startYear: 1879,
    endYear: 1920,
    description:
      "Início em 1879, quando Wilhelm Wundt funda o primeiro laboratório de psicologia experimental do mundo, em Leipzig. Reúne o estruturalismo wundtiano (estudo dos elementos da consciência por introspecção controlada) e o funcionalismo americano de William James (foco na função adaptativa da consciência). Limite superior (1920) marca a morte de Wundt.",
  },
  {
    slug: "gestalt",
    name: "Escola da Gestalt",
    startYear: 1912,
    endYear: 1935,
    description:
      "Iniciada em 1912 com os estudos de Max Wertheimer sobre percepção de movimento (fenômeno phi), em colaboração com Wolfgang Köhler e Kurt Koffka. Propôs que a percepção organiza estímulos em totalidades ('Gestalten'), não em elementos isolados — crítica direta ao estruturalismo wundtiano. Limite superior aproximado: emigração dos três fundadores para os Estados Unidos ao longo da década de 1930.",
  },
  {
    slug: "behaviorismo-periodo",
    name: "Behaviorismo",
    startYear: 1913,
    endYear: 1956,
    description:
      "Início em 1913, com o manifesto de John B. Watson 'Psychology as the Behaviorist Views It', que propôs restringir a Psicologia ao estudo do comportamento observável. Consolidado depois por B. F. Skinner (condicionamento operante). Limite superior marca o início convencional da 'virada cognitiva' (1956).",
  },
  {
    slug: "psicanalise-periodo",
    name: "Psicanálise: Fundação e Primeira Geração",
    startYear: 1900,
    endYear: 1939,
    description:
      "Início em 1900, com a publicação de 'A Interpretação dos Sonhos' de Freud. Cobre a fundação do movimento psicanalítico e sua primeira geração de desenvolvimento teórico — incluindo contribuições pioneiras sobre a infância e o aparelho psíquico. Limite superior: morte de Freud (1939), convencionalmente usada para marcar o fim da 'geração fundadora', embora a tradição psicanalítica tenha continuado a se desenvolver depois disso por autores formados nesse período.",
  },
  {
    slug: "humanismo-periodo",
    name: 'Humanismo em Psicologia ("Terceira Força")',
    startYear: 1943,
    endYear: 1970,
    description:
      "Início em 1943, com a publicação do artigo seminal de Abraham Maslow sobre a hierarquia das necessidades. Chamada de 'terceira força' por se posicionar como alternativa tanto à psicanálise quanto ao behaviorismo, enfatizando a experiência subjetiva e o potencial de crescimento humano (Maslow, Rogers).",
  },
  {
    slug: "revolucao-cognitiva",
    name: "Revolução Cognitiva",
    startYear: 1956,
    endYear: 1980,
    description:
      "Marco simbólico em 11 de setembro de 1956, no Symposium on Information Theory do MIT, quando George Miller, Noam Chomsky e Herbert Simon/Allen Newell apresentaram trabalhos no mesmo evento sobre memória, linguagem e processamento de informação — deslocando o foco da Psicologia do comportamento observável para os processos mentais internos (percepção, memória, linguagem, pensamento).",
  },
  {
    slug: "psicologia-contemporanea",
    name: "Psicologia Contemporânea",
    startYear: 1980,
    description:
      "Período de consolidação e diversificação da Psicologia em múltiplas subáreas aplicadas e de pesquisa (clínica, escolar, organizacional, da saúde, neuropsicologia, avaliação psicológica), com integração crescente de métodos das neurociências.",
  },
  {
    slug: "psicologia-no-brasil-regulamentacao",
    name: "Psicologia no Brasil: Regulamentação Profissional",
    startYear: 1962,
    description:
      "Marco em 27 de agosto de 1962, com a sanção da Lei nº 4.119, que regulamenta os cursos de formação em Psicologia e a profissão de psicólogo no Brasil — resultado de um processo de mobilização profissional iniciado ainda no final da década de 1940.",
  },
];

// ============================================================================
// Dados — 14 novos psicólogos. Mesma estrutura de
// `scripts/seed-academic-content.ts`: Fonte (Wikipédia) → Pessoa → Escola →
// Teoria → Conceito → Obra real → Questão autoral → Lição publicada.
// `schoolSlug` pode ser uma Escola JÁ existente (reaproveitada, N:N real
// entre School e Theory) ou nova — nunca uma segunda estrutura paralela.
// ============================================================================

type QuestionOptionSeed = { text: string; isCorrect: boolean };

type QuestionSpec =
  | { kind: "OPTIONS"; type: typeof QuestionType.MULTIPLE_CHOICE; options: QuestionOptionSeed[] }
  | { kind: "OPTIONS"; type: typeof QuestionType.TRUE_FALSE; options: QuestionOptionSeed[] }
  | { kind: "OPTIONS"; type: typeof QuestionType.MULTI_SELECT; options: QuestionOptionSeed[] }
  | { kind: "ORDERING"; type: typeof QuestionType.ORDERING; itemsInOrder: string[] }
  | { kind: "OPTIONS"; type: typeof QuestionType.CASE_STUDY; options: QuestionOptionSeed[] }
  | {
      kind: "MATCHING";
      type: typeof QuestionType.MATCHING;
      pairs: { left: string; right: string }[];
    }
  | {
      kind: "FILL_BLANK";
      type: typeof QuestionType.FILL_BLANK;
      blanks: { accepted: string[] }[];
    }
  | { kind: "SHORT_ANSWER"; type: typeof QuestionType.SHORT_ANSWER; accepted: string[] };

interface PsychologistSeedV2 {
  personSlug: string;
  personName: string;
  fullName: string;
  birthDate: string;
  deathDate: string;
  countryContext: string;
  bio: string;
  wikipediaUrl: string;
  periodSlug?: string;
  schoolSlug: string;
  schoolName: string;
  schoolDescription: string;
  theorySlug: string;
  theoryName: string;
  theoryDescription: string;
  theoryPeriodSlug?: string;
  conceptSlug: string;
  conceptName: string;
  conceptDefinition: string;
  conceptDidactic: string;
  workTitle: string;
  workYear: number;
  workType: (typeof AcademicWorkType)[keyof typeof AcademicWorkType];
  questionPrompt: string;
  questionExplanation: string;
  questionSpec: QuestionSpec;
  lessonTitle: string;
  introContent: string;
  exampleContent: string;
  conclusionContent: string;
}

const PSYCHOLOGISTS_V2: PsychologistSeedV2[] = [
  {
    personSlug: "wilhelm-wundt",
    personName: "Wilhelm Wundt",
    fullName: "Wilhelm Maximilian Wundt",
    birthDate: "1832-08-16",
    deathDate: "1920-08-31",
    countryContext: "Alemanha",
    bio: "Fisiologista e psicólogo alemão que fundou, em 1879, o primeiro laboratório de psicologia experimental do mundo, na Universidade de Leipzig — marco convencional do início da Psicologia como ciência independente da Filosofia.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Wilhelm_Wundt",
    periodSlug: "fundacao-psicologia-cientifica",
    schoolSlug: "estruturalismo",
    schoolName: "Estruturalismo",
    schoolDescription:
      "Corrente fundada a partir do laboratório de Wundt que buscava identificar os elementos básicos da consciência (sensações, sentimentos, imagens) por meio da introspecção experimental controlada.",
    theorySlug: "estruturalismo-wundtiano",
    theoryName: "Estruturalismo Wundtiano",
    theoryDescription:
      "Proposta de decompor a experiência consciente em seus elementos mais simples, analisados sob condições experimentais controladas em laboratório — método que deu à Psicologia nascente um caráter científico distinto da especulação filosófica.",
    theoryPeriodSlug: "fundacao-psicologia-cientifica",
    conceptSlug: "introspeccao-experimental",
    conceptName: "Introspecção Experimental",
    conceptDefinition:
      "Método de autoexame sistemático e treinado dos próprios processos mentais imediatos, realizado sob condições de laboratório controladas, usado por Wundt para identificar os elementos da consciência.",
    conceptDidactic:
      "Diferente da introspecção informal do dia a dia, a introspecção experimental de Wundt exigia observadores treinados relatando suas sensações imediatas diante de estímulos controlados (por exemplo, um som ou uma luz), em condições padronizadas e repetíveis.",
    workTitle: "Princípios de Psicologia Fisiológica (Grundzüge der physiologischen Psychologie)",
    workYear: 1874,
    workType: AcademicWorkType.LIVRO,
    questionPrompt: "O método da 'introspecção experimental', usado por Wundt, consistia em:",
    questionExplanation:
      "Wundt treinava observadores para relatar, sob condições controladas de laboratório, suas sensações e experiências conscientes imediatas diante de estímulos padronizados — não uma reflexão informal e espontânea sobre a própria vida.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        {
          text: "Observadores treinados relatando suas sensações imediatas diante de estímulos controlados em laboratório",
          isCorrect: true,
        },
        { text: "Análise de sonhos relatados livremente pelo paciente", isCorrect: false },
        {
          text: "Registro do comportamento observável sem referência à consciência",
          isCorrect: false,
        },
        { text: "Entrevista clínica não estruturada sobre a infância", isCorrect: false },
      ],
    },
    lessonTitle: "Wundt e a Fundação da Psicologia Experimental",
    introContent:
      "Nesta lição você vai conhecer o momento em que a Psicologia se tornou uma ciência experimental independente, com Wilhelm Wundt e seu laboratório de 1879 em Leipzig.",
    exampleContent:
      "Um voluntário treinado no laboratório de Wundt podia ser exposto a um som breve e instruído a relatar, com o máximo de precisão, as sensações imediatas que experimentava — não uma opinião sobre o som, mas a sensação crua em si.",
    conclusionContent:
      "Você concluiu a lição sobre Wundt e a introspecção experimental — a origem da Psicologia como ciência de laboratório, base para todas as escolas que vieram depois, inclusive as que discordaram profundamente do método wundtiano.",
  },
  {
    personSlug: "william-james",
    personName: "William James",
    fullName: "William James",
    birthDate: "1842-01-11",
    deathDate: "1910-08-26",
    countryContext: "Estados Unidos",
    bio: "Filósofo e psicólogo estadunidense, um dos fundadores do funcionalismo — corrente que, ao contrário do estruturalismo de Wundt, buscava entender a FUNÇÃO adaptativa da consciência, não decompô-la em elementos.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/William_James",
    periodSlug: "fundacao-psicologia-cientifica",
    schoolSlug: "funcionalismo",
    schoolName: "Funcionalismo",
    schoolDescription:
      "Corrente americana que estudava a consciência e o comportamento pela sua função adaptativa — como ajudam o organismo a se ajustar ao ambiente —, em vez de buscar decompor a consciência em elementos fixos.",
    theorySlug: "funcionalismo-jamesiano",
    theoryName: "Funcionalismo Jamesiano",
    theoryDescription:
      "Proposta de James de que a consciência deve ser estudada como um processo contínuo e funcional, voltado à adaptação do organismo ao ambiente, e não como uma coleção estática de elementos.",
    theoryPeriodSlug: "fundacao-psicologia-cientifica",
    conceptSlug: "fluxo-de-consciencia",
    conceptName: "Fluxo de Consciência",
    conceptDefinition:
      "Ideia de James de que a consciência não é uma sequência de elementos estáticos e separados, mas um processo contínuo, pessoal e sempre em mudança — um 'fluxo' (stream of consciousness).",
    conceptDidactic:
      "Para James, tentar isolar 'elementos' fixos da consciência (como propunha o estruturalismo de Wundt) distorcia sua natureza real: a experiência consciente é contínua, como um rio, nunca exatamente a mesma de um instante para o outro.",
    workTitle: "Princípios de Psicologia (The Principles of Psychology)",
    workYear: 1890,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "O conceito de 'fluxo de consciência', proposto por William James, descreve a consciência como:",
    questionExplanation:
      "James se opunha à ideia de decompor a consciência em elementos fixos e estáticos (proposta pelo estruturalismo de Wundt) — para ele, a experiência consciente é um processo contínuo e sempre em mudança.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.MULTI_SELECT,
      options: [
        {
          text: "Um processo contínuo, e não uma sequência de elementos fixos e separados",
          isCorrect: true,
        },
        { text: "Algo pessoal, sempre em mudança de um instante para o outro", isCorrect: true },
        {
          text: "Uma coleção fixa de elementos sensoriais isolados, como propunha o estruturalismo",
          isCorrect: false,
        },
        {
          text: "Um comportamento observável, sem relação com a experiência subjetiva",
          isCorrect: false,
        },
      ],
    },
    lessonTitle: "William James e o Funcionalismo",
    introContent:
      "Nesta lição você vai conhecer o funcionalismo de William James — uma resposta ao estruturalismo de Wundt que mudou o foco da Psicologia para a função adaptativa da mente.",
    exampleContent:
      "James comparava a consciência a um rio: por mais que você tente isolar uma 'gota' dela para estudá-la separadamente, a experiência real é sempre contínua e está sempre um pouco diferente da anterior.",
    conclusionContent:
      "Você concluiu a lição sobre o fluxo de consciência de James — um dos conceitos fundadores da Psicologia americana, base para o funcionalismo e para debates posteriores sobre a natureza da experiência subjetiva.",
  },
  {
    personSlug: "john-b-watson",
    personName: "John B. Watson",
    fullName: "John Broadus Watson",
    birthDate: "1878-01-09",
    deathDate: "1958-09-25",
    countryContext: "Estados Unidos",
    bio: "Psicólogo estadunidense que, em 1913, publicou o manifesto fundador do behaviorismo, propondo restringir o objeto da Psicologia ao comportamento observável, e não à consciência subjetiva estudada por introspecção.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/John_B._Watson",
    periodSlug: "behaviorismo-periodo",
    schoolSlug: "behaviorismo",
    schoolName: "Behaviorismo",
    schoolDescription:
      "Corrente que estuda o comportamento observável e sua relação com o ambiente, priorizando explicações baseadas em estímulos, respostas e consequências.",
    theorySlug: "behaviorismo-metodologico",
    theoryName: "Behaviorismo Metodológico",
    theoryDescription:
      "Proposta fundadora de Watson de que a Psicologia deve se restringir ao estudo do comportamento observável e mensurável, abandonando a introspecção sobre estados mentais subjetivos como método científico.",
    theoryPeriodSlug: "behaviorismo-periodo",
    conceptSlug: "condicionamento-do-medo",
    conceptName: "Condicionamento do Medo (Caso Pequeno Albert)",
    conceptDefinition:
      "Demonstração experimental de Watson e Rosalie Rayner (1920) de que uma reação emocional — o medo — pode ser aprendida por condicionamento clássico, associando um estímulo antes neutro a um estímulo assustador.",
    conceptDidactic:
      "No experimento, um bebê (conhecido como 'Pequeno Albert') que não temia um rato branco passou a chorar diante dele depois que sua aparição foi repetidamente associada a um som alto e assustador — mostrando que emoções também podem ser condicionadas.",
    workTitle: "A Psicologia tal como o Behaviorista a Vê (Psychology as the Behaviorist Views It)",
    workYear: 1913,
    workType: AcademicWorkType.ARTIGO,
    questionPrompt:
      "O behaviorismo metodológico proposto por Watson defendia que a Psicologia deveria estudar cientificamente:",
    questionExplanation:
      "Watson propôs restringir o objeto de estudo da Psicologia ao comportamento observável e mensurável — não a introspecção sobre estados de consciência subjetivos, método que ele considerava não confiável cientificamente.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.TRUE_FALSE,
      options: [
        {
          text: "O comportamento observável e mensurável, e não estados de consciência relatados por introspecção",
          isCorrect: true,
        },
        {
          text: "Exclusivamente os conteúdos inconscientes relatados pelo paciente em associação livre",
          isCorrect: false,
        },
      ],
    },
    lessonTitle: "Watson e o Nascimento do Behaviorismo",
    introContent:
      "Nesta lição você vai conhecer o manifesto de John B. Watson que fundou o behaviorismo, mudando radicalmente o que a Psicologia considerava um objeto de estudo científico válido.",
    exampleContent:
      "No célebre (e hoje considerado eticamente problemático) experimento do 'Pequeno Albert', Watson e Rayner mostraram que até reações emocionais como o medo podem ser aprendidas por associação — não apenas respostas motoras simples.",
    conclusionContent:
      "Você concluiu a lição sobre Watson e a fundação do behaviorismo — a base sobre a qual Pavlov e, mais tarde, Skinner construíram grande parte da tradição comportamental.",
  },
  {
    personSlug: "ivan-pavlov",
    personName: "Ivan Pavlov",
    fullName: "Ivan Petrovich Pavlov",
    birthDate: "1849-09-26",
    deathDate: "1936-02-27",
    countryContext: "Império Russo / União Soviética",
    bio: "Fisiologista russo, vencedor do Prêmio Nobel de Fisiologia ou Medicina de 1904 (por pesquisas sobre a fisiologia da digestão), conhecido por descobrir e descrever sistematicamente o condicionamento clássico a partir de experimentos com cães.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Ivan_Pavlov",
    schoolSlug: "reflexologia",
    schoolName: "Reflexologia",
    schoolDescription:
      "Tradição fisiológica russa, anterior e paralela ao behaviorismo americano, que estudou os reflexos condicionados como base objetiva e mensurável do comportamento aprendido.",
    theorySlug: "teoria-do-reflexo-condicionado",
    theoryName: "Teoria do Reflexo Condicionado",
    theoryDescription:
      "Modelo de Pavlov segundo o qual um estímulo neutro, repetidamente associado a um estímulo que já provoca uma resposta natural (reflexo incondicionado), passa a provocar sozinho uma resposta semelhante (reflexo condicionado).",
    conceptSlug: "condicionamento-classico",
    conceptName: "Condicionamento Clássico",
    conceptDefinition:
      "Processo de aprendizagem no qual um estímulo neutro passa a provocar uma resposta antes só produzida por outro estímulo, depois de os dois serem repetidamente apresentados juntos.",
    conceptDidactic:
      "No experimento clássico de Pavlov, o som de um metrônomo (estímulo neutro) foi repetidamente apresentado junto com comida (que já provocava salivação nos cães). Depois de várias repetições, o som sozinho passou a provocar a salivação.",
    workTitle:
      "Reflexos Condicionados: uma Investigação da Atividade Fisiológica do Córtex Cerebral (Conditioned Reflexes)",
    workYear: 1927,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "No condicionamento clássico descrito por Pavlov, a resposta condicionada surge quando:",
    questionExplanation:
      "O condicionamento clássico depende da associação repetida entre um estímulo neutro e um estímulo que já provoca a resposta naturalmente — depois disso, o estímulo antes neutro passa a provocar a resposta sozinho.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        {
          text: "Um estímulo neutro é repetidamente associado a um estímulo que já provoca uma resposta natural",
          isCorrect: true,
        },
        {
          text: "Um comportamento é seguido por um reforço que aumenta sua frequência",
          isCorrect: false,
        },
        { text: "Uma pessoa observa o comportamento de um modelo e o imita", isCorrect: false },
        {
          text: "Uma criança reorganiza qualitativamente seu pensamento em um novo estágio",
          isCorrect: false,
        },
      ],
    },
    lessonTitle: "Pavlov e o Condicionamento Clássico",
    introContent:
      "Nesta lição você vai conhecer os experimentos de Ivan Pavlov com cães, que descreveram pela primeira vez de forma sistemática o condicionamento clássico — base para todo o behaviorismo que viria depois.",
    exampleContent:
      "O exemplo mais famoso: cães de Pavlov salivavam ao ouvir um som antes neutro, depois de esse som ter sido repetidamente associado à chegada da comida — mesmo sem a comida estar presente.",
    conclusionContent:
      "Você concluiu a lição sobre o condicionamento clássico de Pavlov — distinto, mas historicamente conectado, ao condicionamento operante que Skinner descreveria décadas depois.",
  },
  {
    personSlug: "kurt-lewin",
    personName: "Kurt Lewin",
    fullName: "Kurt Zadek Lewin",
    birthDate: "1890-09-09",
    deathDate: "1947-02-12",
    countryContext: "Alemanha (emigrou para os Estados Unidos em 1933)",
    bio: "Psicólogo social germano-americano, frequentemente descrito como um dos fundadores da Psicologia Social moderna e do estudo científico da dinâmica de grupos, com forte influência da Gestalt.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Kurt_Lewin",
    schoolSlug: "psicologia-social",
    schoolName: "Psicologia Social",
    schoolDescription:
      "Campo que estuda como o pensamento, o sentimento e o comportamento das pessoas são influenciados pela presença real, imaginada ou implícita de outras pessoas e pelo contexto social e grupal.",
    theorySlug: "teoria-de-campo",
    theoryName: "Teoria de Campo",
    theoryDescription:
      "Modelo de Lewin segundo o qual o comportamento (B) é função da pessoa (P) e do seu ambiente psicológico (E), representado na fórmula B = f(P, E) — o comportamento não pode ser explicado isolando a pessoa do seu contexto.",
    conceptSlug: "espaco-vital",
    conceptName: "Espaço Vital",
    conceptDefinition:
      "Conceito de Lewin para o ambiente psicológico total de uma pessoa em um dado momento — todos os fatores (reais, lembrados ou antecipados) que influenciam seu comportamento naquele instante.",
    conceptDidactic:
      "O espaço vital inclui não só o ambiente físico objetivo, mas também como a pessoa o percebe e o significa — duas pessoas na mesma sala podem ter espaços vitais bem diferentes, dependendo de suas metas, medos e lembranças naquele momento.",
    workTitle: "Princípios de Psicologia Topológica (Principles of Topological Psychology)",
    workYear: 1936,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "Na teoria de campo de Kurt Lewin, o comportamento de uma pessoa é entendido como:",
    questionExplanation:
      "Para Lewin, o comportamento é sempre função da interação entre a pessoa e seu ambiente psicológico (espaço vital) — nunca algo explicável isolando a pessoa do seu contexto.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        {
          text: "Função da interação entre a pessoa e seu ambiente psicológico (espaço vital)",
          isCorrect: true,
        },
        { text: "Determinado unicamente por reforços e punições passadas", isCorrect: false },
        { text: "Resultado exclusivo de conteúdos inconscientes reprimidos", isCorrect: false },
        { text: "Uma fase fixa e universal do desenvolvimento cognitivo", isCorrect: false },
      ],
    },
    lessonTitle: "Lewin e a Teoria de Campo",
    introContent:
      "Nesta lição você vai conhecer a teoria de campo de Kurt Lewin e o conceito de espaço vital, fundamentais para a Psicologia Social e o estudo científico de grupos.",
    exampleContent:
      "Duas pessoas em uma mesma reunião de trabalho podem se comportar de forma muito diferente: uma pode senti-la como uma oportunidade, outra como uma ameaça — o espaço vital de cada uma, não só a situação objetiva, explica a diferença.",
    conclusionContent:
      "Você concluiu a lição sobre o espaço vital de Lewin — um conceito central para entender por que o comportamento humano não pode ser reduzido só ao ambiente físico externo.",
  },
  {
    personSlug: "lev-vygotsky",
    personName: "Lev Vygotsky",
    fullName: "Lev Semionovitch Vygotsky",
    birthDate: "1896-11-17",
    deathDate: "1934-06-11",
    countryContext: "Império Russo / União Soviética",
    bio: "Psicólogo bielorrusso-soviético que propôs que o desenvolvimento cognitivo humano é fundamentalmente mediado pela linguagem e pela interação social e cultural — não um processo só individual, como em outras teorias do desenvolvimento.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Lev_Vygotsky",
    schoolSlug: "psicologia-do-desenvolvimento",
    schoolName: "Psicologia do Desenvolvimento",
    schoolDescription:
      "Campo que estuda as mudanças psicológicas ao longo do ciclo de vida, com destaque para os processos de desenvolvimento cognitivo, emocional e social na infância.",
    theorySlug: "teoria-sociocultural-do-desenvolvimento",
    theoryName: "Teoria Sociocultural do Desenvolvimento",
    theoryDescription:
      "Modelo de Vygotsky segundo o qual as funções psicológicas superiores (linguagem, pensamento abstrato, memória voluntária) se originam nas interações sociais e culturais, sendo depois internalizadas pelo indivíduo.",
    conceptSlug: "zona-de-desenvolvimento-proximal",
    conceptName: "Zona de Desenvolvimento Proximal",
    conceptDefinition:
      "Distância entre o que uma criança já consegue fazer sozinha e o que ela consegue fazer com a orientação de alguém mais experiente (um adulto ou colega mais avançado).",
    conceptDidactic:
      "Uma criança pode não conseguir resolver um problema sozinha, mas consegue resolvê-lo com pequenas dicas de um adulto — essa faixa entre o que ela já domina e o que ainda depende de apoio é a zona de desenvolvimento proximal, terreno fértil para o ensino.",
    workTitle: "Pensamento e Linguagem (Mýshlenie i rech')",
    workYear: 1934,
    workType: AcademicWorkType.LIVRO,
    questionPrompt: "A 'zona de desenvolvimento proximal', conceito de Vygotsky, descreve:",
    questionExplanation:
      "A zona de desenvolvimento proximal não é o que a criança já sabe fazer sozinha, nem o que está totalmente fora de seu alcance — é exatamente a faixa intermediária, alcançável com apoio de alguém mais experiente.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        {
          text: "A distância entre o que a criança já faz sozinha e o que consegue fazer com apoio de alguém mais experiente",
          isCorrect: true,
        },
        {
          text: "Um estágio fixo e universal do desenvolvimento cognitivo, igual para todas as culturas",
          isCorrect: false,
        },
        { text: "O conjunto de reflexos inatos presentes desde o nascimento", isCorrect: false },
        { text: "A capacidade da criança de reprimir impulsos inconscientes", isCorrect: false },
      ],
    },
    lessonTitle: "Vygotsky e a Zona de Desenvolvimento Proximal",
    introContent:
      "Nesta lição você vai conhecer a teoria sociocultural de Vygotsky e a ideia de que aprendemos e nos desenvolvemos, sobretudo, em interação com outras pessoas.",
    exampleContent:
      "Uma criança pode não conseguir montar um quebra-cabeça sozinha, mas consegue com pequenas dicas de um adulto ('tente essa peça aqui') — na próxima vez, talvez precise de menos ajuda, até conseguir sozinha.",
    conclusionContent:
      "Você concluiu a lição sobre a zona de desenvolvimento proximal — um conceito que influenciou profundamente a Psicologia da Aprendizagem e a Psicologia Escolar/Educacional.",
  },
  {
    personSlug: "erik-erikson",
    personName: "Erik Erikson",
    fullName: "Erik Homburger Erikson",
    birthDate: "1902-06-15",
    deathDate: "1994-05-12",
    countryContext: "Alemanha (naturalizado estadunidense)",
    bio: "Psicanalista germano-americano que propôs uma teoria do desenvolvimento humano estendida por toda a vida (não só a infância), organizada em oito estágios psicossociais, cada um marcado por um conflito ou 'crise' central a resolver.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Erik_Erikson",
    schoolSlug: "psicologia-do-desenvolvimento",
    schoolName: "Psicologia do Desenvolvimento",
    schoolDescription:
      "Campo que estuda as mudanças psicológicas ao longo do ciclo de vida, com destaque para os processos de desenvolvimento cognitivo, emocional e social na infância.",
    theorySlug: "teoria-psicossocial-do-desenvolvimento",
    theoryName: "Teoria Psicossocial do Desenvolvimento",
    theoryDescription:
      "Modelo de Erikson que descreve o desenvolvimento humano ao longo de oito estágios psicossociais, cada um definido por um conflito central (por exemplo, confiança versus desconfiança, identidade versus confusão de papéis) cuja resolução molda a personalidade.",
    conceptSlug: "estagios-psicossociais-do-desenvolvimento",
    conceptName: "Estágios Psicossociais do Desenvolvimento",
    conceptDefinition:
      "Sequência de oito fases propostas por Erikson, cobrindo toda a vida (não só a infância), cada uma organizada em torno de um conflito psicossocial central cuja resolução influencia o desenvolvimento da personalidade.",
    conceptDidactic:
      "Diferente de Freud (focado no desenvolvimento psicossexual infantil) e de Piaget (focado na cognição), Erikson descreveu conflitos sociais e identitários que se estendem da infância à velhice — como a busca por identidade na adolescência.",
    workTitle: "Infância e Sociedade (Childhood and Society)",
    workYear: 1950,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "Ordene os quatro primeiros estágios psicossociais do desenvolvimento propostos por Erik Erikson, da infância mais precoce até a adolescência:",
    questionExplanation:
      "Erikson organizou o desenvolvimento em estágios sequenciais: Confiança Básica vs. Desconfiança (primeiro ano de vida) -> Autonomia vs. Vergonha e Dúvida (primeira infância) -> Iniciativa vs. Culpa (idade pré-escolar) -> Identidade vs. Confusão de Papéis (adolescência).",
    questionSpec: {
      kind: "ORDERING",
      type: QuestionType.ORDERING,
      itemsInOrder: [
        "Confiança Básica vs. Desconfiança (0 a 1 ano)",
        "Autonomia vs. Vergonha e Dúvida (1 a 3 anos)",
        "Iniciativa vs. Culpa (3 a 6 anos)",
        "Identidade vs. Confusão de Papéis (adolescência)",
      ],
    },
    lessonTitle: "Erikson e os Estágios Psicossociais",
    introContent:
      "Nesta lição você vai conhecer a teoria psicossocial de Erik Erikson, que estende o desenvolvimento humano por toda a vida, da infância à velhice.",
    exampleContent:
      "Na adolescência, segundo Erikson, o conflito central é 'Identidade vs. Confusão de Papéis' — o jovem experimenta diferentes papéis sociais até formar um senso mais estável de quem é.",
    conclusionContent:
      "Você concluiu a lição sobre os estágios psicossociais de Erikson — um complemento importante às teorias de Freud e Piaget sobre o desenvolvimento humano.",
  },
  {
    personSlug: "mary-ainsworth",
    personName: "Mary Ainsworth",
    fullName: "Mary Dinsmore Salter Ainsworth",
    birthDate: "1913-12-01",
    deathDate: "1999-03-21",
    countryContext: "Canadá (naturalizada estadunidense)",
    bio: "Psicóloga do desenvolvimento canadense-americana que, em colaboração com John Bowlby, expandiu e testou empiricamente a teoria do apego, criando o procedimento da 'Situação Estranha' para classificar padrões de apego entre bebês e cuidadores.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Mary_Ainsworth",
    schoolSlug: "psicologia-do-desenvolvimento",
    schoolName: "Psicologia do Desenvolvimento",
    schoolDescription:
      "Campo que estuda as mudanças psicológicas ao longo do ciclo de vida, com destaque para os processos de desenvolvimento cognitivo, emocional e social na infância.",
    theorySlug: "teoria-do-apego",
    theoryName: "Teoria do Apego",
    theoryDescription:
      "Modelo, desenvolvido por John Bowlby e testado empiricamente por Ainsworth, segundo o qual o vínculo afetivo entre um bebê e seu cuidador principal fornece uma 'base segura' para a exploração do mundo, com efeitos duradouros no desenvolvimento socioemocional.",
    conceptSlug: "situacao-estranha-e-padroes-de-apego",
    conceptName: "Situação Estranha e Padrões de Apego",
    conceptDefinition:
      "Procedimento experimental criado por Ainsworth para observar, em laboratório, como bebês reagem a breves separações e reencontros com o cuidador — usado para classificar padrões de apego (seguro, ansioso-ambivalente, evitante).",
    conceptDidactic:
      "Na Situação Estranha, um bebê é observado brincando, depois é separado brevemente do cuidador e reencontra-o. A forma como reage à separação e ao reencontro (busca conforto e se acalma; fica muito angustiado; ou parece indiferente) indica o padrão de apego predominante.",
    workTitle:
      "Padrões de Apego: um Estudo Psicológico da Situação Estranha (Patterns of Attachment)",
    workYear: 1978,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "Relacione cada padrão de apego observado na Situação Estranha de Ainsworth à sua descrição comportamental:",
    questionExplanation:
      "Ainsworth identificou padrões diferentes de reação à separação e ao reencontro com o cuidador — cada um reflete uma história diferente de responsividade do cuidador às necessidades do bebê.",
    questionSpec: {
      kind: "MATCHING",
      type: QuestionType.MATCHING,
      pairs: [
        {
          left: "Apego Seguro",
          right:
            "A criança usa o cuidador como base segura para explorar e se acalma com facilidade após a separação",
        },
        {
          left: "Apego Ansioso-Ambivalente",
          right:
            "A criança fica muito angustiada na separação e não se acalma facilmente no reencontro",
        },
        {
          left: "Apego Evitante",
          right: "A criança parece indiferente à separação e evita o cuidador no reencontro",
        },
      ],
    },
    lessonTitle: "Ainsworth e a Situação Estranha",
    introContent:
      "Nesta lição você vai conhecer o procedimento da Situação Estranha, criado por Mary Ainsworth para estudar cientificamente os padrões de apego entre bebês e cuidadores.",
    exampleContent:
      "Um bebê com apego seguro pode chorar quando a mãe sai da sala, mas se acalma rapidamente e volta a explorar os brinquedos assim que ela retorna — usando-a como uma 'base segura'.",
    conclusionContent:
      "Você concluiu a lição sobre a Situação Estranha de Ainsworth — um dos procedimentos experimentais mais influentes da Psicologia do Desenvolvimento, com impacto até hoje na compreensão do vínculo entre pais e filhos.",
  },
  {
    personSlug: "melanie-klein",
    personName: "Melanie Klein",
    fullName: "Melanie Klein (nascida Reizes)",
    birthDate: "1882-03-30",
    deathDate: "1960-09-22",
    countryContext: "Áustria-Hungria (atuou principalmente no Reino Unido)",
    bio: "Psicanalista austríaca, pioneira da psicanálise infantil e fundadora da teoria das relações objetais, que analisava crianças pequenas usando o brincar espontâneo como equivalente à associação livre dos adultos.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Melanie_Klein",
    periodSlug: "psicanalise-periodo",
    schoolSlug: "psicanalise",
    schoolName: "Psicanálise",
    schoolDescription:
      "Corrente teórica e clínica fundada por Freud que investiga os processos inconscientes da mente e sua influência sobre pensamentos, emoções, sintomas e comportamentos.",
    theorySlug: "teoria-das-relacoes-objetais",
    theoryName: "Teoria das Relações Objetais",
    theoryDescription:
      "Modelo de Klein que desloca o foco da psicanálise dos impulsos instintivos isolados para as relações internalizadas do bebê com figuras significativas ('objetos'), sobretudo a mãe, desde os primeiros meses de vida.",
    theoryPeriodSlug: "psicanalise-periodo",
    conceptSlug: "posicao-esquizoparanoide-e-depressiva",
    conceptName: "Posição Esquizoparanoide e Posição Depressiva",
    conceptDefinition:
      "Dois modos organizadores da experiência psíquica precoce descritos por Klein: a posição esquizoparanoide (o bebê percebe o objeto de forma cindida, em 'bom' e 'mau') e a posição depressiva (o bebê passa a integrar essas percepções em um objeto único e ambivalente).",
    conceptDidactic:
      "Na posição esquizoparanoide, o bebê vive a mãe como se fosse duas figuras separadas — a que satisfaz e a que frustra. Na posição depressiva, ele começa a perceber que se trata da mesma pessoa, o que gera ansiedade sobre ter, em fantasia, atacado quem também ama.",
    workTitle: "A Psicanálise de Crianças (The Psycho-Analysis of Children)",
    workYear: 1932,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "Um caso: um bebê de poucos meses reage ao cuidador ora com intensa gratificação, ora com raiva, como se fossem duas figuras diferentes. Segundo Melanie Klein, essa forma de organizar a experiência corresponde à:",
    questionExplanation:
      "Klein descreveu a posição esquizoparanoide como o modo mais precoce de organizar a experiência psíquica, no qual o bebê ainda não integra as qualidades 'boas' e 'más' do objeto (cuidador) em uma única representação — isso só ocorre depois, na posição depressiva.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.CASE_STUDY,
      options: [
        { text: "Posição esquizoparanoide", isCorrect: true },
        { text: "Estádio do espelho", isCorrect: false },
        { text: "Zona de desenvolvimento proximal", isCorrect: false },
        { text: "Condicionamento operante", isCorrect: false },
      ],
    },
    lessonTitle: "Klein e a Teoria das Relações Objetais",
    introContent:
      "Nesta lição você vai conhecer a psicanálise infantil de Melanie Klein e sua teoria das relações objetais, que deslocou o foco da psicanálise para os primeiríssimos meses de vida.",
    exampleContent:
      "Klein observava crianças pequenas brincando com bonecos e miniaturas, interpretando esse brincar espontâneo como uma via de acesso à vida fantasística inconsciente — de forma parecida ao que a associação livre é para adultos.",
    conclusionContent:
      "Você concluiu a lição sobre a teoria das relações objetais de Klein — base para toda uma tradição psicanalítica britânica que incluiria, depois, autores como Donald Winnicott.",
  },
  {
    personSlug: "anna-freud",
    personName: "Anna Freud",
    fullName: "Anna Freud",
    birthDate: "1895-12-03",
    deathDate: "1982-10-09",
    countryContext: "Áustria (emigrou para o Reino Unido em 1938)",
    bio: "Psicanalista austríaca, filha mais nova de Sigmund Freud, reconhecida como fundadora da psicanálise infantil sistemática e da psicologia do ego, com foco nos mecanismos de defesa usados para lidar com a ansiedade.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Anna_Freud",
    periodSlug: "psicanalise-periodo",
    schoolSlug: "psicanalise",
    schoolName: "Psicanálise",
    schoolDescription:
      "Corrente teórica e clínica fundada por Freud que investiga os processos inconscientes da mente e sua influência sobre pensamentos, emoções, sintomas e comportamentos.",
    theorySlug: "psicologia-do-ego",
    theoryName: "Psicologia do Ego",
    theoryDescription:
      "Desenvolvimento teórico de Anna Freud que sistematiza os mecanismos de defesa do ego — estratégias inconscientes usadas para lidar com a ansiedade gerada por conflitos entre impulsos, exigências morais e a realidade externa.",
    theoryPeriodSlug: "psicanalise-periodo",
    conceptSlug: "mecanismos-de-defesa-do-ego",
    conceptName: "Mecanismos de Defesa do Ego",
    conceptDefinition:
      "Estratégias inconscientes descritas por Anna Freud (sistematizando ideias iniciais de Sigmund Freud) usadas pelo ego para lidar com a ansiedade gerada por conflitos internos — por exemplo, negação, repressão, projeção e formação reativa.",
    conceptDidactic:
      "Formação reativa, por exemplo, é quando um impulso inaceitável é transformado em seu oposto consciente — alguém com raiva reprimida de um familiar pode se tornar excessivamente gentil e atencioso com ele, sem perceber a origem desse comportamento.",
    workTitle: "O Ego e os Mecanismos de Defesa (The Ego and the Mechanisms of Defence)",
    workYear: 1936,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "Quais das alternativas abaixo são mecanismos de defesa do ego descritos por Anna Freud?",
    questionExplanation:
      "Negação, repressão, projeção e formação reativa são mecanismos de defesa sistematizados por Anna Freud. 'Reforço' é um conceito do condicionamento operante (Skinner); 'zona de desenvolvimento proximal' é de Vygotsky — nenhum dos dois é um mecanismo de defesa.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.MULTI_SELECT,
      options: [
        { text: "Negação", isCorrect: true },
        { text: "Projeção", isCorrect: true },
        { text: "Formação reativa", isCorrect: true },
        { text: "Reforço positivo", isCorrect: false },
      ],
    },
    lessonTitle: "Anna Freud e os Mecanismos de Defesa",
    introContent:
      "Nesta lição você vai conhecer a psicologia do ego de Anna Freud e os principais mecanismos de defesa que ela sistematizou.",
    exampleContent:
      "Alguém que sofre uma perda significativa e, por semanas, insiste que 'não aconteceu nada de grave' pode estar usando a negação como forma de se proteger, temporariamente, de uma dor difícil de suportar de uma vez.",
    conclusionContent:
      "Você concluiu a lição sobre os mecanismos de defesa do ego — um conceito amplamente usado até hoje na Psicologia Clínica para compreender como as pessoas lidam com a ansiedade.",
  },
  {
    personSlug: "donald-winnicott",
    personName: "Donald Winnicott",
    fullName: "Donald Woods Winnicott",
    birthDate: "1896-04-07",
    deathDate: "1971-01-25",
    countryContext: "Reino Unido",
    bio: "Pediatra e psicanalista britânico que descreveu a importância do ambiente de cuidado precoce para o desenvolvimento emocional, cunhando conceitos amplamente usados até hoje, como 'mãe suficientemente boa' e 'objeto transicional'.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Donald_Winnicott",
    schoolSlug: "psicanalise",
    schoolName: "Psicanálise",
    schoolDescription:
      "Corrente teórica e clínica fundada por Freud que investiga os processos inconscientes da mente e sua influência sobre pensamentos, emoções, sintomas e comportamentos.",
    theorySlug: "teoria-do-amadurecimento-emocional",
    theoryName: "Teoria do Amadurecimento Emocional",
    theoryDescription:
      "Modelo de Winnicott sobre como um ambiente de cuidado 'suficientemente bom' (nem perfeito, nem gravemente falho) permite que o bebê desenvolva gradualmente um senso seguro de si mesmo e da realidade externa.",
    conceptSlug: "objeto-transicional",
    conceptName: "Objeto Transicional",
    conceptDefinition:
      "Primeiro objeto 'não-eu' (como um cobertor ou bichinho de pelúcia) que a criança usa para se confortar na ausência do cuidador, funcionando como uma ponte entre a dependência total do início da vida e a autonomia posterior.",
    conceptDidactic:
      "O objeto transicional não é apenas um brinquedo qualquer: ele representa, ao mesmo tempo, a presença da mãe e o começo da capacidade da criança de ficar sozinha — por isso a criança reage tão fortemente se ele for lavado ou perdido.",
    workTitle: "O Brincar e a Realidade (Playing and Reality)",
    workYear: 1971,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "Para Winnicott, a função do 'objeto transicional' (como um cobertor de apego) é:",
    questionExplanation:
      "O objeto transicional ajuda a criança a suportar a ausência temporária do cuidador, funcionando como uma ponte simbólica entre a dependência total do início da vida e a autonomia que vem depois — não é 'apenas' um brinquedo qualquer para Winnicott.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        {
          text: "Servir de ponte simbólica entre a dependência do cuidador e a autonomia crescente da criança",
          isCorrect: true,
        },
        {
          text: "Substituir permanentemente a necessidade de vínculo com o cuidador",
          isCorrect: false,
        },
        { text: "Provocar o condicionamento clássico de uma resposta de medo", isCorrect: false },
        { text: "Representar um arquétipo do inconsciente coletivo", isCorrect: false },
      ],
    },
    lessonTitle: "Winnicott e o Objeto Transicional",
    introContent:
      "Nesta lição você vai conhecer os conceitos de Donald Winnicott sobre o desenvolvimento emocional precoce e a importância de um ambiente de cuidado 'suficientemente bom'.",
    exampleContent:
      "Uma criança que leva um bichinho de pelúcia específico para todo lugar, e fica muito incomodada se ele for trocado por um igual, está demonstrando a força simbólica do objeto transicional descrito por Winnicott.",
    conclusionContent:
      "Você concluiu a lição sobre o objeto transicional de Winnicott — um conceito que dialoga diretamente com a tradição das relações objetais iniciada por Melanie Klein.",
  },
  {
    personSlug: "karen-horney",
    personName: "Karen Horney",
    fullName: "Karen Horney (nascida Danielsen)",
    birthDate: "1885-09-16",
    deathDate: "1952-12-04",
    countryContext: "Alemanha (emigrou para os Estados Unidos em 1932)",
    bio: "Psicanalista alemã-americana, uma das primeiras a criticar sistematicamente, de dentro da própria tradição psicanalítica, o que considerava vieses masculinos nas teorias de Freud sobre o desenvolvimento psicológico das mulheres.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Karen_Horney",
    periodSlug: "psicanalise-periodo",
    schoolSlug: "psicanalise",
    schoolName: "Psicanálise",
    schoolDescription:
      "Corrente teórica e clínica fundada por Freud que investiga os processos inconscientes da mente e sua influência sobre pensamentos, emoções, sintomas e comportamentos.",
    theorySlug: "psicologia-feminina-horney",
    theoryName: "Psicologia Feminina (Horney)",
    theoryDescription:
      "Releitura crítica de Karen Horney sobre o desenvolvimento psicológico feminino, propondo que diferenças entre homens e mulheres na psicanálise clássica refletiam mais fatores culturais e sociais do que uma inevitabilidade biológica.",
    theoryPeriodSlug: "psicanalise-periodo",
    conceptSlug: "critica-a-inveja-do-penis-e-inveja-do-utero",
    conceptName: "Crítica à Inveja do Pênis e Inveja do Útero",
    conceptDefinition:
      "Contraproposta de Karen Horney ao conceito freudiano de 'inveja do pênis': para ela, o desejo de poder social atribuído às mulheres é cultural, não biológico, e os próprios homens podem sentir uma 'inveja do útero' — inveja da capacidade reprodutiva feminina.",
    conceptDidactic:
      "Horney argumentava que, se mulheres desejassem características associadas ao masculino, isso refletia o maior prestígio e poder social atribuído a homens em sua época — não uma inveja biológica inevitável, como sugeria a teoria freudiana original.",
    workTitle: "Novos Caminhos em Psicanálise (New Ways in Psychoanalysis)",
    workYear: 1939,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "Complete: Karen Horney contrapôs o conceito freudiano de 'inveja do pênis' propondo que homens também poderiam sentir uma ____, referente à inveja da capacidade reprodutiva feminina.",
    questionExplanation:
      "Horney cunhou o conceito de 'inveja do útero' (womb envy) para argumentar que a inveja entre os sexos não seria uma via de mão única biologicamente determinada, como sugeria a teoria freudiana original.",
    questionSpec: {
      kind: "SHORT_ANSWER",
      type: QuestionType.SHORT_ANSWER,
      accepted: ["inveja do útero", "inveja da matriz", "inveja do ventre"],
    },
    lessonTitle: "Karen Horney e a Psicologia Feminina",
    introContent:
      "Nesta lição você vai conhecer a crítica de Karen Horney a alguns conceitos freudianos sobre o desenvolvimento psicológico feminino, e sua proposta de uma explicação mais cultural do que biológica.",
    exampleContent:
      "Horney observava que o desejo de autonomia e reconhecimento social atribuído a mulheres de sua época dizia mais sobre as restrições sociais impostas a elas do que sobre qualquer inevitabilidade biológica.",
    conclusionContent:
      "Você concluiu a lição sobre Karen Horney — uma das primeiras vozes, de dentro da própria psicanálise, a questionar pressupostos sobre gênero em teorias psicológicas até então dominantes.",
  },
  {
    personSlug: "aaron-beck",
    personName: "Aaron Beck",
    fullName: "Aaron Temkin Beck",
    birthDate: "1921-07-18",
    deathDate: "2021-11-01",
    countryContext: "Estados Unidos",
    bio: "Psiquiatra estadunidense, considerado o fundador da terapia cognitiva, ao propor que padrões de pensamento distorcidos (não apenas conflitos inconscientes ou condicionamento) têm um papel central em transtornos como a depressão.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Aaron_Beck",
    periodSlug: "revolucao-cognitiva",
    schoolSlug: "psicologia-cognitiva",
    schoolName: "Psicologia Cognitiva",
    schoolDescription:
      "Campo que estuda os processos mentais internos — percepção, memória, linguagem, raciocínio e crenças — e como eles influenciam emoções e comportamento.",
    theorySlug: "terapia-cognitiva",
    theoryName: "Terapia Cognitiva",
    theoryDescription:
      "Modelo de Beck segundo o qual pensamentos automáticos distorcidos sobre si mesmo, o mundo e o futuro (a chamada 'tríade cognitiva') contribuem diretamente para transtornos emocionais como a depressão, e podem ser identificados e corrigidos em terapia.",
    theoryPeriodSlug: "revolucao-cognitiva",
    conceptSlug: "distorcoes-cognitivas",
    conceptName: "Distorções Cognitivas",
    conceptDefinition:
      "Padrões habituais de pensamento distorcido e pouco realista identificados por Beck — por exemplo, pensamento do tipo 'tudo ou nada', generalização excessiva ou catastrofização — que contribuem para o sofrimento emocional.",
    conceptDidactic:
      "Um exemplo de distorção do tipo 'tudo ou nada': uma pessoa que erra uma questão em uma prova e pensa 'sou um fracasso completo' — ignorando toda a evidência de acertos anteriores, e tratando um evento único como prova de uma regra absoluta.",
    workTitle:
      "Terapia Cognitiva dos Transtornos Emocionais (Cognitive Therapy and the Emotional Disorders)",
    workYear: 1976,
    workType: AcademicWorkType.LIVRO,
    questionPrompt:
      "Complete: segundo Aaron Beck, pensamentos automáticos como 'ou sou perfeito, ou sou um fracasso total' são exemplos de ____.",
    questionExplanation:
      "Beck descreveu esse tipo de pensamento extremo e pouco realista como uma distorção cognitiva — especificamente, o padrão 'tudo ou nada' — central em seu modelo da terapia cognitiva.",
    questionSpec: {
      kind: "FILL_BLANK",
      type: QuestionType.FILL_BLANK,
      blanks: [
        { accepted: ["distorção cognitiva", "distorções cognitivas", "uma distorção cognitiva"] },
      ],
    },
    lessonTitle: "Beck e as Distorções Cognitivas",
    introContent:
      "Nesta lição você vai conhecer a terapia cognitiva de Aaron Beck e o conceito de distorções cognitivas, hoje amplamente usado na Psicologia Clínica.",
    exampleContent:
      "Uma pessoa que recebe uma crítica no trabalho e pensa imediatamente 'vou ser demitida, minha carreira acabou' está catastrofizando — outro tipo comum de distorção cognitiva descrita por Beck.",
    conclusionContent:
      "Você concluiu a lição sobre as distorções cognitivas de Beck — um marco da chamada revolução cognitiva na Psicologia, com grande aplicação clínica até hoje.",
  },
  {
    personSlug: "abraham-maslow",
    personName: "Abraham Maslow",
    fullName: "Abraham Harold Maslow",
    birthDate: "1908-04-01",
    deathDate: "1970-06-08",
    countryContext: "Estados Unidos",
    bio: "Psicólogo estadunidense, um dos fundadores da psicologia humanista ao lado de Carl Rogers, conhecido sobretudo pela teoria da hierarquia das necessidades humanas, culminando na busca pela autorrealização.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Abraham_Maslow",
    periodSlug: "humanismo-periodo",
    schoolSlug: "humanismo",
    schoolName: "Humanismo",
    schoolDescription:
      "Corrente que enfatiza a capacidade de autodeterminação e crescimento do indivíduo, valorizando a experiência subjetiva e uma visão otimista sobre o potencial humano.",
    theorySlug: "teoria-da-hierarquia-das-necessidades",
    theoryName: "Teoria da Hierarquia das Necessidades",
    theoryDescription:
      "Modelo de Maslow que organiza as motivações humanas em uma hierarquia — necessidades fisiológicas, de segurança, de pertencimento, de estima e, no topo, de autorrealização —, propondo que necessidades mais básicas tendem a ser priorizadas antes das superiores.",
    theoryPeriodSlug: "humanismo-periodo",
    conceptSlug: "hierarquia-das-necessidades",
    conceptName: "Hierarquia das Necessidades e Autorrealização",
    conceptDefinition:
      "Modelo de Maslow que organiza as motivações humanas, da mais básica à mais elevada, em: necessidades fisiológicas, de segurança, de pertencimento/afeto, de estima e, no topo, de autorrealização — o pleno desenvolvimento do próprio potencial.",
    conceptDidactic:
      "Segundo Maslow, é difícil uma pessoa se dedicar plenamente à busca por autorrealização (o topo da hierarquia) enquanto necessidades mais básicas, como segurança ou fome, permanecem gravemente insatisfeitas.",
    workTitle: "Uma Teoria da Motivação Humana (A Theory of Human Motivation)",
    workYear: 1943,
    workType: AcademicWorkType.ARTIGO,
    questionPrompt:
      "Na hierarquia das necessidades de Maslow, a autorrealização ocupa a posição de:",
    questionExplanation:
      "Maslow colocou a autorrealização no topo da hierarquia — a busca por desenvolver plenamente o próprio potencial, que tende a ganhar mais espaço depois que necessidades mais básicas (fisiológicas, segurança, pertencimento, estima) estão razoavelmente satisfeitas.",
    questionSpec: {
      kind: "OPTIONS",
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { text: "O nível mais elevado, no topo da hierarquia", isCorrect: true },
        { text: "A base da hierarquia, junto às necessidades fisiológicas", isCorrect: false },
        { text: "Um estágio do desenvolvimento cognitivo infantil", isCorrect: false },
        { text: "Um mecanismo de defesa do ego", isCorrect: false },
      ],
    },
    lessonTitle: "Maslow e a Hierarquia das Necessidades",
    introContent:
      "Nesta lição você vai conhecer a teoria da hierarquia das necessidades de Abraham Maslow, um dos pilares da psicologia humanista ao lado da abordagem centrada na pessoa de Carl Rogers.",
    exampleContent:
      "Alguém preocupado em garantir comida e segurança básica dificilmente vai priorizar, naquele momento, projetos de autorrealização de longo prazo — só quando essas necessidades mais básicas estão razoavelmente atendidas é que a busca por autorrealização tende a ganhar mais espaço.",
    conclusionContent:
      "Você concluiu a lição sobre a hierarquia das necessidades de Maslow — um dos modelos mais conhecidos, dentro e fora da Psicologia, sobre motivação humana.",
  },
];

// ============================================================================
// Dados — 4 disciplinas interdisciplinares (definições enxutas, cada uma
// citando o verbete correspondente da Wikipédia em português — mesmo padrão
// usado para "Psicologia" na fase anterior) + relação real com Psicologia.
// ============================================================================

interface InterdisciplinarySeed {
  slug: string;
  name: string;
  description: string;
  wikipediaUrl: string;
  relationDescription: string;
}

const INTERDISCIPLINARY_DISCIPLINES: InterdisciplinarySeed[] = [
  {
    slug: "filosofia",
    name: "Filosofia",
    description:
      "Disciplina que investiga, por meio da reflexão racional e sistemática, questões fundamentais sobre conhecimento, existência, valores, linguagem e mente.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Filosofia",
    relationDescription:
      "A Psicologia surgiu historicamente como um desdobramento de questões filosóficas sobre a mente e o conhecimento (ver o período 'Antecedentes Filosóficos da Psicologia'), só se consolidando como ciência independente a partir de 1879.",
  },
  {
    slug: "sociologia",
    name: "Sociologia",
    description:
      "Ciência social que estuda a estrutura, o funcionamento e a transformação das sociedades humanas, incluindo instituições, grupos e relações sociais.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Sociologia",
    relationDescription:
      "A Psicologia Social — campo consolidado por autores como Kurt Lewin — investiga fenômenos (grupos, normas sociais, influência) que também são objeto de estudo da Sociologia, a partir de um ângulo mais centrado no indivíduo.",
  },
  {
    slug: "historia",
    name: "História",
    description:
      "Disciplina que estuda e interpreta o passado humano a partir de fontes e vestígios, buscando compreender a transformação das sociedades ao longo do tempo.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Hist%C3%B3ria",
    relationDescription:
      "A própria história da Psicologia — da fundação do laboratório de Wundt (1879) à regulamentação da profissão no Brasil (1962) — é reconstruída com os métodos e fontes próprios da disciplina histórica.",
  },
  {
    slug: "educacao",
    name: "Educação",
    description:
      "Campo que estuda os processos de ensino e aprendizagem e a formação humana, incluindo suas dimensões institucionais, sociais e psicológicas.",
    wikipediaUrl: "https://pt.wikipedia.org/wiki/Educa%C3%A7%C3%A3o",
    relationDescription:
      "Conceitos da Psicologia do Desenvolvimento e da Aprendizagem — como a zona de desenvolvimento proximal de Vygotsky — são amplamente aplicados no campo da Educação para orientar práticas de ensino.",
  },
];

// ============================================================================
// Dados — 17 tags reutilizáveis para descoberta de conteúdo (Módulo 2).
// ============================================================================

const TAGS: Array<{ slug: string; name: string }> = [
  { slug: "vestibular", name: "Vestibular" },
  { slug: "enem", name: "ENEM" },
  { slug: "historia-da-psicologia", name: "História da Psicologia" },
  { slug: "psicanalise", name: "Psicanálise" },
  { slug: "behaviorismo", name: "Behaviorismo" },
  { slug: "desenvolvimento", name: "Desenvolvimento" },
  { slug: "aprendizagem", name: "Aprendizagem" },
  { slug: "psicologia-social-tag", name: "Psicologia Social" },
  { slug: "genero", name: "Gênero" },
  { slug: "mulher", name: "Mulheres na Psicologia" },
  { slug: "clinica", name: "Clínica" },
  { slug: "saude", name: "Saúde" },
  { slug: "personalidade", name: "Personalidade" },
  { slug: "cognicao", name: "Cognição" },
  { slug: "neuropsicologia", name: "Neuropsicologia" },
  { slug: "psicologia-brasileira", name: "Psicologia Brasileira" },
  { slug: "gestalt", name: "Gestalt" },
];

// ============================================================================
// Dados — 2 itens de biblioteca gratuitos e verificadamente de domínio
// público (obras publicadas antes de 1928 — domínio público confirmado nos
// EUA — hospedadas por instituições reais: Project Gutenberg / Internet
// Archive).
// ============================================================================

const LIBRARY_ITEMS_V2 = [
  {
    workTitle: "Princípios de Psicologia (The Principles of Psychology)",
    personSlug: "william-james",
    title: "The Principles of Psychology, Volume 1",
    authorName: "William James",
    year: 1890,
    sourceName: "Project Gutenberg — The Principles of Psychology, Volume 1",
    sourceUrl: "https://www.gutenberg.org/ebooks/57628",
  },
  {
    workTitle:
      "Reflexos Condicionados: uma Investigação da Atividade Fisiológica do Córtex Cerebral (Conditioned Reflexes)",
    personSlug: "ivan-pavlov",
    title:
      "Conditioned Reflexes: An Investigation of the Physiological Activity of the Cerebral Cortex",
    authorName: "Ivan Pavlov",
    year: 1927,
    sourceName: "Internet Archive — Conditioned Reflexes (trad. G. V. Anrep, 1927)",
    sourceUrl: "https://archive.org/details/conditionedrefle00pavl",
  },
];

// ============================================================================
// Dados — 2 atualidades reais e datadas, com fonte oficial verificável.
// `eventDate` é a data do ACONTECIMENTO real, nunca `createdAt`.
// ============================================================================

const CURRENT_AFFAIRS_V2 = [
  {
    title: "OMS retira a incongruência de gênero do capítulo de transtornos mentais na CID-11",
    summary:
      "A 72ª Assembleia Mundial da Saúde adotou, em 25 de maio de 2019, a 11ª revisão da Classificação Internacional de Doenças (CID-11), que reclassifica a 'incongruência de gênero' para fora do capítulo de transtornos mentais, movendo-a para o capítulo de condições relativas à saúde sexual. A nova classificação entrou em vigor em 1º de janeiro de 2022.",
    educationalContent:
      "Relevante para a Avaliação Psicológica e para a Psicologia e Sociedade: mostra como sistemas de classificação diagnóstica (como a CID) são revisados ao longo do tempo à luz de evidências científicas, com impacto direto sobre políticas de saúde mental.",
    eventDate: "2019-05-25",
    relevance: CurrentAffairRelevance.HIGH,
    sourceName: "OMS — World Health Assembly Update (25 de maio de 2019)",
    sourceUrl: "https://www.who.int/news/item/25-05-2019-world-health-assembly-update",
    tagSlug: "genero",
  },
  {
    title: "CFP publica nova resolução sobre atendimento psicológico mediado por tecnologia",
    summary:
      "O Conselho Federal de Psicologia (CFP) publicou, em 11 de maio de 2018 (Diário Oficial da União de 14 de maio de 2018), a Resolução CFP nº 11/2018, ampliando e atualizando as regras para a prestação de serviços psicológicos por meios tecnológicos de comunicação a distância (atendimento on-line) no Brasil.",
    educationalContent:
      "Relevante para a Psicologia Brasileira e para a Psicologia Clínica: exemplifica como o exercício profissional da Psicologia no Brasil é regulamentado pelo Conselho Federal de Psicologia, mesmo órgão citado no marco histórico da Lei nº 4.119/1962.",
    eventDate: "2018-05-11",
    relevance: CurrentAffairRelevance.MODERATE,
    sourceName: "CFP — Resolução CFP nº 11, de 11 de maio de 2018",
    sourceUrl:
      "https://site.cfp.org.br/wp-content/uploads/2018/05/RESOLU%C3%87%C3%83O-N%C2%BA-11-DE-11-DE-MAIO-DE-2018.pdf",
    tagSlug: "psicologia-brasileira",
  },
];

// ============================================================================
// Helper — monta os campos `options`/`answerKey` de `createQuestion` a partir
// de um `QuestionSpec` (ver definição do tipo acima). Nenhuma regra de
// correção vive aqui — só formata a entrada no shape que
// `question.service.ts`/`answerGrading.ts` já esperam para cada tipo.
// ============================================================================

function buildQuestionFields(spec: QuestionSpec): {
  type: (typeof QuestionType)[keyof typeof QuestionType];
  options?: Array<{ text: string; isCorrect: boolean; order: number }>;
  answerKey?: Parameters<typeof createQuestion>[1]["answerKey"];
} {
  switch (spec.kind) {
    case "OPTIONS":
      return {
        type: spec.type,
        options: spec.options.map((o, i) => ({ ...o, order: i })),
      };
    case "ORDERING":
      return {
        type: spec.type,
        options: spec.itemsInOrder.map((text, i) => ({ text, isCorrect: false, order: i })),
      };
    case "MATCHING":
      return {
        type: spec.type,
        answerKey: { kind: "MATCHING", pairs: spec.pairs },
      };
    case "FILL_BLANK":
      return {
        type: spec.type,
        answerKey: { kind: "FILL_BLANK", blanks: spec.blanks },
      };
    case "SHORT_ANSWER":
      return {
        type: spec.type,
        answerKey: { kind: "SHORT_ANSWER", accepted: spec.accepted },
      };
  }
}

// ============================================================================
// main()
// ============================================================================

/**
 * Núcleo do povoamento de expansão — exportado para o teste de integração
 * chamar diretamente, mesmo padrão de `seedAcademicContent`. Idempotente
 * (helpers `ensure*` acima) — seguro chamar quantas vezes for preciso.
 */
export async function seedAcademicContentV2(actor: Actor) {
  const counts = {
    sources: 0,
    periods: 0,
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
    tags: 0,
    libraryItems: 0,
    currentAffairs: 0,
    tracks: 0,
  };

  const psicologia = await prisma.discipline.findUnique({ where: { slug: "psicologia" } });
  if (!psicologia) {
    throw new Error(
      "Discipline 'psicologia' não encontrada. Rode `npm run db:seed-academic` antes deste script.",
    );
  }

  const autoralSource = await ensureSource(actor, {
    name: "Conteúdo autoral — plataforma Estuda+",
    sourceType: "AUTORAL",
    classification: "DIDATICA",
    rightsNote:
      "Questão redigida originalmente pela equipe da plataforma para fins didáticos — não reproduz nenhuma prova oficial nem é atribuída a nenhuma banca/exame.",
  });
  counts.sources++;

  // --- 9 períodos históricos reais ---
  const periodIds: Record<string, string> = {};
  for (const p of PERIODS) {
    const period = await ensureHistoricalPeriod(actor, {
      slug: p.slug,
      name: p.name,
      startYear: p.startYear,
      endYear: p.endYear,
      description: p.description,
    });
    periodIds[p.slug] = period.id;
    counts.periods++;
  }

  // --- 14 novos psicólogos: Fonte → Pessoa → Escola → Teoria → Conceito →
  //     Obra → Questão autoral (tipo variável) → Lição → Etapa ---
  const personIds: Record<string, string> = {};
  const personCitationIds: Record<string, string> = {};
  const theoryIds: Record<string, string> = {};
  const conceptIds: Record<string, string> = {};
  const stageIds: Record<string, string> = {};

  for (const p of PSYCHOLOGISTS_V2) {
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
      periodId: p.periodSlug ? periodIds[p.periodSlug] : undefined,
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
    // Só conta escolas novas (uma School reaproveitada de v1, ex.: "behaviorismo",
    // não deve inflar a contagem desta fase) — soma o total real distinto no final.

    const theory = await ensureTheory(actor, {
      slug: p.theorySlug,
      name: p.theoryName,
      description: p.theoryDescription,
      originPeriodId: p.theoryPeriodSlug ? periodIds[p.theoryPeriodSlug] : undefined,
    });
    await ensureCitation(actor, CitationEntityType.THEORY, theory.id, wikiSource.id);
    await publishIfDraft(
      () => getTheory(theory.id),
      () => publishTheory(actor, theory.id),
    );
    await ensureLink(() => linkTheoryToSchool(actor, theory.id, school.id));
    theoryIds[p.personSlug] = theory.id;
    counts.theories++;

    const concept = await ensureConcept(actor, {
      slug: p.conceptSlug,
      name: p.conceptName,
      definition: p.conceptDefinition,
      didacticExplanation: p.conceptDidactic,
      difficulty: Difficulty.INTERMEDIARIO,
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
      type: p.workType,
    });
    await ensureAuthorOnWork(actor, person.id, work.id);
    await publishIfDraft(
      () => getAcademicWork(work.id),
      () => publishAcademicWork(actor, work.id),
    );
    counts.works++;

    const questionFields = buildQuestionFields(p.questionSpec);
    const question = await ensureQuestion(actor, {
      prompt: p.questionPrompt,
      type: questionFields.type,
      explanation: p.questionExplanation,
      difficulty: Difficulty.INTERMEDIARIO,
      sourceId: autoralSource.id,
      reproductionAllowed: true,
      options: questionFields.options,
      answerKey: questionFields.answerKey,
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
    stageIds[p.personSlug] = stage.id;
    counts.stages++;
  }

  // Contagem real de escolas DISTINTAS tocadas nesta fase (algumas são
  // reaproveitadas de v1 — não conta como "escola nova", mas confirma que
  // todas estão publicadas e ligadas à Discipline).
  const distinctSchoolSlugs = new Set(PSYCHOLOGISTS_V2.map((p) => p.schoolSlug));
  counts.schools = distinctSchoolSlugs.size;

  // --- Pessoas/teorias da fase anterior (v1), buscadas pelo slug natural —
  //     reaproveitadas aqui só para LER seus ids reais, nunca recriadas. ---
  const freudV1 = await prisma.academicPerson.findUniqueOrThrow({
    where: { slug: "sigmund-freud" },
  });
  const [teoriaPsicanaliticaV1, epistemologiaGeneticaV1, abordagemCentradaNaPessoaV1] =
    await Promise.all([
      prisma.theory.findUniqueOrThrow({ where: { slug: "teoria-psicanalitica" } }),
      prisma.theory.findUniqueOrThrow({ where: { slug: "epistemologia-genetica" } }),
      prisma.theory.findUniqueOrThrow({ where: { slug: "abordagem-centrada-na-pessoa" } }),
    ]);

  // --- 7 relações acadêmicas reais (pessoa↔pessoa e teoria↔pessoa),
  //     conectando o conteúdo desta fase ao conteúdo real já existente ---
  async function ensureAndPublishRelation(input: Parameters<typeof createAcademicRelation>[1]) {
    const rel = await ensureAcademicRelation(actor, input);
    if (rel.status !== PublicationStatus.PUBLISHED) await publishAcademicRelation(actor, rel.id);
    counts.relations++;
    return rel;
  }

  await ensureAndPublishRelation({
    sourceType: KnowledgeEntityType.PERSON,
    sourceId: personIds["ivan-pavlov"],
    relationType: "INFLUENCIOU",
    targetType: KnowledgeEntityType.PERSON,
    targetId: personIds["john-b-watson"],
    description:
      "Watson se apoiou nos experimentos de condicionamento de Pavlov como uma das bases empíricas do behaviorismo, ao propor restringir a Psicologia ao comportamento observável.",
    citationId: personCitationIds["john-b-watson"],
  });

  await ensureAndPublishRelation({
    sourceType: KnowledgeEntityType.PERSON,
    sourceId: freudV1.id,
    relationType: "INFLUENCIOU",
    targetType: KnowledgeEntityType.PERSON,
    targetId: personIds["anna-freud"],
    description:
      "Sigmund Freud influenciou diretamente sua filha Anna Freud, que sistematizou e expandiu a psicanálise para o estudo do ego e da infância.",
    citationId: personCitationIds["anna-freud"],
  });

  await ensureAndPublishRelation({
    sourceType: KnowledgeEntityType.PERSON,
    sourceId: freudV1.id,
    relationType: "INFLUENCIOU",
    targetType: KnowledgeEntityType.PERSON,
    targetId: personIds["melanie-klein"],
    description:
      "Melanie Klein desenvolveu sua obra a partir da tradição psicanalítica fundada por Freud, embora tenha deslocado o foco para as relações objetais na primeiríssima infância.",
    citationId: personCitationIds["melanie-klein"],
  });

  await ensureAndPublishRelation({
    sourceType: KnowledgeEntityType.PERSON,
    sourceId: personIds["melanie-klein"],
    relationType: "INFLUENCIOU",
    targetType: KnowledgeEntityType.PERSON,
    targetId: personIds["donald-winnicott"],
    description:
      "Donald Winnicott se formou dentro da tradição britânica de relações objetais iniciada por Melanie Klein, ainda que tenha desenvolvido conceitos próprios e distintos, como o objeto transicional.",
    citationId: personCitationIds["donald-winnicott"],
  });

  await ensureAndPublishRelation({
    sourceType: KnowledgeEntityType.THEORY,
    sourceId: teoriaPsicanaliticaV1.id,
    relationType: "CRITICADA_POR",
    targetType: KnowledgeEntityType.PERSON,
    targetId: personIds["karen-horney"],
    description:
      "Karen Horney criticou, de dentro da tradição psicanalítica, o que considerava vieses masculinos na teoria freudiana sobre o desenvolvimento psicológico das mulheres (ex.: 'inveja do pênis').",
    citationId: personCitationIds["karen-horney"],
  });

  await ensureAndPublishRelation({
    sourceType: KnowledgeEntityType.THEORY,
    sourceId: epistemologiaGeneticaV1.id,
    relationType: "CRITICADA_POR",
    targetType: KnowledgeEntityType.PERSON,
    targetId: personIds["lev-vygotsky"],
    description:
      "Vygotsky publicou uma crítica direta à teoria de Piaget sobre a linguagem e o pensamento infantil, propondo em seu lugar uma explicação sociocultural do desenvolvimento cognitivo.",
    citationId: personCitationIds["lev-vygotsky"],
  });

  await ensureAndPublishRelation({
    sourceType: KnowledgeEntityType.THEORY,
    sourceId: abordagemCentradaNaPessoaV1.id,
    relationType: "RELACIONADO_A",
    targetType: KnowledgeEntityType.THEORY,
    targetId: theoryIds["abraham-maslow"],
    description:
      "A abordagem centrada na pessoa de Rogers e a teoria da hierarquia das necessidades de Maslow são os dois pilares mais citados da psicologia humanista ('terceira força'), desenvolvidos de forma próxima e mutuamente referenciada.",
    citationId: personCitationIds["abraham-maslow"],
  });

  // --- 4 disciplinas interdisciplinares + relação real com Psicologia ---
  for (const d of INTERDISCIPLINARY_DISCIPLINES) {
    const wikiSource = await ensureSource(actor, {
      name: `Wikipédia — ${d.name}`,
      sourceType: "EXTERNA",
      classification: "SECUNDARIA",
      url: d.wikipediaUrl,
      institution: "Wikimedia Foundation",
    });
    counts.sources++;

    const discipline = await ensureDiscipline(actor, {
      slug: d.slug,
      name: d.name,
      description: d.description,
    });
    const disciplineCitation = await ensureCitation(
      actor,
      CitationEntityType.DISCIPLINE,
      discipline.id,
      wikiSource.id,
    );
    await publishIfDraft(
      () => getDiscipline(discipline.id),
      () => publishDiscipline(actor, discipline.id),
    );
    counts.disciplines++;

    await ensureAndPublishRelation({
      sourceType: KnowledgeEntityType.DISCIPLINE,
      sourceId: psicologia.id,
      relationType: "RELACIONADO_A",
      targetType: KnowledgeEntityType.DISCIPLINE,
      targetId: discipline.id,
      description: d.relationDescription,
      citationId: disciplineCitation.id,
    });
  }

  // --- Escola "Gestalt" — histórico relevante (rule 9), sem vertical
  //     completa de pessoa/conceito/questão/lição nesta fase (ver limitações
  //     no relatório final) ---
  const gestaltWikiSource = await ensureSource(actor, {
    name: "Wikipédia — Gestalt (psicologia)",
    sourceType: "EXTERNA",
    classification: "SECUNDARIA",
    url: "https://pt.wikipedia.org/wiki/Gestalt",
    institution: "Wikimedia Foundation",
  });
  counts.sources++;
  const gestaltSchool = await ensureSchool(actor, {
    slug: "gestalt",
    name: "Gestalt",
    description:
      "Corrente fundada em 1912 por Max Wertheimer, com Wolfgang Köhler e Kurt Koffka, segundo a qual a percepção organiza estímulos em totalidades ('Gestalten') com propriedades próprias, não redutíveis à soma de elementos isolados — crítica direta ao estruturalismo de Wundt.",
  });
  await ensureCitation(actor, CitationEntityType.SCHOOL, gestaltSchool.id, gestaltWikiSource.id);
  await publishIfDraft(
    () => getSchool(gestaltSchool.id),
    () => publishSchool(actor, gestaltSchool.id),
  );
  await ensureLink(() => linkSchoolToDiscipline(actor, gestaltSchool.id, psicologia.id));

  // --- 17 tags reutilizáveis, com vínculos reais a pessoas/conceitos onde
  //     há relevância clara (não vinculadas "porque sim") ---
  const tagIds: Record<string, string> = {};
  for (const t of TAGS) {
    const tag = await ensureTag(actor, { slug: t.slug, name: t.name });
    tagIds[t.slug] = tag.id;
    counts.tags++;
  }

  const conceptTagLinks: Array<[string, string]> = [
    ["melanie-klein", "psicanalise"],
    ["anna-freud", "psicanalise"],
    ["donald-winnicott", "psicanalise"],
    ["karen-horney", "psicanalise"],
    ["karen-horney", "personalidade"],
    ["melanie-klein", "personalidade"],
    ["donald-winnicott", "personalidade"],
    ["john-b-watson", "behaviorismo"],
    ["ivan-pavlov", "behaviorismo"],
    ["ivan-pavlov", "aprendizagem"],
    ["lev-vygotsky", "desenvolvimento"],
    ["lev-vygotsky", "aprendizagem"],
    ["erik-erikson", "desenvolvimento"],
    ["mary-ainsworth", "desenvolvimento"],
    ["kurt-lewin", "psicologia-social-tag"],
    ["aaron-beck", "cognicao"],
    ["aaron-beck", "clinica"],
    ["wilhelm-wundt", "cognicao"],
    ["wilhelm-wundt", "historia-da-psicologia"],
    ["william-james", "historia-da-psicologia"],
    ["william-james", "cognicao"],
  ];
  for (const [personSlug, tagSlug] of conceptTagLinks) {
    await ensureLink(() => linkConceptToTag(actor, conceptIds[personSlug], tagIds[tagSlug]));
  }

  const personTagLinks: Array<[string, string]> = [
    ["melanie-klein", "mulher"],
    ["anna-freud", "mulher"],
    ["karen-horney", "mulher"],
    ["karen-horney", "genero"],
    ["mary-ainsworth", "mulher"],
    ["wilhelm-wundt", "historia-da-psicologia"],
    ["william-james", "historia-da-psicologia"],
    ["john-b-watson", "historia-da-psicologia"],
    ["ivan-pavlov", "historia-da-psicologia"],
  ];
  for (const [personSlug, tagSlug] of personTagLinks) {
    await ensureLink(() => linkPersonToTag(actor, personIds[personSlug], tagIds[tagSlug]));
  }

  // --- 2 itens de biblioteca gratuitos, de domínio público verificado ---
  for (const item of LIBRARY_ITEMS_V2) {
    const work = await prisma.academicWork.findFirstOrThrow({ where: { title: item.workTitle } });
    const source = await ensureSource(actor, {
      name: item.sourceName,
      sourceType: "OFICIAL",
      classification: "PRIMARIA",
      url: item.sourceUrl,
      institution: item.sourceUrl.includes("gutenberg") ? "Project Gutenberg" : "Internet Archive",
      license: "Public Domain (US)",
    });
    counts.sources++;

    const libraryItem = await ensureLibraryItem(actor, {
      title: item.title,
      authorName: item.authorName,
      academicWorkId: work.id,
      materialType: LibraryMaterialType.EBOOK,
      language: "en",
      year: item.year,
      isFree: true,
      freeAccessReason: FreeAccessReason.PUBLIC_DOMAIN,
      sourceId: source.id,
    });
    await ensureLink(() =>
      linkLibraryItemToKnowledge(actor, libraryItem.id, {
        entityType: KnowledgeEntityType.CONCEPT,
        entityId: conceptIds[item.personSlug],
      }),
    );
    await publishIfDraft(
      () => prisma.libraryItem.findUnique({ where: { id: libraryItem.id } }),
      () => publishLibraryItem(actor, libraryItem.id),
    );
    counts.libraryItems++;
  }

  // --- 2 atualidades reais e datadas ---
  for (const affair of CURRENT_AFFAIRS_V2) {
    const source = await ensureSource(actor, {
      name: affair.sourceName,
      sourceType: "OFICIAL",
      classification: "OFICIAL",
      url: affair.sourceUrl,
    });
    counts.sources++;

    const currentAffair = await ensureCurrentAffair(actor, {
      title: affair.title,
      summary: affair.summary,
      educationalContent: affair.educationalContent,
      eventDate: affair.eventDate,
      relevance: affair.relevance,
      sourceId: source.id,
    });
    await ensureLink(() => linkCurrentAffairToTag(actor, currentAffair.id, tagIds[affair.tagSlug]));
    // Vínculo com a Base de Conhecimento (Discipline "Psicologia") — exigido
    // pela regra de publicação de `CurrentAffair` (ao menos um relacionamento
    // com a Base de Conhecimento) e feito ANTES de publicar, nunca depois.
    // Ambas as atualidades tratam de classificação/regulamentação da própria
    // Psicologia, não de um conceito clínico específico já modelado — daí o
    // vínculo ser com a Discipline, não com um Concept.
    await ensureLink(() =>
      linkCurrentAffairToKnowledge(actor, currentAffair.id, {
        entityType: KnowledgeEntityType.DISCIPLINE,
        entityId: psicologia.id,
      }),
    );
    await publishIfDraft(
      () => prisma.currentAffair.findUnique({ where: { id: currentAffair.id } }),
      () => publishCurrentAffair(actor, currentAffair.id),
    );
    counts.currentAffairs++;
  }

  // --- Árvore pedagógica: 8 novas trilhas, reaproveitando os Stages novos
  //     E os 6 Stages já publicados na fase anterior (N:N real, nenhuma
  //     lição duplicada) ---
  async function getV1StageId(lessonTitle: string): Promise<string> {
    const stage = await prisma.stage.findFirstOrThrow({ where: { name: lessonTitle } });
    return stage.id;
  }

  const freudStageId = await getV1StageId("Freud e o Inconsciente");
  const jungStageId = await getV1StageId("Jung e os Arquétipos");
  const skinnerStageId = await getV1StageId("Skinner e o Condicionamento Operante");
  const piagetStageId = await getV1StageId("Piaget e os Estágios do Desenvolvimento");
  const rogersStageId = await getV1StageId("Rogers e a Autorrealização");
  const banduraStageId = await getV1StageId("Bandura e a Autoeficácia");

  interface TrackPlan {
    trackSlug: string;
    trackName: string;
    areaSlug: string;
    areaName: string;
    unitName: string;
    stageIdsForUnit: string[];
  }

  const trackPlans: TrackPlan[] = [
    {
      trackSlug: "historia-da-psicologia",
      trackName: "História da Psicologia",
      areaSlug: "historia-da-psicologia",
      areaName: "História da Psicologia",
      unitName: "Fundadores da Psicologia Científica e suas Escolas",
      stageIdsForUnit: [
        stageIds["wilhelm-wundt"],
        stageIds["william-james"],
        stageIds["john-b-watson"],
        stageIds["ivan-pavlov"],
      ],
    },
    {
      trackSlug: "psicanalise",
      trackName: "Psicanálise",
      areaSlug: "psicanalise",
      areaName: "Psicanálise: Fundação e Desenvolvimentos",
      unitName: "Psicanálise Além de Freud: Novos Desenvolvimentos",
      stageIdsForUnit: [
        freudStageId,
        jungStageId,
        stageIds["melanie-klein"],
        stageIds["anna-freud"],
        stageIds["donald-winnicott"],
        stageIds["karen-horney"],
      ],
    },
    {
      trackSlug: "psicologia-do-desenvolvimento",
      trackName: "Psicologia do Desenvolvimento",
      areaSlug: "psicologia-do-desenvolvimento",
      areaName: "Psicologia do Desenvolvimento",
      unitName: "Desenvolvimento Humano: da Infância à Identidade",
      stageIdsForUnit: [
        piagetStageId,
        stageIds["lev-vygotsky"],
        stageIds["erik-erikson"],
        stageIds["mary-ainsworth"],
      ],
    },
    {
      trackSlug: "psicologia-social",
      trackName: "Psicologia Social",
      areaSlug: "psicologia-social",
      areaName: "Psicologia Social",
      unitName: "Dinâmica de Grupos e Comportamento Social",
      stageIdsForUnit: [stageIds["kurt-lewin"]],
    },
    {
      trackSlug: "psicologia-cognitiva",
      trackName: "Psicologia Cognitiva",
      areaSlug: "psicologia-cognitiva",
      areaName: "Psicologia Cognitiva",
      unitName: "Cognição e Terapias Cognitivas",
      stageIdsForUnit: [stageIds["aaron-beck"]],
    },
    {
      trackSlug: "behaviorismo-e-aprendizagem",
      trackName: "Behaviorismo e Aprendizagem",
      areaSlug: "behaviorismo-e-aprendizagem",
      areaName: "Behaviorismo e Aprendizagem",
      unitName: "Condicionamento e Aprendizagem",
      stageIdsForUnit: [
        stageIds["ivan-pavlov"],
        stageIds["john-b-watson"],
        skinnerStageId,
        banduraStageId,
      ],
    },
    {
      trackSlug: "psicologia-humanista",
      trackName: "Psicologia Humanista",
      areaSlug: "psicologia-humanista",
      areaName: "Psicologia Humanista",
      unitName: "Humanismo: Potencial e Autorrealização",
      stageIdsForUnit: [rogersStageId, stageIds["abraham-maslow"]],
    },
    {
      trackSlug: "psicologia-genero-e-sociedade",
      trackName: "Psicologia, Gênero e Sociedade",
      areaSlug: "psicologia-genero-e-sociedade",
      areaName: "Psicologia, Gênero e Sociedade",
      unitName: "Psicologia, Gênero e Sociedade: Vozes e Contribuições",
      stageIdsForUnit: [
        stageIds["karen-horney"],
        stageIds["melanie-klein"],
        stageIds["anna-freud"],
        stageIds["mary-ainsworth"],
      ],
    },
  ];

  for (const plan of trackPlans) {
    const unit = await ensureUnit(actor, {
      name: plan.unitName,
      primaryDisciplineId: psicologia.id,
    });
    for (const stageId of plan.stageIdsForUnit) {
      await ensureLink(() => linkUnitToStage(actor, unit.id, { stageId }));
    }
    await publishIfDraft(
      () => prisma.unit.findUnique({ where: { id: unit.id } }),
      () => publishUnit(actor, unit.id),
    );

    const area = await ensureLearningArea(actor, { slug: plan.areaSlug, name: plan.areaName });
    await ensureLink(() => linkAreaToUnit(actor, area.id, { unitId: unit.id }));
    await publishIfDraft(
      () => prisma.learningArea.findUnique({ where: { id: area.id } }),
      () => publishLearningArea(actor, area.id),
    );

    const track = await ensureTrack(actor, {
      slug: plan.trackSlug,
      name: plan.trackName,
      mode: StudyMode.FORMACAO,
    });
    await ensureLink(() => linkTrackToArea(actor, track.id, { areaId: area.id }));
    await publishIfDraft(
      () => prisma.track.findUnique({ where: { id: track.id } }),
      () => publishTrack(actor, track.id),
    );
    counts.tracks++;
  }

  return counts;
}

/**
 * Entrada de CLI (`npm run db:seed-academic-v2`).
 */
async function runFromCli() {
  const actor = await resolveSeedActor();
  console.log(`[seed-academic-content-v2] rodando como ADMIN userId=${actor.userId}`);
  const counts = await seedAcademicContentV2(actor);
  console.log("[seed-academic-content-v2] concluído:");
  console.log(JSON.stringify(counts, null, 2));
}

const isDirectRun = !!process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  runFromCli()
    .catch((err) => {
      console.error("[seed-academic-content-v2] falhou:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
