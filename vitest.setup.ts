// Prisma 7 não carrega .env automaticamente para o Client em runtime
// (só o CLI, via prisma.config.ts) — os testes precisam do próprio dotenv.
import "dotenv/config";
