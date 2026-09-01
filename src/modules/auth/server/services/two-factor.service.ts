/**
 * Autenticação de dois fatores real (pedido do usuário: "na hora de criar
 * uma conta, ter verificação de dois fatores" — implementada como TOTP,
 * compatível com qualquer app autenticador padrão, ver `src/server/auth/
 * totp.ts`). Mesmo padrão de `password-reset.service.ts`: nenhuma regra de
 * hashing duplicada — reaproveita `hashPassword`/`verifyPassword` (Módulo
 * 1) para os CÓDIGOS DE RECUPERAÇÃO (mesmo nível de segredo que uma senha,
 * mesmo tratamento).
 *
 * Fluxo de configuração (3 etapas, nunca ativa 2FA sem confirmação real):
 *   1. `beginTwoFactorSetup(actor)` — gera um novo segredo, grava (mas
 *      `twoFactorEnabledAt` continua `null`) e devolve o segredo + URI
 *      `otpauth://` para o usuário digitar/colar no app autenticador.
 *   2. `confirmTwoFactorSetup(actor, code)` — exige um código válido de
 *      verdade contra o segredo já gravado; só AQUI `twoFactorEnabledAt`
 *      passa a existir, e os códigos de recuperação são gerados (mostrados
 *      em texto puro UMA ÚNICA VEZ — nunca recuperáveis depois, mesmo
 *      padrão de qualquer provedor real).
 *   3. `disableTwoFactor(actor, password)` — exige a senha atual (nunca só
 *      "clicar desativar"), remove segredo + códigos de recuperação.
 *
 * Verificação no login (`completeTwoFactorSignIn`) mora em `auth.service.ts`
 * (junto de `signIn`), não aqui — este arquivo é só a gestão do 2FA em si
 * (configurar/desativar), não o fluxo de login.
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { generateTotpSecret, verifyTotpCode, buildOtpAuthUri } from "@/server/auth/totp";
import { randomBytes } from "node:crypto";

export class TwoFactorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TwoFactorError";
  }
}

const RECOVERY_CODE_COUNT = 10;

/** Gera um código de recuperação legível (`XXXX-XXXX`, letras maiúsculas + dígitos, sem 0/O/1/I para evitar confusão visual). */
function generateRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length];
    if (i === 3) code += "-";
  }
  return code;
}

/** Forma canônica (só A-Z0-9, maiúsculo) usada para hashear/comparar — tolera o usuário digitar sem o traço, em minúsculo, ou com espaço. */
function canonicalizeRecoveryCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export interface TwoFactorSetupInfo {
  secret: string;
  otpAuthUri: string;
}

/**
 * Inicia (ou reinicia) a configuração — gera um segredo NOVO e o grava,
 * mas não ativa nada ainda. Chamar de novo antes de confirmar simplesmente
 * substitui o segredo pendente anterior (nenhum efeito colateral: 2FA só
 * conta como ativo depois de `confirmTwoFactorSetup`).
 */
export async function beginTwoFactorSetup(actor: Actor): Promise<TwoFactorSetupInfo> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: actor.userId }, data: { twoFactorSecret: secret } });
  return { secret, otpAuthUri: buildOtpAuthUri(secret, user.email) };
}

/**
 * Confirma a configuração com um código real do app autenticador — só
 * aqui `twoFactorEnabledAt` passa a existir. Gera e devolve os códigos de
 * recuperação em texto puro (única vez — o banco só guarda o hash de cada
 * um, mesmo tratamento de senha).
 */
export async function confirmTwoFactorSetup(actor: Actor, code: string): Promise<string[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (!user.twoFactorSecret) {
    throw new TwoFactorError(
      "Nenhuma configuração de dois fatores em andamento — chame beginTwoFactorSetup primeiro.",
    );
  }
  if (!verifyTotpCode(user.twoFactorSecret, code)) {
    throw new TwoFactorError("Código inválido. Confira o horário do seu celular e tente de novo.");
  }

  const plainCodes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
  const hashedCodes = await Promise.all(
    plainCodes.map((c) => hashPassword(canonicalizeRecoveryCode(c))),
  );

  await prisma.$transaction([
    prisma.user.update({ where: { id: actor.userId }, data: { twoFactorEnabledAt: new Date() } }),
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: actor.userId } }),
    prisma.twoFactorRecoveryCode.createMany({
      data: hashedCodes.map((codeHash) => ({ userId: actor.userId, codeHash })),
    }),
  ]);

  return plainCodes;
}

/** Desativa 2FA — exige a senha atual (nunca só um clique) para evitar que uma sessão sequestrada desative a proteção sozinha. */
export async function disableTwoFactor(actor: Actor, password: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new TwoFactorError("Senha incorreta.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: actor.userId },
      data: { twoFactorSecret: null, twoFactorEnabledAt: null },
    }),
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: actor.userId } }),
  ]);
}

export async function getTwoFactorStatus(actor: Actor): Promise<{ enabled: boolean }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
  return { enabled: user.twoFactorEnabledAt !== null };
}

/**
 * Consome (uso único) um código de recuperação — usado como alternativa ao
 * TOTP no login, para quem perdeu o celular. Verifica contra TODOS os
 * hashes ainda não usados (não há como indexar por código em si, já que só
 * o hash é guardado); marca o primeiro que bater como usado.
 */
export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const candidates = await prisma.twoFactorRecoveryCode.findMany({
    where: { userId, usedAt: null },
  });
  const canonical = canonicalizeRecoveryCode(code);
  for (const candidate of candidates) {
    if (await verifyPassword(canonical, candidate.codeHash)) {
      await prisma.twoFactorRecoveryCode.update({
        where: { id: candidate.id },
        data: { usedAt: new Date() },
      });
      return true;
    }
  }
  return false;
}
