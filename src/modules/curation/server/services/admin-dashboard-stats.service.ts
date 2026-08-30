/**
 * Consulta mínima de agregação para o dashboard administrativo (Módulo 12,
 * seção 4 do prompt: "Se determinada métrica não tiver serviço apropriado,
 * criar somente uma consulta mínima e reutilizável"). Não é uma regra de
 * negócio nova — só CONTA linhas que os serviços de domínio (Módulos 2-7) já
 * criam/gerenciam, usando os mesmos filtros de status que cada serviço já
 * respeita (`PublicationStatus`/`Question.reviewStatus`). Nenhum número é
 * inventado: tudo vem de `prisma.<model>.groupBy(...)`/`count(...)` reais
 * contra o banco.
 *
 * "Itens sem procedência suficiente" reaproveita a MESMA regra de gate que
 * `assertPublishable` (Módulo 2, `publicationPolicy.ts`) já aplica — conta
 * quantas entidades das 5 gated por Citation (Concept/Discipline/School/
 * Theory/AcademicPerson) ainda não têm nenhuma `Citation` e por isso não
 * publicariam se alguém tentasse agora. Não reimplementa a regra (não decide
 * nada, não bloqueia nada) — só espelha, para leitura, o mesmo critério que
 * o serviço de publicação já usa.
 */
import { prisma } from "@/server/db";
import { PublicationStatus, CitationEntityType } from "@/generated/prisma/enums";

type CountByStatus = { draft: number; published: number; archived: number; total: number };
type PublicationStatusValue = (typeof PublicationStatus)[keyof typeof PublicationStatus];

type GroupByRow = { status: PublicationStatusValue; _count: { _all: number } };

/**
 * Recebe o RESULTADO (já chamado) de um `prisma.<model>.groupBy({ by:
 * ["status"], _count: { _all: true } })` — UMA consulta atômica por
 * entidade, não 4 `count()` separados.
 *
 * Correção de causa real (não só de teste): a versão anterior fazia
 * `count({where:{status:DRAFT}})`/`PUBLISHED`/`ARCHIVED`/`count()` (total)
 * como 4 queries independentes via `Promise.all` — cada uma vê seu próprio
 * snapshot do Postgres (read-committed, sem transação compartilhada). Uma
 * mutação real (ex.: `publishConcept`) executando entre duas dessas 4
 * queries podia produzir `total !== draft+published+archived` mesmo em
 * produção, não só sob teste paralelo — um bug latente de consistência do
 * próprio dashboard, descoberto pela suíte de testes deste módulo (ver
 * `admin-dashboard-stats.service.test.ts`). `groupBy` resolve tudo em UMA
 * consulta, sempre internamente consistente.
 *
 * O parâmetro recebe o resultado já `await`ado (não uma função) e com um
 * `as unknown as GroupByRow[]` no call site — o tipo de retorno de
 * `groupBy` do Prisma 7 é um condicional elaborado o bastante para não
 * unificar de forma simples com esta interface própria; a forma da linha
 * (`{status, _count:{_all}}`) é exatamente o que `by:["status"],
 * _count:{_all:true}` sempre devolve, então a asserção é segura.
 */
function summarizeGroups(groups: GroupByRow[]): CountByStatus {
  const countOf = (status: PublicationStatusValue) =>
    groups.find((g) => g.status === status)?._count._all ?? 0;
  return {
    draft: countOf(PublicationStatus.DRAFT),
    published: countOf(PublicationStatus.PUBLISHED),
    archived: countOf(PublicationStatus.ARCHIVED),
    total: groups.reduce((sum, g) => sum + g._count._all, 0),
  };
}

/**
 * Conta, para um dos 5 tipos gated por Citation, quantas entidades ainda não
 * publicadas/arquivadas não têm nenhuma `Citation` associada — mesmo
 * critério de `assertPublishable`/`hasCitation` (Módulo 2), só para leitura.
 */
async function countMissingCitation(
  entityType: (typeof CitationEntityType)[keyof typeof CitationEntityType],
  findPendingIds: () => Promise<{ id: string }[]>,
): Promise<number> {
  const pending = await findPendingIds();
  if (pending.length === 0) return 0;
  const cited = await prisma.citation.findMany({
    where: { entityType, entityId: { in: pending.map((p) => p.id) } },
    select: { entityId: true },
    distinct: ["entityId"],
  });
  const citedIds = new Set(cited.map((c) => c.entityId));
  return pending.filter((p) => !citedIds.has(p.id)).length;
}

function notPublishedOrArchived(): { notIn: PublicationStatusValue[] } {
  return { notIn: [PublicationStatus.PUBLISHED, PublicationStatus.ARCHIVED] };
}

