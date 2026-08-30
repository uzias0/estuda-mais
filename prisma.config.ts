// Configuração do Prisma CLI (migrate/generate/format/validate) — Prisma ORM 7.
//
// Na major 7, a conexão de banco NÃO fica mais no `datasource` do
// schema.prisma — fica aqui. Variáveis de ambiente não são carregadas
// automaticamente pelo CLI nesta versão, por isso o `import "dotenv/config"`
// abaixo é obrigatório (confirmado na documentação oficial e validado
// localmente com `npx prisma validate` / `generate`, Prisma CLI 7.9.1).
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
