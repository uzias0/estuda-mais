/**
 * Allow-list central de `AcademicRelation.relationType`.
 *
 * Decisão arquitetural deliberada (docs/RELATORIO_REVISAO_V3.md, seção 5):
 * `relationType` é `String` no schema Prisma, NÃO um enum de banco — para
 * que novos tipos de relação acadêmica possam ser adicionados sem migration.
 * A validação de quais valores são aceitos vive aqui, na camada de domínio,
 * e é revisada em PR como qualquer mudança de código.
 *
 * A lista inicial é pequena e cobre os padrões de relação mais comuns entre
 * nós da Base de Conhecimento (pessoas, obras, teorias, conceitos, escolas).
 * Adicionar um tipo novo: inclua a chave abaixo com uma descrição — não é
 * necessário alterar o schema.prisma nem rodar migration.
 */

export const RELATION_TYPES = {
  INFLUENCIOU: "Uma pessoa/teoria influenciou outra pessoa/teoria/conceito",
  CRITICADA_POR: "Uma teoria/conceito foi criticada por uma pessoa",
  RELACIONADO_A: "Associação genérica entre dois conceitos/teorias",
  DESENVOLVEU: "Uma pessoa desenvolveu uma teoria/conceito",
  EXPANDIU: "Uma pessoa/teoria expandiu uma teoria/conceito preexistente",
  OPOSICAO_A: "Uma teoria/escola se posiciona em oposição a outra",
  DERIVOU_DE: "Um conceito/teoria derivou de outro conceito/teoria/escola",
  APLICADO_EM: "Uma teoria/conceito é aplicado em uma área/disciplina",
  ESTUDOU: "Uma pessoa estudou um fenômeno/conceito",
  COLABOROU_COM: "Duas pessoas colaboraram entre si",
} as const;

export type RelationType = keyof typeof RELATION_TYPES;

const RELATION_TYPE_KEYS = new Set(Object.keys(RELATION_TYPES));

/** Type guard: `value` é um `relationType` presente na allow-list. */
export function isValidRelationType(value: string): value is RelationType {
  return RELATION_TYPE_KEYS.has(value);
}

/** Lança se `value` não estiver na allow-list — usar na camada de serviço antes de gravar. */
export function assertValidRelationType(value: string): asserts value is RelationType {
  if (!isValidRelationType(value)) {
    const known = Object.keys(RELATION_TYPES).join(", ");
    throw new Error(
      `relationType "${value}" não está na allow-list. Tipos conhecidos: ${known}. ` +
        "Para adicionar um novo tipo, edite src/config/relation-types.ts.",
    );
  }
}
