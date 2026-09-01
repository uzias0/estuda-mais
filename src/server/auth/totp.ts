/**
 * TOTP — Time-based One-Time Password (RFC 6238, sobre HOTP/RFC 4226) — a
 * autenticação de dois fatores pedida pelo usuário ("na hora de criar uma
 * conta, ter verificação de dois fatores"). Implementado à mão sobre
 * `crypto.createHmac` da stdlib do Node — mesma decisão de
 * `src/server/auth/password.ts` ("sem dependência nova só para isto"): o
 * algoritmo é pequeno o bastante (Base32 + HMAC-SHA1 + truncamento
 * dinâmico) para não justificar uma dependência nova, ao contrário de gerar
 * a IMAGEM do QR code (ver `docs/FASE-2FA.md` — decisão de mostrar o
 * segredo em texto para digitação manual, não um QR, nesta entrega).
 *
 * Compatível com qualquer app autenticador padrão (Google Authenticator,
 * Authy, 1Password, Aegis, etc.) — todos implementam exatamente este RFC.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const CODE_DIGITS = 6;
/** Segredo de 20 bytes (160 bits) — tamanho recomendado pela RFC 4226 para HMAC-SHA1. */
const SECRET_BYTES = 20;

/** Codifica um `Buffer` em Base32 (RFC 4648, sem padding) — formato padrão de segredo TOTP. */
export function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let output = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  const remainder = bits.length % 5;
  if (remainder > 0) {
    const lastChunk = bits.slice(bits.length - remainder).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(lastChunk, 2)];
  }
  return output;
}

/** Decodifica Base32 (sem padding, case-insensitive) de volta a `Buffer` — inverso de `base32Encode`. */
export function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) continue;
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** Gera um novo segredo TOTP aleatório, já em Base32 (pronto para gravar/mostrar ao usuário). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(SECRET_BYTES));
}

/** Gera o código de `CODE_DIGITS` dígitos para o passo de tempo de `at` (RFC 6238 §4). */
export function generateTotpCode(secretBase32: string, at: Date = new Date()): string {
  const counter = Math.floor(at.getTime() / 1000 / STEP_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  counterBuffer.writeUInt32BE(counter % 2 ** 32, 4);

  const key = base32Decode(secretBase32);
  const hmac = createHmac("sha1", key).update(counterBuffer).digest();

  // Truncamento dinâmico (RFC 4226 §5.3).
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binaryCode % 10 ** CODE_DIGITS).toString().padStart(CODE_DIGITS, "0");
}

/**
 * Verifica um código digitado contra o segredo — aceita o passo ATUAL e um
 * passo antes/depois (`windowSteps=1`, ±30s) para tolerar pequena diferença
 * de relógio entre o celular do usuário e o servidor, prática padrão de
 * qualquer implementação TOTP real. Comparação com `timingSafeEqual`
 * (mesmo motivo de `verifyPassword`: nunca comparar segredo por `===`).
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  at: Date = new Date(),
  windowSteps: number = 1,
): boolean {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return false;

  for (let stepOffset = -windowSteps; stepOffset <= windowSteps; stepOffset++) {
    const candidateTime = new Date(at.getTime() + stepOffset * STEP_SECONDS * 1000);
    const expected = generateTotpCode(secretBase32, candidateTime);
    if (
      expected.length === trimmed.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(trimmed))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * URI `otpauth://` padrão (RFC do Google Authenticator, adotado por todo
 * app do mercado) — usada nesta entrega só como texto/link (sem gerar
 * imagem de QR code, ver comentário do topo do arquivo). Alguns apps
 * (ex.: Authy no desktop) aceitam colar este link diretamente.
 */
export function buildOtpAuthUri(secretBase32: string, accountEmail: string): string {
  const issuer = "Estuda+";
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&digits=${CODE_DIGITS}&period=${STEP_SECONDS}`;
}
