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
  // Aceita tanto uma URL completa (imagem hospedada externamente) quanto
  // um caminho relativo à raiz (`/people/slug.png`, `public/people/`) —
  // fase "Biblioteca de Pessoas": as ilustrações reais que o usuário
  // mandou são asset local do próprio app, mesmo padrão já usado por
  // `CharacterDef.portrait` (`config/characters.ts`), nunca uma URL
  // externa de terceiro.
  imageUrl: z
    .string()
    .refine((v) => v.startsWith("/") || z.string().url().safeParse(v).success, {
      message: "imageUrl deve ser uma URL completa ou um caminho relativo iniciado por '/'",
    })
    .optional(),
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
