/**
 * Testes de `normalize-user-emails.service.ts` (fase "recuperar admin
 * sem Shell") — corrige contas já existentes com e-mail gravado em
 * maiúsculas, sem nunca mesclar/apagar em caso de colisão real.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { normalizeAllUserEmails } from "./normalize-user-emails.service";

describe("normalizeAllUserEmails", () => {
  const userIds: string[] = [];

  afterAll(async () => {
    if (userIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it("corrige uma conta com e-mail em maiúsculas para minúsculas", async () => {
    const mixedCaseEmail = `Test-Fixture-Normalize-${Date.now()}@Example.Invalid`;
    const user = await prisma.user.create({ data: { email: mixedCaseEmail, role: Role.STUDENT } });
    userIds.push(user.id);

    const { normalized, results } = await normalizeAllUserEmails();

    expect(normalized).toBeGreaterThanOrEqual(1);
    const mine = results.find((r) => r.userId === user.id);
    expect(mine?.status).toBe("normalized");

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.email).toBe(mixedCaseEmail.toLowerCase());
  });

  it("é idempotente: rodar de novo não mexe em quem já está em minúsculas", async () => {
    const email = `test-fixture-normalize-idempotent-${Date.now()}@example.invalid`;
    const user = await prisma.user.create({ data: { email, role: Role.STUDENT } });
    userIds.push(user.id);

    const { results } = await normalizeAllUserEmails();
    const mine = results.find((r) => r.userId === user.id);
    expect(mine?.status).toBe("already-lowercase");
  });

  it("pula (não mescla/apaga) quando a versão em minúsculas já pertence a outra conta — colisão real", async () => {
    const suffix = Date.now();
    const lowerEmail = `test-fixture-normalize-collision-${suffix}@example.invalid`;
    const mixedCaseEmail = `Test-Fixture-Normalize-Collision-${suffix}@Example.Invalid`;

    const lowerUser = await prisma.user.create({ data: { email: lowerEmail, role: Role.STUDENT } });
    const mixedUser = await prisma.user.create({
      data: { email: mixedCaseEmail, role: Role.STUDENT },
    });
    userIds.push(lowerUser.id, mixedUser.id);

    const { results } = await normalizeAllUserEmails();
    const mine = results.find((r) => r.userId === mixedUser.id);
    expect(mine?.status).toBe("collision-skipped");

    // nenhuma das duas contas foi apagada/mesclada
    const stillMixed = await prisma.user.findUniqueOrThrow({ where: { id: mixedUser.id } });
    expect(stillMixed.email).toBe(mixedCaseEmail); // continua como estava, não tocado
    const stillLower = await prisma.user.findUniqueOrThrow({ where: { id: lowerUser.id } });
    expect(stillLower.email).toBe(lowerEmail);
  });
});
