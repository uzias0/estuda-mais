import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "./db";

describe("Prisma Client (adapter-pg) — smoke test", () => {
  it("conecta no Postgres de desenvolvimento e executa uma query", async () => {
    const result = await prisma.$queryRawUnsafe<{ ok: number }[]>("SELECT 1 as ok");
    expect(result[0]?.ok).toBe(1);
  });

  it("enxerga as tabelas da migration inicial (ex.: Question, Concept, ReviewItem)", async () => {
    const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const names = tables.map((t) => t.table_name);
    expect(names).toEqual(
      expect.arrayContaining(["Question", "Concept", "ReviewItem", "AcademicRelation"]),
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
