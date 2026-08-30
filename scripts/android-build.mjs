#!/usr/bin/env node
/**
 * `npm run android:build` (fase de build do APK/teste em celular real) —
 * verifica pré-requisitos ANTES de rodar o Gradle e dá uma mensagem clara
 * e acionável em vez do stack trace cru do Gradle (Objetivo 4: "não
 * esconda erro de ambiente" — aqui o erro fica MAIS visível/acionável, não
 * escondido: a causa raiz e a correção aparecem antes de qualquer coisa
 * rodar).
 *
 * Não instala nada sozinho (JDK/Android SDK são decisões de máquina do
 * desenvolvedor, não deste script) — só diagnostica e aponta o caminho.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ANDROID_DIR = path.join(ROOT, "android");

function fail(message) {
  console.error(`\n[android:build] ${message}\n`);
  process.exitCode = 1;
}

function getJavaMajorVersion() {
  // `java -version` historicamente escreve em stderr (mesmo com exit code
  // 0) — `spawnSync` captura os dois independente do status de saída,
  // diferente de `execFileSync` (que só devolve stdout em caso de sucesso).
  const result = spawnSync("java", ["-version"], { encoding: "utf8" });
  if (result.error) return null; // `java` nem existe no PATH
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function parseJavaMajor(versionOutput) {
  if (!versionOutput) return null;
  // Formatos possíveis: `java version "1.8.0_401"` (legado) ou `openjdk version "17.0.9"` (moderno).
  const legacyMatch = versionOutput.match(/version "1\.(\d+)\./);
  if (legacyMatch) return Number(legacyMatch[1]);
  const modernMatch = versionOutput.match(/version "(\d+)\./);
  if (modernMatch) return Number(modernMatch[1]);
  return null;
}

function checkPrerequisites() {
  const problems = [];

  const javaOutput = getJavaMajorVersion();
  if (!javaOutput) {
    problems.push(
      "Java não encontrado no PATH. Instale o JDK 17+ (o Android Studio já inclui um em " +
        "'Android Studio > Settings > Build Tools > Gradle > Gradle JDK') e garanta que `java -version` funcione no terminal.",
    );
  } else {
    const major = parseJavaMajor(javaOutput);
    if (major === null) {
      problems.push(`Não consegui interpretar a versão do Java a partir de: ${javaOutput.trim()}`);
    } else if (major < 17) {
      problems.push(
        `Java ${major} encontrado — o Android Gradle Plugin exige Java 11+ (recomendado 17+). ` +
          "Instale um JDK 17+ e aponte JAVA_HOME/PATH para ele (o Android Studio já traz um embutido).",
      );
    }
  }

  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!androidHome || !existsSync(androidHome)) {
    problems.push(
      "ANDROID_HOME/ANDROID_SDK_ROOT não definida ou aponta para um diretório inexistente. " +
        "Instale o Android Studio (ele já inclui o SDK Manager) e defina a variável de ambiente " +
        "para o caminho do SDK (ex.: no Windows, normalmente " +
        "'%LOCALAPPDATA%\\Android\\Sdk'; no macOS/Linux, '~/Library/Android/sdk' ou '~/Android/Sdk'). " +
        "Veja docs/ANDROID-TESTE.md para o passo a passo completo.",
    );
  }

  if (!existsSync(ANDROID_DIR)) {
    problems.push(
      "Diretório android/ não encontrado — rode `npx cap add android` primeiro (deveria já existir neste projeto).",
    );
  }

  return problems;
}

function main() {
  console.log("[android:build] verificando pré-requisitos...");
  const problems = checkPrerequisites();
  if (problems.length > 0) {
    console.error("\n[android:build] Pré-requisitos ausentes — o build NÃO foi iniciado:\n");
    for (const p of problems) console.error(`  - ${p}`);
    console.error("\nCorrija os itens acima e rode `npm run android:build` de novo.\n");
    process.exitCode = 1;
    return;
  }

  console.log("[android:build] pré-requisitos ok — rodando o Gradle (pode demorar na 1ª vez)...");
  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  const result = spawnSync(gradlew, ["assembleDebug"], {
    cwd: ANDROID_DIR,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    fail(
      "O Gradle rodou mas falhou (ver saída acima para o erro real). Nenhum APK foi gerado — " +
        "não declarando sucesso.",
    );
    return;
  }

  const apkPath = path.join(
    ANDROID_DIR,
    "app",
    "build",
    "outputs",
    "apk",
    "debug",
    "app-debug.apk",
  );
  if (existsSync(apkPath)) {
    console.log(`\n[android:build] APK gerado com sucesso: ${apkPath}\n`);
  } else {
    fail(
      `Gradle terminou sem erro, mas o APK esperado não foi encontrado em ${apkPath}. ` +
        "Verifique a saída do Gradle acima.",
    );
  }
}

main();
