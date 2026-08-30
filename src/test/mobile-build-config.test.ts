/**
 * Testes de configuração mobile (fase de build do APK/teste em celular
 * real, Objetivo 13) — não substituem testar o APK de verdade num
 * dispositivo (impossível neste ambiente, ver docs/ANDROID-TESTE.md), mas
 * travam regressões óbvias e baratas de detectar: nenhuma URL de
 * localhost/IP privado hardcoded como padrão de produção, versionamento
 * consistente entre `package.json` e o projeto Android, e o placeholder de
 * `appId` continua claramente identificável como placeholder.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import capacitorConfig from "../../capacitor.config";
import packageJson from "../../package.json";

const ROOT = path.resolve(__dirname, "../..");

describe("capacitor.config.ts", () => {
  it("nunca usa localhost/127.0.0.1/IP privado como server.url padrão (só um placeholder claramente inválido)", () => {
    const url = capacitorConfig.server?.url ?? "";
    expect(url).not.toMatch(/localhost/i);
    expect(url).not.toMatch(/127\.0\.0\.1/);
    expect(url).not.toMatch(/192\.168\.\d+\.\d+/);
    expect(url).not.toMatch(/^http:\/\//); // nunca HTTP puro por padrão
  });

  it("nunca permite tráfego em texto puro (cleartext)", () => {
    expect(capacitorConfig.server?.cleartext).toBe(false);
  });

  it("tem uma página de erro de rede estática configurada (errorPath)", () => {
    expect(capacitorConfig.server?.errorPath).toBe("mobile-offline.html");
  });

  it("appId ainda é reconhecível como placeholder (precisa ser trocado antes da Play Store)", () => {
    // Não é um teste de "valor correto" (não há um valor correto genérico) —
    // só um lembrete estrutural: se alguém trocar para um domínio real, este
    // teste passa a falhar e força atualizar o comentário/documentação.
    expect(capacitorConfig.appId).toBe("com.estudamais.app");
  });
});

describe("versionamento — package.json em sincronia com o projeto Android", () => {
  it("android/app/build.gradle usa o mesmo versionName de package.json", () => {
    const buildGradle = readFileSync(path.join(ROOT, "android/app/build.gradle"), "utf8");
    expect(buildGradle).toContain(`versionName "${packageJson.version}"`);
  });

  it("package.json.version segue o formato semver (com prerelease opcional)", () => {
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/);
  });
});

describe("mobile-offline.html — página de erro de rede do wrapper Android", () => {
  it("existe, é estática, e não referencia nenhum script/domínio externo", () => {
    const html = readFileSync(path.join(ROOT, "public/mobile-offline.html"), "utf8");
    expect(html).toContain("Sem conexão");
    expect(html).not.toMatch(/<script[^>]+src=/i); // nenhum script externo
    expect(html).not.toMatch(/https?:\/\//); // nenhuma URL remota (100% offline-safe)
  });
});
