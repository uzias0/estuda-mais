-- Regra de domínio "ReviewItem.scope determina questionId XOR conceptId"
-- (docs/RELATORIO_REVISAO_V3.md, seções 1.4, 2, 5, 11) — não expressável no
-- DSL estável do schema.prisma (sem @@check/índice parcial portátil entre
-- versões), então é aplicada aqui como migration SQL manual versionada, e
-- reforçada também na camada de domínio (src/modules/review/types/review-item.schema.ts).

ALTER TABLE "ReviewItem" ADD CONSTRAINT review_item_scope_target_chk CHECK (
  (scope = 'QUESTION' AND "questionId" IS NOT NULL AND "conceptId" IS NULL) OR
  (scope = 'CONCEPT'  AND "conceptId"  IS NOT NULL AND "questionId" IS NULL)
);

CREATE UNIQUE INDEX review_item_question_uniq
ON "ReviewItem" ("userId", "questionId")
WHERE scope = 'QUESTION';

CREATE UNIQUE INDEX review_item_concept_uniq
ON "ReviewItem" ("userId", "conceptId")
WHERE scope = 'CONCEPT';
