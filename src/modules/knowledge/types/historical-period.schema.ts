import { z } from "zod";

function assertEndAfterStart(v: { startYear?: number; endYear?: number }) {
  return v.startYear === undefined || v.endYear === undefined || v.endYear >= v.startYear;
}

const periodFields = {
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case"),
  name: z.string().min(1).max(200),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  description: z.string().max(4000).optional(),
};

/** Entrada para criar um `HistoricalPeriod` (ex.: "Filosofia Antiga", "Estruturalismo"). */
export const HistoricalPeriodCreateInputSchema = z
  .object(periodFields)
  .refine(assertEndAfterStart, {
    message: "endYear não pode ser anterior a startYear.",
    path: ["endYear"],
  });
export type HistoricalPeriodCreateInput = z.infer<typeof HistoricalPeriodCreateInputSchema>;

export const HistoricalPeriodUpdateInputSchema = z
  .object(periodFields)
  .omit({ slug: true })
  .partial()
  .refine(assertEndAfterStart, {
    message: "endYear não pode ser anterior a startYear.",
    path: ["endYear"],
  });
export type HistoricalPeriodUpdateInput = z.infer<typeof HistoricalPeriodUpdateInputSchema>;
