/**
 * Identificação de versão do app (fase de produção, seção 13: "criar uma
 * forma simples e confiável de identificar a versão atualmente publicada").
 * `APP_VERSION` vem de `package.json` (única fonte — nunca duplicada),
 * mesmo valor usado como `versionName` do projeto Android
 * (`android/app/build.gradle`, mantido em sincronia manualmente a cada
 * release). `GIT_COMMIT`/`ENVIRONMENT` vêm de variáveis de ambiente que a
 * plataforma de deploy normalmente injeta (ex.: `VERCEL_GIT_COMMIT_SHA`,
 * `RAILWAY_GIT_COMMIT_SHA`) — nunca inventadas quando ausentes, ficam
 * `null`/"desconhecido" em vez de um valor falso.
 */
import packageJson from "../../package.json";

export const APP_VERSION: string = packageJson.version;

export const GIT_COMMIT: string | null =
  process.env.GIT_COMMIT_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.RAILWAY_GIT_COMMIT_SHA ??
  null;

export const APP_ENVIRONMENT: string = process.env.NODE_ENV ?? "development";
