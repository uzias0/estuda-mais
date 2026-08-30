/**
 * Health check mínimo (fase de produção, seção 11: "observabilidade
 * mínima" — descobrir se o app está indisponível/erro de banco). Sem
 * autenticação (precisa ser alcançável por um monitor externo simples) e
 * sem expor nenhum dado sensível — só um booleano de conectividade com o
 * Postgres real e a versão publicada (`app-version.ts`).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { APP_VERSION, GIT_COMMIT, APP_ENVIRONMENT } from "@/config/app-version";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "ok",
      version: APP_VERSION,
      commit: GIT_COMMIT,
      environment: APP_ENVIRONMENT,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
        version: APP_VERSION,
        commit: GIT_COMMIT,
        environment: APP_ENVIRONMENT,
      },
      { status: 503 },
    );
  }
}
