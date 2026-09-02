/**
 * Testes de integração reais — filtros tipados de `listQuestions` (Módulo 3,
 * seção 37).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { listQuestions } from "./questionQuery.service";
import { linkQuestionToKnowledge, publishQuestion } from "./question.service";
import { createExam } from "./exam.service";
import { createExamEdition } from "./examEdition.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  createFixtureExamBoard,
  createFixtureTag,
  cleanupFixtures,
} from "@/test/fixtures";

describe("listQuestions — filtros tipados", () => {
  let editorId: string;
  let adminId: string;
  let sourceId: string;
  let conceptId: string;
  let examId: string;
  let oldEditionId: string;
  let newEditionId: string;
  const questionIds: string[] = [];
  const conceptIds: string[] = [];
  const sourceIds: string[] = [];
  const examIds: string[] = [];
  const examEditionIds: string[] = [];
  const examBoardIds: string[] = [];
  const tagIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("qquery-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("qquery-admin", Role.ADMIN);
    const source = await createFixtureSource("qquery");
    const concept = await createFixtureConcept("qquery");
    const exam = await createExam(
      { userId: editor.id, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-exam-qquery-${Date.now()}`, name: "TEST_FIXTURE_exam_qquery" },
    );
    editorId = editor.id;
    adminId = admin.id;
    sourceId = source.id;
    conceptId = concept.id;
    examId = exam.id;
    userIds.push(editorId, adminId);
    sourceIds.push(sourceId);
    conceptIds.push(conceptId);
    examIds.push(examId);

    const oldEdition = await createExamEdition(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { examId, name: "TEST_FIXTURE_edition_old", year: 2015 },
    );
    const newEdition = await createExamEdition(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { examId, name: "TEST_FIXTURE_edition_new", year: 2023 },
    );
    oldEditionId = oldEdition.id;
    newEditionId = newEdition.id;
    examEditionIds.push(oldEditionId, newEditionId);

    const q1 = await createFixtureMultipleChoiceQuestion("qquery-old", sourceId, {
      difficulty: "BASICO",
      examEditionId: oldEditionId,
    });
    const q2 = await createFixtureMultipleChoiceQuestion("qquery-new", sourceId, {
      difficulty: "AVANCADO",
      examEditionId: newEditionId,
    });
    const q3 = await createFixtureMultipleChoiceQuestion("qquery-autoral", sourceId, {
      difficulty: "BASICO",
    });
    questionIds.push(q1.id, q2.id, q3.id);

    await linkQuestionToKnowledge({ userId: editorId, role: Role.CONTENT_EDITOR }, q3.id, {
      entityType: "CONCEPT",
      entityId: conceptId,
    });
    await publishQuestion({ userId: adminId, role: Role.ADMIN }, q3.id);

    // Módulo 6 — banca (via ExamEdition) e tag (via Question.tags).
    const board = await createFixtureExamBoard("qquery");
    examBoardIds.push(board.id);
    await prisma.examEdition.update({
      where: { id: newEditionId },
      data: { examBoardId: board.id },
    });

    const tag = await createFixtureTag("qquery");
    tagIds.push(tag.id);
    await prisma.question.update({
      where: { id: q1.id },
      data: { tags: { connect: { id: tag.id } } },
    });
  });

  it("filtra por difficulty", async () => {
    const results = await listQuestions({ difficulty: "BASICO" });
    const ids = results.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(questionIds.slice(0, 1).concat(questionIds[2])));
  });

  it("filtra por ano da prova (ExamEdition.year), não por data de cadastro", async () => {
    // `arrayContaining`/`take` alto, não igualdade exata: o banco de dev é
    // compartilhado entre arquivos de teste E com o conteúdo real de provas
    // (que também tem ano de aplicação) — outra prova real pode
    // legitimamente cair no mesmo ano.
    const results2023 = await listQuestions({ year: 2023, take: 500 });
    expect(results2023.map((r) => r.id)).toEqual(expect.arrayContaining([questionIds[1]]));
    expect(results2023.map((r) => r.id)).not.toContain(questionIds[0]); // 2015, ano diferente

    const results2015 = await listQuestions({ year: 2015, take: 500 });
    expect(results2015.map((r) => r.id)).toEqual(expect.arrayContaining([questionIds[0]]));
    expect(results2015.map((r) => r.id)).not.toContain(questionIds[1]); // 2023, ano diferente
  });

  it("filtra por examEditionId", async () => {
    const results = await listQuestions({ examEditionId: oldEditionId });
    expect(results.map((r) => r.id)).toEqual([questionIds[0]]);
  });

  it("filtra por conceito associado", async () => {
    const results = await listQuestions({ conceptId });
    expect(results.map((r) => r.id)).toEqual([questionIds[2]]);
  });

  it("availableForDiagnostic exige publicada + conhecimento associado", async () => {
    const results = await listQuestions({ availableForDiagnostic: true });
    const ids = results.map((r) => r.id);
    expect(ids).toContain(questionIds[2]);
    expect(ids).not.toContain(questionIds[0]);
    expect(ids).not.toContain(questionIds[1]);
  });

  it("filtra por faixa de anos (yearFrom/yearTo) — Módulo 6", async () => {
    // `arrayContaining`, não igualdade exata: o banco de dev é compartilhado
    // entre arquivos de teste (mesmo princípio das demais checagens deste
    // arquivo, ex.: "filtra por difficulty") — outra fixture pode
    // legitimamente cair na mesma faixa de anos. `take` explícito e alto:
    // o padrão de `listQuestions` é 50 e `orderBy` prioriza o ano da prova
    // mais recente — com o conteúdo real de provas crescendo (2024/2025),
    // o fixture desta prova (ano 2023) fica fora da primeira página sem
    // isso, mesmo estando dentro da faixa filtrada.
    const results = await listQuestions({ yearFrom: 2020, yearTo: 2025, take: 500 });
    expect(results.map((r) => r.id)).toEqual(expect.arrayContaining([questionIds[1]]));
    expect(results.map((r) => r.id)).not.toContain(questionIds[0]); // 2015, fora da faixa

    const wideRange = await listQuestions({ yearFrom: 2010, yearTo: 2025, take: 500 });
    expect(wideRange.map((r) => r.id)).toEqual(
      expect.arrayContaining([questionIds[0], questionIds[1]]),
    );
  });

  it("filtra por examBoardId (Módulo 6)", async () => {
    const board = await prisma.examBoard.findFirstOrThrow({ where: { id: { in: examBoardIds } } });
    const results = await listQuestions({ examBoardId: board.id });
    expect(results.map((r) => r.id)).toEqual([questionIds[1]]);
  });

  it("filtra por tagIds (Módulo 6)", async () => {
    const results = await listQuestions({ tagIds });
    expect(results.map((r) => r.id)).toEqual([questionIds[0]]);
  });

  afterAll(async () => {
    await prisma.question.update({ where: { id: questionIds[0] }, data: { tags: { set: [] } } });
    await cleanupFixtures({
      questionIds,
      conceptIds,
      examEditionIds,
      examIds,
      examBoardIds,
      tagIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
