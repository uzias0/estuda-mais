/**
 * Testes de integração reais da gestão de dois fatores (configurar/
 * desativar) — contra o Postgres real. O fluxo de LOGIN com 2FA
 * (`completeTwoFactorSignIn`) é testado em `auth.service.test.ts`, não
 * aqui (este arquivo é só a gestão em si).
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { generateTotpCode } from "@/server/auth/totp";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  getTwoFactorStatus,
  consumeRecoveryCode,
  TwoFactorError,
} from "./two-factor.service";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";
import { hashPassword } from "@/server/auth/password";

describe("two-factor.service", () => {
  const userIds: string[] = [];

  async function makeActor() {
    const user = await createFixtureUser("2fa", Role.STUDENT);
    userIds.push(user.id);
    return { userId: user.id, role: Role.STUDENT };
  }

  it("getTwoFactorStatus começa desativado para um usuário novo", async () => {
    const actor = await makeActor();
    expect(await getTwoFactorStatus(actor)).toEqual({ enabled: false });
  });

  it("beginTwoFactorSetup grava um segredo mas NÃO ativa 2FA sozinho", async () => {
    const actor = await makeActor();
    const info = await beginTwoFactorSetup(actor);
    expect(info.secret).toMatch(/^[A-Z2-7]+$/);
    expect(info.otpAuthUri).toContain(info.secret);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    expect(user.twoFactorSecret).toBe(info.secret);
    expect(user.twoFactorEnabledAt).toBeNull();
    expect((await getTwoFactorStatus(actor)).enabled).toBe(false);
  });

  it("confirmTwoFactorSetup rejeita código errado, sem ativar nada", async () => {
    const actor = await makeActor();
    await beginTwoFactorSetup(actor);
    await expect(confirmTwoFactorSetup(actor, "000000")).rejects.toThrow(TwoFactorError);
    expect((await getTwoFactorStatus(actor)).enabled).toBe(false);
  });

  it("confirmTwoFactorSetup rejeita sem configuração em andamento", async () => {
    const actor = await makeActor();
    await expect(confirmTwoFactorSetup(actor, "123456")).rejects.toThrow(TwoFactorError);
  });

  it("confirmTwoFactorSetup com código certo ativa 2FA e devolve 10 códigos de recuperação únicos", async () => {
    const actor = await makeActor();
    const info = await beginTwoFactorSetup(actor);
    const code = generateTotpCode(info.secret);

    const recoveryCodes = await confirmTwoFactorSetup(actor, code);
    expect(recoveryCodes).toHaveLength(10);
    expect(new Set(recoveryCodes).size).toBe(10); // todos diferentes entre si.
    recoveryCodes.forEach((c) => expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/));

    expect((await getTwoFactorStatus(actor)).enabled).toBe(true);

    const storedCodes = await prisma.twoFactorRecoveryCode.findMany({
      where: { userId: actor.userId },
    });
    expect(storedCodes).toHaveLength(10);
    // Nenhum código de recuperação é gravado em texto puro.
    storedCodes.forEach((row) => expect(row.codeHash).not.toBe(recoveryCodes[0]));
  });

  it("consumeRecoveryCode aceita um código válido uma única vez (uso único)", async () => {
    const actor = await makeActor();
    const info = await beginTwoFactorSetup(actor);
    const code = generateTotpCode(info.secret);
    const [recoveryCode] = await confirmTwoFactorSetup(actor, code);

    expect(await consumeRecoveryCode(actor.userId, recoveryCode)).toBe(true);
    expect(await consumeRecoveryCode(actor.userId, recoveryCode)).toBe(false); // já usado.
  });

  it("consumeRecoveryCode tolera minúsculo/sem traço/espaços", async () => {
    const actor = await makeActor();
    const info = await beginTwoFactorSetup(actor);
    const code = generateTotpCode(info.secret);
    const [recoveryCode] = await confirmTwoFactorSetup(actor, code);

    const messy = ` ${recoveryCode.toLowerCase().replace("-", "")} `;
    expect(await consumeRecoveryCode(actor.userId, messy)).toBe(true);
  });

  it("disableTwoFactor exige a senha certa e remove segredo + códigos de recuperação", async () => {
    const user = await createFixtureUser("2fa-disable", Role.STUDENT);
    userIds.push(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword("SenhaForte123!") },
    });
    const actor = { userId: user.id, role: Role.STUDENT };

    const info = await beginTwoFactorSetup(actor);
    await confirmTwoFactorSetup(actor, generateTotpCode(info.secret));
    expect((await getTwoFactorStatus(actor)).enabled).toBe(true);

    await expect(disableTwoFactor(actor, "SenhaErrada")).rejects.toThrow(TwoFactorError);
    expect((await getTwoFactorStatus(actor)).enabled).toBe(true); // continua ativo.

    await disableTwoFactor(actor, "SenhaForte123!");
    expect((await getTwoFactorStatus(actor)).enabled).toBe(false);
    const remainingCodes = await prisma.twoFactorRecoveryCode.count({
      where: { userId: actor.userId },
    });
    expect(remainingCodes).toBe(0);
  });

  afterAll(async () => {
    await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: { in: userIds } } });
    await cleanupFixtures({ userIds });
    await prisma.$disconnect();
  });
});
