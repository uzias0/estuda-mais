import { z } from "zod";
import { SourceType, SourceClass, LegalStatus } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "./zod-enum";

export const SourceTypeSchema = zodEnumFromPrisma(SourceType);
export const SourceClassSchema = zodEnumFromPrisma(SourceClass);
export const LegalStatusSchema = zodEnumFromPrisma(LegalStatus);

/**
 * Entrada para criar uma `Source` — procedência de qualquer conteúdo
 * acadêmico (docs/RELATORIO_REVISAO_V3.md, seção 6: "política definitiva de
 * procedência/citação"). `sourceType` é obrigatório sempre; `classification`
 * só é exigida pela regra de domínio quando a fonte embasa uma publicação
 * (não reforçada aqui — a validação de publicação pertence ao módulo de
 * curadoria, não a este schema de criação).
 */
export const SourceCreateInputSchema = z.object({
  name: z.string().min(1).max(300),
  sourceType: SourceTypeSchema,
  classification: SourceClassSchema.optional(),
  author: z.string().max(300).optional(),
  institution: z.string().max(300).optional(),
  url: z.string().url().optional(),
  doi: z.string().max(120).optional(),
  isbn: z.string().max(40).optional(),
  license: z.string().max(200).optional(),
  publishedAt: z.coerce.date().optional(),
  accessedAt: z.coerce.date().optional(),
  version: z.string().max(60).optional(),
  rightsNote: z.string().max(1000).optional(),
});
export type SourceCreateInput = z.infer<typeof SourceCreateInputSchema>;

/**
 * Entrada para criar uma `LegalReference` — extensão 1:1 de `Source` para
 * legislação/normas técnicas (CFP, SUS, SUAS). `sourceId` deve apontar para
 * uma `Source` já existente com `sourceType` compatível (regra de domínio,
 * não reforçada por este schema).
 */
export const LegalReferenceCreateInputSchema = z.object({
  sourceId: z.string().min(1),
  jurisdiction: z.string().max(200).optional(),
  legalStatus: LegalStatusSchema.default(LegalStatus.VIGENTE),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
  supersededById: z.string().min(1).optional(),
});
// `z.input` (não `z.infer`/`z.output`): `legalStatus` tem `.default(...)`, ou
// seja, é opcional para quem CHAMA (o `.parse()` preenche o valor) mas
// aparece como obrigatório no tipo de saída — o tipo exportado precisa
// refletir o que o chamador de fato precisa passar.
export type LegalReferenceCreateInput = z.input<typeof LegalReferenceCreateInputSchema>;

/** Entrada para atualizar uma `Source` — todos os campos opcionais, `sourceType` incluso. */
export const SourceUpdateInputSchema = SourceCreateInputSchema.partial();
export type SourceUpdateInput = z.infer<typeof SourceUpdateInputSchema>;

/**
 * Entrada para atualizar vigência/substituição de uma `LegalReference`.
 * `sourceId` não é atualizável (é a chave 1:1 com `Source`, imutável após criação).
 */
export const LegalReferenceUpdateInputSchema = LegalReferenceCreateInputSchema.omit({
  sourceId: true,
}).partial();
export type LegalReferenceUpdateInput = z.infer<typeof LegalReferenceUpdateInputSchema>;
