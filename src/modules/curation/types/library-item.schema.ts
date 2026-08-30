import { z } from "zod";
import { LibraryMaterialType, FreeAccessReason } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";
import { KnowledgeEntityTypeSchema } from "@/modules/knowledge/types/academic-relation.schema";

export const LibraryMaterialTypeSchema = zodEnumFromPrisma(LibraryMaterialType);
export const FreeAccessReasonSchema = zodEnumFromPrisma(FreeAccessReason);

/**
 * Entrada para criar um `LibraryItem` (Módulo 7, seção 5/6). `isFree=true`
 * exige `freeAccessReason` — nunca aceitar gratuidade sem justificativa
 * rastreável. `sourceId` é sempre obrigatório (procedência — seção 7),
 * mesmo padrão de `Question.sourceId` (Módulo 3): FK direta, não o gate de
 * Citation usado por Concept/Theory/School/Discipline/Person/Lesson.
 */
export const LibraryItemCreateInputSchema = z
  .object({
    title: z.string().min(1).max(300),
    description: z.string().max(4000).optional(),
    authorName: z.string().max(300).optional(),
    academicWorkId: z.string().min(1).optional(),
    materialType: LibraryMaterialTypeSchema,
    language: z.string().max(20).optional(),
    year: z.number().int().min(1000).max(2100).optional(),
    isFree: z.boolean().default(false),
    freeAccessReason: FreeAccessReasonSchema.optional(),
    sourceId: z.string().min(1),
  })
  .refine((v) => !v.isFree || !!v.freeAccessReason, {
    message: "isFree=true exige freeAccessReason (procedência do acesso gratuito).",
    path: ["freeAccessReason"],
  });
export type LibraryItemCreateInput = z.input<typeof LibraryItemCreateInputSchema>;

/**
 * Entrada para atualizar um `LibraryItem`. Sem `.refine` cruzado aqui de
 * propósito — um PATCH parcial não tem os dois campos garantidos presentes
 * ao mesmo tempo; a consistência `isFree`/`freeAccessReason` é revalidada em
 * `library.service.ts` combinando o registro existente com o patch (mesmo
 * padrão de `question.service.ts` no Módulo 3).
 */
export const LibraryItemUpdateInputSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).optional(),
  authorName: z.string().max(300).optional(),
  academicWorkId: z.string().min(1).optional(),
  materialType: LibraryMaterialTypeSchema.optional(),
  language: z.string().max(20).optional(),
  year: z.number().int().min(1000).max(2100).optional(),
  isFree: z.boolean().optional(),
  freeAccessReason: FreeAccessReasonSchema.optional(),
  sourceId: z.string().min(1).optional(),
});
export type LibraryItemUpdateInput = z.input<typeof LibraryItemUpdateInputSchema>;

/** Associação de um `LibraryItem` a um nó de conhecimento — mesmo mecanismo de `LessonKnowledgeTag`/`QuestionKnowledgeTag`. */
export const LibraryItemKnowledgeTagInputSchema = z.object({
  entityType: KnowledgeEntityTypeSchema,
  entityId: z.string().min(1),
});
export type LibraryItemKnowledgeTagInput = z.infer<typeof LibraryItemKnowledgeTagInputSchema>;
