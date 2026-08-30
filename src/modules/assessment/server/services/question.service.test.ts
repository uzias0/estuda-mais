/**
 * Testes de integração reais — Question: criação válida/inválida por tipo,
 * source obrigatório, atualização, publicação, arquivamento, segurança
 * (Módulo 3, seção 45).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { QuestionValidationError } from "./errors";
import {
  createQuestion,
  updateQuestion,
  publishQuestion,
  archiveQuestion,
  linkQuestionToKnowledge,
} from "./question.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Question service", () => {
  let editorId: string;
  let adminId: string;
  let studentId: string;
  let sourceId: string;
  let conceptId: string;
  const questionIds: string[] = [];
  const userIds: string[] = [];
  const sourceIds: string[] = [];
  const conceptIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("question-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("question-admin", Role.ADMIN);
    const student = await createFixtureUser("question-student", Role.STUDENT);
    const source = await createFixtureSource("question");
    const concept = await createFixtureConcept("question");
    editorId = editor.id;
    adminId = admin.id;
    studentId = student.id;
    sourceId = source.id;
    conceptId = concept.id;
    userIds.push(editorId, adminId, studentId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
  });

  it("cria uma questão MULTIPLE_CHOICE válida (exatamente 1 alternativa correta)", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_mc",
        type: "MULTIPLE_CHOICE",
        difficulty: "INICIANTE",
        sourceId,
        options: [
          { text: "a", isCorrect: false, order: 0 },
          { text: "b", isCorrect: true, order: 1 },
          { text: "c", isCorrect: false, order: 2 },
        ],
      },
    );
    questionIds.push(question.id);
    expect(question.options).toHaveLength(3);
    expect(question.reviewStatus).toBe("DRAFT");
  });

  it("rejeita MULTIPLE_CHOICE sem alternativas", async () => {
    await expect(
      createQuestion(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { prompt: "x", type: "MULTIPLE_CHOICE", difficulty: "INICIANTE", sourceId },
      ),
    ).rejects.toThrow(QuestionValidationError);
  });

  it("rejeita MULTIPLE_CHOICE com duas alternativas corretas", async () => {
    await expect(
      createQuestion(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          prompt: "x",
          type: "MULTIPLE_CHOICE",
          difficulty: "INICIANTE",
          sourceId,
          options: [
            { text: "a", isCorrect: true, order: 0 },
            { text: "b", isCorrect: true, order: 1 },
          ],
        },
      ),
    ).rejects.toThrow(QuestionValidationError);
  });

  it("rejeita TRUE_FALSE sem exatamente 2 alternativas", async () => {
    await expect(
      createQuestion(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          prompt: "x",
          type: "TRUE_FALSE",
          difficulty: "INICIANTE",
          sourceId,
          options: [{ text: "verdadeiro", isCorrect: true, order: 0 }],
        },
      ),
    ).rejects.toThrow(QuestionValidationError);
  });

  it("cria uma questão TRUE_FALSE válida", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_tf",
        type: "TRUE_FALSE",
        difficulty: "BASICO",
        sourceId,
        options: [
          { text: "Verdadeiro", isCorrect: true, order: 0 },
          { text: "Falso", isCorrect: false, order: 1 },
        ],
      },
    );
    questionIds.push(question.id);
    expect(question.options).toHaveLength(2);
  });

  it("MULTI_SELECT exige ao menos uma correta, permite mais de uma", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_ms",
        type: "MULTI_SELECT",
        difficulty: "INTERMEDIARIO",
        sourceId,
        options: [
          { text: "a", isCorrect: true, order: 0 },
          { text: "b", isCorrect: true, order: 1 },
          { text: "c", isCorrect: false, order: 2 },
        ],
      },
    );
    questionIds.push(question.id);
    expect(question.options.filter((o) => o.isCorrect)).toHaveLength(2);
  });

  it("rejeita MULTI_SELECT com todas as alternativas incorretas", async () => {
    await expect(
      createQuestion(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          prompt: "x",
          type: "MULTI_SELECT",
          difficulty: "INICIANTE",
          sourceId,
          options: [
            { text: "a", isCorrect: false, order: 0 },
            { text: "b", isCorrect: false, order: 1 },
          ],
        },
      ),
    ).rejects.toThrow(QuestionValidationError);
  });

  it("cria uma questão ORDERING válida (order único por item)", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_ordering",
        type: "ORDERING",
        difficulty: "AVANCADO",
        sourceId,
        options: [
          { text: "primeiro", isCorrect: false, order: 0 },
          { text: "segundo", isCorrect: false, order: 1 },
          { text: "terceiro", isCorrect: false, order: 2 },
        ],
      },
    );
    questionIds.push(question.id);
    expect(question.options).toHaveLength(3);
  });

  it("cria uma questão MATCHING válida (answerKey com pares)", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_matching",
        type: "MATCHING",
        difficulty: "INTERMEDIARIO",
        sourceId,
        answerKey: {
          kind: "MATCHING",
          pairs: [
            { left: "Freud", right: "Psicanálise" },
            { left: "Skinner", right: "Behaviorismo" },
          ],
        },
      },
    );
    questionIds.push(question.id);
    expect(question.answerKey).not.toBeNull();
  });

  it("rejeita MATCHING sem answerKey", async () => {
    await expect(
      createQuestion(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { prompt: "x", type: "MATCHING", difficulty: "INICIANTE", sourceId },
      ),
    ).rejects.toThrow(QuestionValidationError);
  });

  it("cria uma questão FILL_BLANK válida e rejeita se vier com options", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_fillblank",
        type: "FILL_BLANK",
        difficulty: "BASICO",
        sourceId,
        answerKey: { kind: "FILL_BLANK", blanks: [{ accepted: ["inconsciente", "Inconsciente"] }] },
      },
    );
    questionIds.push(question.id);
    expect(question.answerKey).not.toBeNull();

    await expect(
      createQuestion(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          prompt: "x",
          type: "FILL_BLANK",
          difficulty: "BASICO",
          sourceId,
          answerKey: { kind: "FILL_BLANK", blanks: [{ accepted: ["x"] }] },
          options: [{ text: "a", isCorrect: true, order: 0 }],
        },
      ),
    ).rejects.toThrow(QuestionValidationError);
  });

  it("cria uma questão SHORT_ANSWER válida", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_shortanswer",
        type: "SHORT_ANSWER",
        difficulty: "DOMINIO",
        sourceId,
        answerKey: { kind: "SHORT_ANSWER", accepted: ["condicionamento operante"] },
      },
    );
    questionIds.push(question.id);
    expect(question.answerKey).not.toBeNull();
  });

  it("cria uma questão CASE_STUDY com alternativas", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_casestudy",
        type: "CASE_STUDY",
        difficulty: "AVANCADO",
        sourceId,
        options: [
          { text: "a", isCorrect: true, order: 0 },
          { text: "b", isCorrect: false, order: 1 },
        ],
      },
    );
    questionIds.push(question.id);
    expect(question.options).toHaveLength(2);
  });

  it("rejeita CASE_STUDY sem options nem answerKey", async () => {
    await expect(
      createQuestion(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { prompt: "x", type: "CASE_STUDY", difficulty: "INICIANTE", sourceId },
      ),
    ).rejects.toThrow(QuestionValidationError);
  });

  it("rejeita sourceId inexistente", async () => {
    await expect(
      createQuestion(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        {
          prompt: "x",
          type: "MULTIPLE_CHOICE",
          difficulty: "INICIANTE",
          sourceId: "id-inexistente",
          options: [
            { text: "a", isCorrect: true, order: 0 },
            { text: "b", isCorrect: false, order: 1 },
          ],
        },
      ),
    ).rejects.toThrow();
  });

  it("STUDENT não pode criar questão (segurança)", async () => {
    await expect(
      createQuestion(
        { userId: studentId, role: Role.STUDENT },
        {
          prompt: "x",
          type: "MULTIPLE_CHOICE",
          difficulty: "INICIANTE",
          sourceId,
          options: [
            { text: "a", isCorrect: true, order: 0 },
            { text: "b", isCorrect: false, order: 1 },
          ],
        },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it("atualiza uma questão (prompt) preservando a forma", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_update_v1",
        type: "MULTIPLE_CHOICE",
        difficulty: "INICIANTE",
        sourceId,
        options: [
          { text: "a", isCorrect: true, order: 0 },
          { text: "b", isCorrect: false, order: 1 },
        ],
      },
    );
    questionIds.push(question.id);

    const updated = await updateQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      question.id,
      {
        prompt: "TEST_FIXTURE_update_v2",
      },
    );
    expect(updated.prompt).toBe("TEST_FIXTURE_update_v2");
  });

  it("associa a questão a um Concept via QuestionKnowledgeTag (reaproveitado, não duplicado)", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_link",
        type: "MULTIPLE_CHOICE",
        difficulty: "INICIANTE",
        sourceId,
        options: [
          { text: "a", isCorrect: true, order: 0 },
          { text: "b", isCorrect: false, order: 1 },
        ],
      },
    );
    questionIds.push(question.id);

    const tag = await linkQuestionToKnowledge(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      question.id,
      { entityType: "CONCEPT", entityId: conceptId },
    );
    expect(tag.entityId).toBe(conceptId);
  });

  it("STUDENT não pode publicar; CONTENT_EDITOR não pode publicar; ADMIN publica", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_publish",
        type: "MULTIPLE_CHOICE",
        difficulty: "INICIANTE",
        sourceId,
        options: [
          { text: "a", isCorrect: true, order: 0 },
          { text: "b", isCorrect: false, order: 1 },
        ],
      },
    );
    questionIds.push(question.id);

    await expect(
      publishQuestion({ userId: studentId, role: Role.STUDENT }, question.id),
    ).rejects.toThrow(AuthorizationError);
    await expect(
      publishQuestion({ userId: editorId, role: Role.CONTENT_EDITOR }, question.id),
    ).rejects.toThrow(AuthorizationError);
    const published = await publishQuestion({ userId: adminId, role: Role.ADMIN }, question.id);
    expect(published.reviewStatus).toBe("PUBLISHED");
  });

  it("arquiva uma questão", async () => {
    const question = await createQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        prompt: "TEST_FIXTURE_archive",
        type: "SHORT_ANSWER",
        difficulty: "INICIANTE",
        sourceId,
        answerKey: { kind: "SHORT_ANSWER", accepted: ["x"] },
      },
    );
    questionIds.push(question.id);

    const archived = await archiveQuestion(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      question.id,
    );
    expect(archived.reviewStatus).toBe("ARCHIVED");
  });

  afterAll(async () => {
    await cleanupFixtures({ questionIds, conceptIds, sourceIds, userIds });
    await prisma.$disconnect();
  });
});