export interface AdminDashboardStats {
  concepts: CountByStatus;
  theories: CountByStatus;
  disciplines: CountByStatus;
  schools: CountByStatus;
  people: CountByStatus;
  works: CountByStatus;
  questions: CountByStatus;
  examEditions: CountByStatus;
  lessons: CountByStatus;
  tracks: CountByStatus;
  libraryItems: CountByStatus;
  currentAffairs: CountByStatus;
  /** Somatório de draft/published/archived de todas as entidades curadas acima. */
  totals: { draft: number; published: number; archived: number; total: number };
  /** Entidades (das 5 gated por Citation) sem nenhuma Citation — não publicáveis hoje. */
  missingProvenance: number;
  /** DRAFT com >=1 Citation já associada — prontas para publicação, aguardando ação do ADMIN. */
  awaitingPublication: number;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const rawGroups = (await Promise.all([
    prisma.concept.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.theory.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.discipline.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.school.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.academicPerson.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.academicWork.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lesson.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.track.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.libraryItem.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.currentAffair.groupBy({ by: ["status"], _count: { _all: true } }),
  ])) as unknown as GroupByRow[][];

  const [
    concepts,
    theories,
    disciplines,
    schools,
    people,
    works,
    lessons,
    tracks,
    libraryItems,
    currentAffairs,
  ] = rawGroups.map(summarizeGroups);

  // Question usa `reviewStatus`, não `status` — mesmo princípio (1 groupBy).
  const questionGroups = (await prisma.question.groupBy({
    by: ["reviewStatus"],
    _count: { _all: true },
  })) as unknown as { reviewStatus: PublicationStatusValue; _count: { _all: number } }[];
  const countQuestionsBy = (status: PublicationStatusValue) =>
    questionGroups.find((g) => g.reviewStatus === status)?._count._all ?? 0;
  const questions: CountByStatus = {
    draft: countQuestionsBy(PublicationStatus.DRAFT),
    published: countQuestionsBy(PublicationStatus.PUBLISHED),
    archived: countQuestionsBy(PublicationStatus.ARCHIVED),
    total: questionGroups.reduce((sum, g) => sum + g._count._all, 0),
  };

  const examEditionGroups = (await prisma.examEdition.groupBy({
    by: ["status"],
    _count: { _all: true },
  })) as unknown as GroupByRow[];
  const examEditions = summarizeGroups(examEditionGroups);

  const totals = [
    concepts,
    theories,
    disciplines,
    schools,
    people,
    works,
    questions,
    examEditions,
    lessons,
    tracks,
    libraryItems,
    currentAffairs,
  ].reduce(
    (acc, c) => ({
      draft: acc.draft + c.draft,
      published: acc.published + c.published,
      archived: acc.archived + c.archived,
      total: acc.total + c.total,
    }),
    { draft: 0, published: 0, archived: 0, total: 0 },
  );

  const [missingConcept, missingDiscipline, missingSchool, missingTheory, missingPerson] =
    await Promise.all([
      countMissingCitation(CitationEntityType.CONCEPT, () =>
        prisma.concept.findMany({
          where: { status: notPublishedOrArchived() },
          select: { id: true },
        }),
      ),
      countMissingCitation(CitationEntityType.DISCIPLINE, () =>
        prisma.discipline.findMany({
          where: { status: notPublishedOrArchived() },
          select: { id: true },
        }),
      ),
      countMissingCitation(CitationEntityType.SCHOOL, () =>
        prisma.school.findMany({
          where: { status: notPublishedOrArchived() },
          select: { id: true },
        }),
      ),
      countMissingCitation(CitationEntityType.THEORY, () =>
        prisma.theory.findMany({
          where: { status: notPublishedOrArchived() },
          select: { id: true },
        }),
      ),
      countMissingCitation(CitationEntityType.PERSON, () =>
        prisma.academicPerson.findMany({
          where: { status: notPublishedOrArchived() },
          select: { id: true },
        }),
      ),
    ]);
  const missingProvenance =
    missingConcept + missingDiscipline + missingSchool + missingTheory + missingPerson;

  const draftGatedTotal =
    concepts.draft + disciplines.draft + schools.draft + theories.draft + people.draft;
  const awaitingPublication = Math.max(0, draftGatedTotal - missingProvenance);

  return {
    concepts,
    theories,
    disciplines,
    schools,
    people,
    works,
    questions,
    examEditions,
    lessons,
    tracks,
    libraryItems,
    currentAffairs,
    totals,
    missingProvenance,
    awaitingPublication,
  };
}
