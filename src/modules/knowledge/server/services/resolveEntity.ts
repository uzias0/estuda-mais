/**
 * Resolução de entidade polimórfica da Base de Conhecimento.
 *
 * `AcademicRelation.sourceId/targetId`, `QuestionKnowledgeTag.entityId` e
 * `LessonKnowledgeTag.entityId` guardam um `KnowledgeEntityType` + um `id`
 * sem FK nativa (docs/RELATORIO_REVISAO_V3.md, seções 4/5/7) — o Postgres
 * não garante que esse `id` exista na tabela correspondente. Esta é a
 * fundação da validação de aplicação que cobre essa lacuna.
 *
 * Este módulo NÃO implementa toda a lógica de negócio futura (ex.: o job de
 * auditoria periódico, ou a regra completa de "só publica relação se ambos
 * os nós estiverem >= APPROVED" — essa regra pertence ao módulo de
 * curadoria). Aqui existe só a fundação: resolver um nó dado seu tipo+id, e
 * um atalho para checar existência.
 */
import { prisma } from "@/server/db";
import { KnowledgeEntityType } from "@/generated/prisma/enums";
import type {
  AcademicPerson,
  AcademicWork,
  Theory,
  Concept,
  School,
  Discipline,
  HistoricalPeriod,
  DevelopmentalStage,
} from "@/generated/prisma/client";

/** União de todas as entidades que um nó do grafo de conhecimento pode ser. */
export type ResolvedKnowledgeEntity =
  | AcademicPerson
  | AcademicWork
  | Theory
  | Concept
  | School
  | Discipline
  | HistoricalPeriod
  | DevelopmentalStage;

/**
 * Tabela de resolução: cada `KnowledgeEntityType` mapeia para a função que
 * busca aquele nó por id no Prisma. Adicionar um novo tipo de nó no futuro
 * = adicionar uma entrada aqui (e no enum `KnowledgeEntityType` do schema).
 */
const RESOLVERS: {
  [K in keyof typeof KnowledgeEntityType]: (id: string) => Promise<ResolvedKnowledgeEntity | null>;
} = {
  PERSON: (id) => prisma.academicPerson.findUnique({ where: { id } }),
  WORK: (id) => prisma.academicWork.findUnique({ where: { id } }),
  THEORY: (id) => prisma.theory.findUnique({ where: { id } }),
  CONCEPT: (id) => prisma.concept.findUnique({ where: { id } }),
  SCHOOL: (id) => prisma.school.findUnique({ where: { id } }),
  DISCIPLINE: (id) => prisma.discipline.findUnique({ where: { id } }),
  PERIOD: (id) => prisma.historicalPeriod.findUnique({ where: { id } }),
  DEVELOPMENTAL_STAGE: (id) => prisma.developmentalStage.findUnique({ where: { id } }),
};

/** Tipos de nó reconhecidos por este serviço — usado pelos testes (item 8, seção 17). */
export const SUPPORTED_KNOWLEDGE_ENTITY_TYPES = Object.keys(RESOLVERS) as Array<
  keyof typeof KnowledgeEntityType
>;

/**
 * Resolve um nó do grafo de conhecimento a partir do seu `type` + `id`.
 * Retorna `null` se o tipo não for reconhecido OU se o `id` não existir —
 * quem chama decide se isso é um erro (ex.: ao publicar uma AcademicRelation)
 * ou apenas "ainda não existe" (ex.: numa tela de busca).
 */
export async function resolveEntity(
  type: string,
  id: string,
): Promise<ResolvedKnowledgeEntity | null> {
  const resolver = RESOLVERS[type as keyof typeof KnowledgeEntityType];
  if (!resolver) return null;
  return resolver(id);
}

/** Atalho: `true` se `type`+`id` resolve para um nó existente. */
export async function entityExists(type: string, id: string): Promise<boolean> {
  return (await resolveEntity(type, id)) !== null;
}
