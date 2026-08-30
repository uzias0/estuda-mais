/**
 * Testes de integração reais — ExamBoard/Organization/Position: publicação e
 * arquivamento (criação já coberta em exam.service.test.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import {
  createExamBoard,
  publishExamBoard,
  createOrganization,
  archiveOrganization,
  createPosition,
  publishPosition,
} from "./examReference.service";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";

describe("ExamBoard / Organization / Position — publicação e arquivamento", () => {
  let editorId: string;
  let adminId: string;
  const examBoardIds: string[] = [];
  const organizationIds: string[] = [];
  const positionIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const editor = await createFixtureUser("examref-editor", Role.CONTENT_EDITOR);
    const admin = await createFixtureUser("examref-admin", Role.ADMIN);
    editorId = editor.id;
    adminId = admin.id;
    userIds.push(editorId, adminId);
  });

  it("publica um ExamBoard", async () => {
    const board = await createExamBoard(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-board-pub-${Date.now()}`, name: "TEST_FIXTURE_board_pub" },
    );
    examBoardIds.push(board.id);
    const published = await publishExamBoard({ userId: adminId, role: Role.ADMIN }, board.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("arquiva uma Organization", async () => {
    const org = await createOrganization(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-org-arch-${Date.now()}`, name: "TEST_FIXTURE_org_arch" },
    );
    organizationIds.push(org.id);
    const archived = await archiveOrganization(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      org.id,
    );
    expect(archived.status).toBe("ARCHIVED");
  });

  it("publica uma Position", async () => {
    const position = await createPosition(
      { userId: editorId, role: Role.CONTENT_EDITOR },
      { slug: `test-fixture-position-pub-${Date.now()}`, name: "TEST_FIXTURE_position_pub" },
    );
    positionIds.push(position.id);
    const published = await publishPosition({ userId: adminId, role: Role.ADMIN }, position.id);
    expect(published.status).toBe("PUBLISHED");
  });

  afterAll(async () => {
    await cleanupFixtures({ examBoardIds, organizationIds, positionIds, userIds });
    await prisma.$disconnect();
  });
});
