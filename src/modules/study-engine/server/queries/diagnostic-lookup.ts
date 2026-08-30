/**
 * "O aluno já fez o diagnóstico?" (Módulo 10, seção 5/6) — o Módulo 3 nunca
 * persiste um resultado de diagnóstico, nem expõe "o diagnóstico mais
 * recente do usuário" (`getDiagnosticResult` exige um `sessionId`
 * explícito, ver docs/MODULO-8.md, "Análise inicial", mesmo achado). Este
 * módulo precisa localizar QUAL `StudySession` é o diagnóstico do usuário
 * para poder then delegar o CÁLCULO do resultado a `getDiagnosticResult`
 * (Módulo 3) — nunca recalculado aqui (seção 5: "não recalcular o
 * diagnóstico").
 *
 * Discriminador autoritativo: uma sessão de diagnóstico sempre tem pelo
 * menos uma `QuestionAttempt` em `AttemptContext.DIAGNOSTIC` — mesmo
 * critério já usado em `gamification-events.service.ts` (Módulo 9) para o
 * mesmo problema.
 */
import { prisma } from "@/server/db";
import { AttemptContext } from "@/generated/prisma/enums";

/**
 * Sessão de diagnóstico mais recente e JÁ ENCERRADA do usuário (a mais
 * recente por `endedAt`), ou `null` se ele nunca concluiu um diagnóstico.
 * Diagnósticos ainda em andamento (sem `endedAt`) não contam como
 * "realizados" — o aluno ainda não tem um resultado para usar como ponto
 * de partida.
 */
export async function findLatestFinishedDiagnosticSessionId(
  userId: string,
): Promise<string | null> {
  const session = await prisma.studySession.findFirst({
    where: {
      userId,
      endedAt: { not: null },
      attempts: { some: { context: AttemptContext.DIAGNOSTIC } },
    },
    orderBy: { endedAt: "desc" },
    select: { id: true },
  });
  return session?.id ?? null;
}
