/**
 * Fundação MÍNIMA de autenticação para este módulo — só o utilitário de
 * hash/verificação de senha que `User.passwordHash` vai precisar. Nenhuma
 * tela de login, sessão, OAuth, MFA ou recuperação de senha é criada aqui:
 * são funcionalidade de produto, fora do escopo da Fundação Técnica (ver
 * docs/MODULO-1.md, "Decisões técnicas" — decisão registrada de adiar
 * Auth.js/NextAuth para o módulo de Layout Principal/Autenticação).
 *
 * Usa `crypto.scrypt` da stdlib do Node — sem dependência nova só para isto.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;

/** Gera `salt:hash` (ambos hex) a partir de uma senha em texto puro. */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (plainPassword.length === 0) {
    throw new Error("Senha não pode ser vazia.");
  }
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(plainPassword, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/** Compara uma senha em texto puro contra um hash gerado por `hashPassword`. */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex) return false;

  const derivedKey = (await scryptAsync(plainPassword, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(hashHex, "hex");
  if (derivedKey.length !== storedKey.length) return false;

  return timingSafeEqual(derivedKey, storedKey);
}
