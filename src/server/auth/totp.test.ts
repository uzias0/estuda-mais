/**
 * Testes de `totp.ts` — inclui os vetores de teste OFICIAIS da RFC 6238
 * (Apêndice B, SHA1) para confirmar que a implementação bate byte a byte
 * com a especificação, não só "parece certo". A RFC usa códigos de 8
 * dígitos no apêndice; como o truncamento é sempre `binaryCode % 10^N`,
 * `binaryCode % 10^6` é matematicamente igual aos 6 últimos dígitos do
 * valor de 8 dígitos publicado — por isso os vetores abaixo usam só os 6
 * últimos dígitos de cada valor oficial da RFC.
 */
import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  buildOtpAuthUri,
} from "./totp";

describe("base32Encode/base32Decode", () => {
  it("faz round-trip sem perder bytes, para vários tamanhos", () => {
    for (const size of [1, 5, 10, 16, 20, 32]) {
      const original = Buffer.from(Array.from({ length: size }, (_, i) => i * 7 + 1));
      const encoded = base32Encode(original);
      const decoded = base32Decode(encoded);
      expect(decoded.equals(original)).toBe(true);
    }
  });

  it("usa só o alfabeto Base32 padrão (A-Z, 2-7), sem padding '='", () => {
    const encoded = base32Encode(Buffer.from("qualquer coisa aqui"));
    expect(encoded).toMatch(/^[A-Z2-7]+$/);
  });
});

describe("generateTotpSecret", () => {
  it("gera um segredo Base32 válido e diferente a cada chamada", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).toMatch(/^[A-Z2-7]+$/);
    expect(a).not.toBe(b);
  });
});

describe("generateTotpCode — vetores oficiais da RFC 6238 (Apêndice B, SHA1)", () => {
  // Segredo ASCII "12345678901234567890" (20 bytes) — o mesmo da RFC,
  // convertido para Base32 (formato que `generateTotpCode` espera).
  const RFC_SECRET_BASE32 = base32Encode(Buffer.from("12345678901234567890", "ascii"));

  const VECTORS: Array<[number, string]> = [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ];

  it.each(VECTORS)("T=%i segundos → código %s", (unixSeconds, expectedCode) => {
    const code = generateTotpCode(RFC_SECRET_BASE32, new Date(unixSeconds * 1000));
    expect(code).toBe(expectedCode);
  });
});

describe("verifyTotpCode", () => {
  const secret = generateTotpSecret();
  const now = new Date(1_800_000_000_000);

  it("aceita o código correto do instante atual", () => {
    const code = generateTotpCode(secret, now);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
  });

  it("aceita o código de 1 passo antes/depois (tolerância de relógio)", () => {
    const oneStepBefore = new Date(now.getTime() - 30_000);
    const code = generateTotpCode(secret, oneStepBefore);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
  });

  it("rejeita um código de 2 passos de distância (fora da janela de tolerância)", () => {
    const twoStepsBefore = new Date(now.getTime() - 60_000);
    const code = generateTotpCode(secret, twoStepsBefore);
    expect(verifyTotpCode(secret, code, now)).toBe(false);
  });

  it("rejeita código errado/forjado", () => {
    expect(verifyTotpCode(secret, "000000", now)).toBe(false);
  });

  it("rejeita entrada que não seja exatamente 6 dígitos", () => {
    expect(verifyTotpCode(secret, "12345", now)).toBe(false);
    expect(verifyTotpCode(secret, "1234567", now)).toBe(false);
    expect(verifyTotpCode(secret, "abcdef", now)).toBe(false);
  });

  it("ignora espaços em volta do código (usuário digitando com espaço sem querer)", () => {
    const code = generateTotpCode(secret, now);
    expect(verifyTotpCode(secret, ` ${code} `, now)).toBe(true);
  });
});

describe("buildOtpAuthUri", () => {
  it("gera uma URI otpauth:// válida com o segredo e o e-mail", () => {
    const uri = buildOtpAuthUri("JBSWY3DPEHPK3PXP", "aluno@example.invalid");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=Estuda");
    expect(uri).toContain(encodeURIComponent("aluno@example.invalid"));
  });
});
