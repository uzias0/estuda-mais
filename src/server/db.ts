/**
 * Prisma Client singleton — Prisma ORM 7 exige um driver adapter explícito
 * (não existe mais engine binário embutido). Usamos `@prisma/adapter-pg`
 * (node-postgres) por ser o driver padrão para qualquer PostgreSQL acessado
 * via TCP — real, embutido para dev, ou gerenciado em produção.
 *
 * Padrão singleton em `globalThis` para sobreviver ao hot-reload do Next.js
 * em desenvolvimento (evita esgotar o pool de conexões a cada reload).
 *
 * Fonte: https://www.prisma.io/docs/orm/overview/databases/postgresql
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. Copie .env.example para .env e ajuste, " +
        "ou rode `npm run db:start` para subir o banco de desenvolvimento local.",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Só cacheia em `globalThis` no hot-reload do `next dev` — em teste/produção
// cada processo/arquivo deve ter sua própria instância (evita instância
// compartilhada e `$disconnect()` de um teste afetando outro).
if (process.env.NODE_ENV === "development") {
  globalForPrisma.prisma = prisma;
}
