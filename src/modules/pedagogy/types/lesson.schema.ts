import { z } from "zod";
import { KnowledgeEntityTypeSchema } from "@/modules/knowledge/types/academic-relation.schema";

/**
 * Entrada para criar uma `Lesson`. Deliberadamente enxuta — `title` é o único
 * campo próprio; o conteúdo real vive em `LessonBlock` (Módulo 4, seção 4:
 * "a Lesson NÃO duplica conteúdo acadêmico") e a referência ao conhecimento
 * que ela ensina vive em `LessonKnowledgeTag`, não em campos soltos aqui.
 */
export const LessonCreateInputSchema = z.object({
  title: z.string().min(1).max(300),
});
export type LessonCreateInput = z.infer<typeof LessonCreateInputSchema>;

export const LessonUpdateInputSchema = LessonCreateInputSchema.partial();
export type LessonUpdateInput = z.infer<typeof LessonUpdateInputSchema>;

/** Associação de uma Lesson a um nó de conhecimento (`LessonKnowledgeTag`) — mesmo mecanismo de `QuestionKnowledgeTag`. */
export const LessonKnowledgeTagInputSchema = z.object({
  entityType: KnowledgeEntityTypeSchema,
  entityId: z.string().min(1),
});
export type LessonKnowledgeTagInput = z.infer<typeof LessonKnowledgeTagInputSchema>;
