import { z } from "zod";

const slug = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case");

/** `Exam` — categoria de avaliação (Vestibular, ENADE, Concurso, Simulado Autoral...). */
export const ExamCreateInputSchema = z.object({
  slug,
  name: z.string().min(1).max(200),
});
export type ExamCreateInput = z.input<typeof ExamCreateInputSchema>;
export const ExamUpdateInputSchema = ExamCreateInputSchema.omit({ slug: true }).partial();
export type ExamUpdateInput = z.input<typeof ExamUpdateInputSchema>;

/** `ExamBoard`/`Organization`/`Position` têm o mesmo formato mínimo (slug/name). */
export const ExamReferenceCreateInputSchema = z.object({
  slug,
  name: z.string().min(1).max(200),
});
export type ExamReferenceCreateInput = z.input<typeof ExamReferenceCreateInputSchema>;
export const ExamReferenceUpdateInputSchema = ExamReferenceCreateInputSchema.omit({
  slug: true,
}).partial();
export type ExamReferenceUpdateInput = z.input<typeof ExamReferenceUpdateInputSchema>;

const currentYear = new Date().getUTCFullYear();

/**
 * `ExamEdition` — edição específica (ex.: "ENADE Psicologia 2024"). `year`
 * validado contra uma faixa sã (não é permitido inventar datas — Módulo 3,
 * seção 13); banca/órgão/cargo/fonte são opcionais e validados por
 * existência no serviço, não aqui.
 */
export const ExamEditionCreateInputSchema = z.object({
  examId: z.string().min(1),
  name: z.string().min(1).max(300),
  year: z
    .number()
    .int()
    .min(1900)
    .max(currentYear + 1),
  examBoardId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  positionId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
});
export type ExamEditionCreateInput = z.input<typeof ExamEditionCreateInputSchema>;

export const ExamEditionUpdateInputSchema = ExamEditionCreateInputSchema.omit({
  examId: true,
}).partial();
export type ExamEditionUpdateInput = z.input<typeof ExamEditionUpdateInputSchema>;
