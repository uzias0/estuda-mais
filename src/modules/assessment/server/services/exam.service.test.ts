/**
 * Testes de integração reais — Exam/ExamEdition/ExamBoard/Organization/
 * Position: criação, vínculos, ano, source, publicação (Módulo 3, seção 45).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { createExam, publishExam } from "./exam.service";
import { createExamEdition, publishExamEdition, listExamEditions } from "./examEdition.service";
import { createExamBoard, createOrganization, createPosition } from "./examReference.service";
import { createFixtureUser, createFixtureSource, cleanupFixtures } from "@/test/fixtures";

describe("Exam / ExamEdition / ExamBoard / Organization / Position", () => {
  let editorId: string;
  let adminId: string;
  let studentId: string;
  let sourceId: string;
  const examIds: string[] = [];
  const examEditionIds: string[] = [];
  const examBoardIds: string[] = [];
  const organizationIds: string[] = [];
  const positionIds: string[] = [];
  const sourceIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("exam-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("exam-admin", Role.ADMIN);
    const student = await createFixtureUser("exam-student", Role.STUDENT);
    const source = await createFixtureSource("exam");
    editorId = editor.id;
    adminId = admin.id;
    studentId = student.id;
    sourceId = source.id;
    userIds.push(editorId, adminId, studentId);
    sourceIds.push(sourceId);
  });

  it("cria um Exam e publica", async () => {
    const exam = await createExam(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-exam-${Date.now()}`, name: "TEST_FIXTURE_exam" },
    );
    examIds.push(exam.id);

    const published = await publishExam({ userId: adminId, role: Role.ADMIN }, exam.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("cria ExamBoard/Organization/Position e uma ExamEdition vinculada a todos + Source", async () => {
    const exam = await createExam(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-exam-edition-${Date.now()}`, name: "TEST_FIXTURE_exam_edition" },
    );
    examIds.push(exam.id);

    const board = await createExamBoard(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-board-${Date.now()}`, name: "TEST_FIXTURE_board" },
    );
    examBoardIds.push(board.id);
    const org = await createOrganization(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-org-${Date.now()}`, name: "TEST_FIXTURE_org" },
    );
    organizationIds.push(org.id);
    const position = await createPosition(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-position-${Date.now()}`, name: "TEST_FIXTURE_position" },
    );
    positionIds.push(position.id);

    const edition = await createExamEdition(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      {
        examId: exam.id,
        name: "TEST_FIXTURE_edition_2022",
        year: 2022,
        examBoardId: board.id,
        organizationId: org.id,
        positionId: position.id,
        sourceId,
      },
    );
    examEditionIds.push(edition.id);
    expect(edition.year).toBe(2022);
    expect(edition.examBoardId).toBe(board.id);

    const published = await publishExamEdition({ userId: adminId, role: Role.ADMIN }, edition.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("rejeita ano fora de faixa sã (não inventar datas)", async () => {
    const exam = await createExam(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-exam-year-${Date.now()}`, name: "TEST_FIXTURE_exam_year" },
    );
    examIds.push(exam.id);

    await expect(
      createExamEdition(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { examId: exam.id, name: "x", year: 1500 },
      ),
    ).rejects.toThrow();

    await expect(
      createExamEdition(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { examId: exam.id, name: "x", year: 3000 },
      ),
    ).rejects.toThrow();
  });

  it("rejeita ExamEdition para Exam inexistente", async () => {
    await expect(
      createExamEdition(
        { userId: editorId, role: Role.CONTENT_EDITOR },
        { examId: "id-inexistente", name: "x", year: 2020 },
      ),
    ).rejects.toThrow();
  });

  it("lista edições por exam e por ano", async () => {
    const exam = await createExam(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-exam-list-${Date.now()}`, name: "TEST_FIXTURE_exam_list" },
    );
    examIds.push(exam.id);
    const edition2019 = await createExamEdition(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { examId: exam.id, name: "TEST_FIXTURE_2019", year: 2019 },
    );
    const edition2021 = await createExamEdition(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { examId: exam.id, name: "TEST_FIXTURE_2021", year: 2021 },
    );
    examEditionIds.push(edition2019.id, edition2021.id);

    const byExam = await listExamEditions({ examId: exam.id });
    expect(byExam.map((e) => e.id).sort()).toEqual([edition2019.id, edition2021.id].sort());

    const by2021 = await listExamEditions({ examId: exam.id, year: 2021 });
    expect(by2021.map((e) => e.id)).toEqual([edition2021.id]);
  });

  it("STUDENT não pode criar Exam nem publicar (segurança)", async () => {
    await expect(
      createExam(
        { userId: studentId, role: Role.STUDENT },
        { slug: `test-fixture-exam-student-${Date.now()}`, name: "x" },
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  afterAll(async () => {
    await cleanupFixtures({
      examEditionIds,
      examIds,
      examBoardIds,
      organizationIds,
      positionIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
