import { z } from "zod";
import { AcademicWorkType, AcademicWorkRole } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";

export const AcademicWorkTypeSchema = zodEnumFromPrisma(AcademicWorkType);
export const AcademicWorkRoleSchema = zodEnumFromPrisma(AcademicWorkRole);

/** Entrada para criar uma `AcademicWork`. `sourceId` é procedência bibliográfica OPCIONAL (seção 6). */
export const AcademicWorkCreateInputSchema = z.object({
  title: z.string().min(1).max(400),
  subtitle: z.string().max(400).optional(),
  year: z.number().int().min(1).max(3000).optional(),
  type: AcademicWorkTypeSchema,
  isbn: z.string().max(40).optional(),
  doi: z.string().max(120).optional(),
  sourceId: z.string().min(1).optional(),
});
export type AcademicWorkCreateInput = z.infer<typeof AcademicWorkCreateInputSchema>;

export const AcademicWorkUpdateInputSchema = AcademicWorkCreateInputSchema.partial();
export type AcademicWorkUpdateInput = z.infer<typeof AcademicWorkUpdateInputSchema>;

/** Entrada para associar um `AcademicPerson` a uma `AcademicWork` (join `AcademicWorkAuthor`). */
export const AcademicWorkAuthorInputSchema = z.object({
  personId: z.string().min(1),
  workId: z.string().min(1),
  role: AcademicWorkRoleSchema.default(AcademicWorkRole.AUTOR),
});
// z.input, não z.infer/z.output: `role` tem `.default(...)`.
export type AcademicWorkAuthorInput = z.input<typeof AcademicWorkAuthorInputSchema>;
