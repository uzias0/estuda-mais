/**
 * Testes de `bootstrap-admin.service.ts` (fase "recuperar admin sem
 * Shell") — `upsertAdminUser` é o núcleo compartilhado pelo CLI
 * (`scripts/bootstrap-admin.ts`) e pelo hook de boot do servidor
 * (`instrumentation.ts`); `bootstrapAdminIfConfigured` é o contrato de
 * segurança do segundo caminho: nunca age sem as duas variáveis de
 * ambiente explicitamente definidas.
 */
import { describe, it, expect, afterEach, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { verifyPassword } from "@/server/auth/password";
import { upsertAdminUser, bootstrapAdminIfConfigured } from "./bootstrap-admin.service";

describe("upsertAdminUser", () => {
  const userIds: string[] = [];
  const email = `test-fixture-bootstrap-admin-${Date.now()}@example.invalid`;

  afterAll(async () => {
    if (userIds.length) {
      await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it("cria um usuário ADMIN novo com a senha informada, quando o e-mail não existe", async () => {
    const { created } = await upsertAdminUser(email, "SenhaOriginal123!");
    expect(created).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    userIds.push(user.id);
    expect(user.role).toBe(Role.ADMIN);
    expect(await verifyPassword("SenhaOriginal123!", user.passwordHash!)).toBe(true);
  });

  it("atualiza o usuário existente (senha + role) em vez de criar um segundo, chamado de novo com o mesmo e-mail", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { email } });

    const { created } = await upsertAdminUser(email, "SenhaNova456!");
    expect(created).toBe(false);

    const totalWithEmail = await prisma.user.count({ where: { email } });
    expect(totalWithEmail).toBe(1); // nunca duplica

    const after = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(after.id).toBe(before.id);
    expect(after.role).toBe(Role.ADMIN);
    expect(await verifyPassword("SenhaNova456!", after.passwordHash!)).toBe(true);
    expect(await verifyPassword("SenhaOriginal123!", after.passwordHash!)).toBe(false);
  });
});

describe("bootstrapAdminIfConfigured", () => {
  const userIds: string[] = [];
  const originalEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const originalPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  afterEach(async () => {
    if (originalEmail === undefined) delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    else process.env.BOOTSTRAP_ADMIN_EMAIL = originalEmail;
    if (originalPassword === undefined) delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    else process.env.BOOTSTRAP_ADMIN_PASSWORD = originalPassword;
  });

  afterAll(async () => {
    if (userIds.length) {
      await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it("nunca age (nem cria, nem lança) quando as variáveis de ambiente não estão definidas — contrato de segurança do boot automático", async () => {
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    await expect(bootstrapAdminIfConfigured()).resolves.toBeUndefined();
  });

  it("cria/atualiza o ADMIN quando as duas variáveis estão definidas — mesmo caminho usado no boot real do servidor", async () => {
    const email = `test-fixture-bootstrap-admin-env-${Date.now()}@example.invalid`;
    process.env.BOOTSTRAP_ADMIN_EMAIL = email;
    process.env.BOOTSTRAP_ADMIN_PASSWORD = "SenhaViaEnv789!";

    await bootstrapAdminIfConfigured();

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    userIds.push(user.id);
    expect(user.role).toBe(Role.ADMIN);
    expect(await verifyPassword("SenhaViaEnv789!", user.passwordHash!)).toBe(true);
  });
});
