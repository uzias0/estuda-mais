#!/usr/bin/env node
/**
 * Banco de desenvolvimento local — PostgreSQL real embutido (sem Docker,
 * sem instalação de serviço no SO, sem privilégio de administrador).
 *
 * Decisão registrada em docs/MODULO-1.md, seção "Decisões técnicas":
 * o ambiente de scaffold não tinha Docker nem PostgreSQL instalados, então
 * usamos o pacote `embedded-postgres` (binário real do Postgres, baixado
 * uma vez) como banco de DESENVOLVIMENTO e TESTE. Em qualquer ambiente com
 * Docker ou um Postgres gerenciado disponível, basta apontar DATABASE_URL
 * para esse serviço real — nenhum código do projeto muda.
 *
 * IMPORTANTE (Windows): este pacote não daemoniza de verdade no Windows —
 * o servidor fica atrelado ao processo Node que o iniciou. Por isso `start`
 * roda em PRIMEIRO PLANO e fica "segurando" o processo, igual a `next dev`:
 * deixe rodando em um terminal dedicado enquanto desenvolve, e pare com
 * Ctrl+C ou `npm run db:stop` em outro terminal.
 *
 * `stop` invoca `pg_ctl -m fast stop` diretamente pelo binário da própria
 * dependência (resolvido de forma independente de plataforma) em vez de
 * confiar no wrapper JS a partir de uma instância nova — na prática, chamar
 * `.stop()` de uma instância recém-criada (sem o `start()` correspondente)
 * se mostrou pouco confiável neste ambiente.
 *
 * Uso:
 *   npm run db:start    (mantém o terminal ocupado — como um servidor)
 *   npm run db:stop     (comando único, para de outro terminal)
 *   npm run db:status   (comando único)
 */
import EmbeddedPostgres from "embedded-postgres";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", ".dev-db", "pgdata");

const PORT = Number(process.env.DEV_DB_PORT ?? 55432);
const USER = process.env.DEV_DB_USER ?? "estuda";
const PASSWORD = process.env.DEV_DB_PASSWORD ?? "estuda_dev_local_only";
const DATABASE = process.env.DEV_DB_NAME ?? "estuda_dev";

function makeInstance() {
  return new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true, // mantém os dados entre reinícios
  });
}

/** Mesma resolução de pacote por plataforma que `embedded-postgres` usa internamente. */
function platformPackageName() {
  const arch = os.arch();
  const platform = os.platform();
  const table = {
    darwin: { arm64: "@embedded-postgres/darwin-arm64", x64: "@embedded-postgres/darwin-x64" },
    linux: {
      arm64: "@embedded-postgres/linux-arm64",
      arm: "@embedded-postgres/linux-arm",
      ia32: "@embedded-postgres/linux-ia32",
      ppc64: "@embedded-postgres/linux-ppc64",
      x64: "@embedded-postgres/linux-x64",
    },
    win32: { x64: "@embedded-postgres/windows-x64" },
  };
  const pkg = table[platform]?.[arch];
  if (!pkg) throw new Error(`Plataforma não suportada: ${platform}/${arch}`);
  return pkg;
}

function resolvePgCtlPath() {
  // O "exports" do package.json só expõe "./dist/index.js" (não
  // "./package.json"), então resolvemos o entrypoint principal e subimos
  // dois níveis (<root>/dist/index.js -> <root>) em vez de pedir o
  // package.json diretamente.
  const entryPoint = require.resolve(platformPackageName());
  const pkgRoot = path.dirname(path.dirname(entryPoint));
  const bin = os.platform() === "win32" ? "pg_ctl.exe" : "pg_ctl";
  return path.join(pkgRoot, "native", "bin", bin);
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function start() {
  if (await isPortOpen(PORT)) {
    console.log(`[dev-db] já rodando em 127.0.0.1:${PORT}`);
    return;
  }
  const pg = makeInstance();
  // `pg.initialise()` roda `initdb` incondicionalmente e FALHA se o diretório
  // já tiver um cluster (ex.: reinício após um `db:stop` anterior) — por
  // isso o guard explícito, checando o marcador que o próprio initdb cria.
  const alreadyInitialised = existsSync(path.join(DATA_DIR, "PG_VERSION"));
  if (!alreadyInitialised) {
    await pg.initialise();
  }
  await pg.start();
  console.log(`[dev-db] pronto em 127.0.0.1:${PORT}, database "${DATABASE}"`);
  console.log(
    `[dev-db] DATABASE_URL="postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}"`,
  );
  try {
    await pg.createDatabase(DATABASE);
    console.log(`[dev-db] database "${DATABASE}" criado`);
  } catch {
    // banco já existe — normal em reinícios subsequentes
  }
  console.log(
    "[dev-db] segurando o processo — Ctrl+C para parar, ou `npm run db:stop` em outro terminal",
  );

  const shutdown = async () => {
    console.log("\n[dev-db] parando...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  await new Promise(() => {}); // mantém o processo vivo, como um servidor
}

async function stop() {
  if (!(await isPortOpen(PORT))) {
    console.log("[dev-db] não está rodando");
    return;
  }
  const pgCtl = resolvePgCtlPath();
  await execFileAsync(pgCtl, ["-D", DATA_DIR, "-m", "fast", "stop"]);
  console.log("[dev-db] parado");
}

async function status() {
  const open = await isPortOpen(PORT);
  console.log(open ? `[dev-db] rodando em ${PORT}` : "[dev-db] parado");
}

const cmd = process.argv[2];
if (cmd === "start") {
  await start();
} else if (cmd === "stop") {
  await stop();
  process.exit(0);
} else if (cmd === "status") {
  await status();
  process.exit(0);
} else {
  console.error("Uso: node scripts/dev-db.mjs <start|stop|status>");
  process.exit(1);
}
