import { describe, it, expect } from "vitest";
import { ReviewItemCreateInputSchema } from "./review-item.schema";

const base = {
  userId: "user_test_1",
  dueAt: new Date(),
};

describe("ReviewItemCreateInputSchema — exclusividade scope/questionId/conceptId", () => {
  it("aceita scope=QUESTION com questionId e sem conceptId", () => {
    const result = ReviewItemCreateInputSchema.safeParse({
      ...base,
      scope: "QUESTION",
      questionId: "question_1",
    });
    expect(result.success).toBe(true);
  });

  it("aceita scope=CONCEPT com conceptId e sem questionId", () => {
    const result = ReviewItemCreateInputSchema.safeParse({
      ...base,
      scope: "CONCEPT",
      conceptId: "concept_1",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando nenhum dos dois (questionId/conceptId) está presente", () => {
    const result = ReviewItemCreateInputSchema.safeParse({
      ...base,
      scope: "QUESTION",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quando ambos (questionId e conceptId) estão presentes", () => {
    const result = ReviewItemCreateInputSchema.safeParse({
      ...base,
      scope: "QUESTION",
      questionId: "question_1",
      conceptId: "concept_1",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita scope=CONCEPT com questionId preenchido em vez de conceptId", () => {
    const result = ReviewItemCreateInputSchema.safeParse({
      ...base,
      scope: "CONCEPT",
      questionId: "question_1",
    });
    expect(result.success).toBe(false);
  });
});
