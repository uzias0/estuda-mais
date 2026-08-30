import { z } from "zod";
import { CitationEntityType } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "./zod-enum";

/**
 * `CitationEntityType` — conjunto fechado de entidades que podem RECEBER uma
 * citação. Deliberadamente distinto de `KnowledgeEntityType` (nós do grafo):
 * inclui `QUESTION`/`LESSON`/`EXAM_EDITION`/`ACADEMIC_RELATION`, que não são
 * nós de conhecimento. Ver docs/RELATORIO_REVISAO_V3.md, seção 9 (v3) /
 * seção 6 do relatório para a política completa. NÃO reutilizar
 * `KnowledgeEntityType` aqui — é exatamente a confusão que a v3 corrigiu.
 */
export const CitationEntityTypeSchema = zodEnumFromPrisma(CitationEntityType);

/**
 * Entrada para criar uma `Citation`. `entityId` não tem FK nativa (polimórfico
 * via `entityType`) — validação de existência é responsabilidade do serviço
 * de curadoria (fora do escopo da Fundação Técnica), não deste schema.
 */
export const CitationCreateInputSchema = z.object({
  entityType: CitationEntityTypeSchema,
  entityId: z.string().min(1),
  sourceId: z.string().min(1),
  note: z.string().max(1000).optional(),
});
export type CitationCreateInput = z.infer<typeof CitationCreateInputSchema>;

/**
 * Entrada para atualizar uma Citation — só `note` é editável. `entityType`/
 * `entityId`/`sourceId` definem a própria identidade da citação (qual fonte
 * embasa qual entidade); mudar isso é, na prática, criar outra citação, não
 * editar esta.
 */
export const CitationUpdateInputSchema = z.object({
  note: z.string().max(1000).nullable(),
});
export type CitationUpdateInput = z.infer<typeof CitationUpdateInputSchema>;
