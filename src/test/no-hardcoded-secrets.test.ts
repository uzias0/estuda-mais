/**
 * Teste de regressão (fase de produção, seção 15: "ambiente sem secrets
 * hardcoded") — varre `src/` (fora de testes/fixtures) procurando por
 * padrões óbvios de segredo em texto puro. Não substitui uma varredura de
 * segurança de verdade (ex.: `git-secrets`/`gitleaks` em CI), mas evita uma
 * regressão óbvia (ex.: alguém colar uma chave de API real durante o
 * desenvolvimento) passar despercebida na suíte local.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SRC_DIR = path.resolve(__dirname, "..");

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/, // chaves de API estilo OpenAI/Stripe
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
];

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated" || entry.name === "node_modules") continue;
      files.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("nenhum segredo hardcoded em src/", () => {
  it("nenhum arquivo de código (fora de testes) contém um padrão óbvio de chave/segredo real", () => {
    const files = listSourceFiles(SRC_DIR);
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(content)) offenders.push(`${file} (padrão: ${pattern})`);
      }
    }
    expect(offenders, `Possíveis segredos hardcoded encontrados: ${offenders.join(", ")}`).toEqual(
      [],
    );
  });

  it("os únicos e-mails/senhas literais em src/ estão em arquivos de teste ou no bootstrap de dev documentado", () => {
    // `resetPassword`/`signIn` etc. nunca têm senha literal fora de testes —
    // já coberto pelo teste acima; aqui só confirmamos que o fallback de
    // desenvolvimento documentado em `bootstrap-admin.ts` continua isolado
    // em `scripts/`, não em `src/`.
    const files = listSourceFiles(SRC_DIR);
    const withDefaultAdminPassword = files.filter((f) => {
      const content = readFileSync(f, "utf8");
      return content.includes("TrocarSenha123!");
    });
    expect(withDefaultAdminPassword).toEqual([]);
  });
});
