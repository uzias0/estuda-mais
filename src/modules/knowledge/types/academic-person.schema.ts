import { z } from "zod";

const personFields = {
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug deve ser kebab-case"),
  name: z.string().min(1).max(200),
  fullName: z.string().max(300).optional(),
  displayName: z.string().max(200).optional(),
  bio: z.string().max(8000).optional(),
  birthDate: z.coerce.date().optional(),
  deathDate: z.coerce.date().optional(),
  periodId: z.string().min(1).optional(),
  countryContext: z.string().max(200).optional(),
  imageUrl: z.string().url().optional(),
};

function assertDeathAfterBirth(v: { birthDate?: Date; deathDate?: Date }) {
  return !v.birthDate || !v.deathDate || v.deathDate >= v.birthDate;
}

/** Entrada para criar uma `AcademicPerson` — sem restrição de profissão (ver docs/ARQUITETURA.md). */
export const AcademicPersonCreateInputSchema = z
  .object(personFields)
  .refine(assertDeathAfterBirth, {
    message: "deathDate não pode ser anterior a birthDate.",
    path: ["deathDate"],
  });
export type AcademicPersonCreateInput = z.infer<typeof AcademicPersonCreateInputSchema>;

export const AcademicPersonUpdateInputSchema = z
  .object(personFields)
  .omit({ slug: true })
  .partial()
  .refine(assertDeathAfterBirth, {
    message: "deathDate não pode ser anterior a birthDate.",
    path: ["deathDate"],
  });
export type AcademicPersonUpdateInput = z.infer<typeof AcademicPersonUpdateInputSchema>;
