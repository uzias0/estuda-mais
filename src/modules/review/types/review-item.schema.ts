import { z } from "zod";
import { ReviewScope } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "@/shared/schemas/zod-enum";

export const ReviewScopeSchema = zodEnumFromPrisma(ReviewScope);

/**
 * Espelha, na camada de aplicação, a mesma regra do CHECK constraint do
 * banco (prisma/migrations/.../migration.sql — ver docs/MODULO-1.md):
 * exatamente um entre `questionId`/`conceptId` deve existir, de acordo com
 * `scope`. Isso é defesa em profundidade, não substitui o CHECK constraint —
 * um dia alguém pode escrever direto no banco (script, outra aplicação) sem
 * passar por este schema, e o banco continua sendo a última linha de defesa.
 */
export const ReviewItemCreateInputSchema = z
  .object({
    userId: z.string().min(1),
    scope: ReviewScopeSchema,
    questionId: z.string().min(1).optional(),
    conceptId: z.string().min(1).optional(),
    dueAt: z.coerce.date(),
    intervalDays: z.number().int().positive().default(1),
    easeFactor: z.number().positive().default(2.5),
    repetitions: z.number().int().nonnegative().default(0),
  })
  .refine(
    (v) =>
      (v.scope === ReviewScope.QUESTION && !!v.questionId && !v.conceptId) ||
      (v.scope === ReviewScope.CONCEPT && !!v.conceptId && !v.questionId),
    {
      message:
        'scope="QUESTION" exige questionId (e nenhum conceptId); ' +
        'scope="CONCEPT" exige conceptId (e nenhum questionId).',
      path: ["scope"],
    },
  );
// z.input, não z.infer/z.output: intervalDays/easeFactor/repetitions têm
// `.default(...)` — opcionais para quem chama.
export type ReviewItemCreateInput = z.input<typeof ReviewItemCreateInputSchema>;
