/**
 * Fase "recuperar admin sem Shell" — achado real: `signIn`/`signUp`/
 * `requestPasswordReset` comparavam e-mail com diferenciação de
 * maiúsculas/minúsculas, então uma conta criada com uma capitalização
 * (ex.: `Admin@Exemplo.com`) nunca batia com o login digitado com outra
 * (ex.: `admin@exemplo.com`) — "E-mail ou senha inválidos" mesmo com a
 * senha certa. Corrigido na entrada (`auth.schema.ts`, `emailSchema`
 * normaliza pra minúsculas antes de qualquer comparação) — mas isso só
 * previne o problema em cadastros/logins NOVOS a partir de agora; contas
 * já existentes com e-mail em maiúsculas continuam com o valor antigo
 * gravado até alguém corrigir.
 *
 * Este módulo faz essa correção pontual, uma vez, em todas as contas já
 * existentes — mesmo padrão de módulo compartilhado (CLI +
 * Server Action administrativa) já usado por
 * `answer-length-bias-fix.service.ts`/`academic-person-portraits-fix.
 * service.ts`. Idempotente: e-mails já em minúsculas nunca são tocados.
 */
import { prisma } from "@/server/db";

export interface EmailNormalizationResult {
  userId: string;
  originalEmail: string;
  status: "normalized" | "already-lowercase" | "collision-skipped";
}

/**
 * Corrige o `email` de toda conta cujo valor gravado tenha alguma letra
 * maiúscula. Quando a versão em minúsculas já pertence a OUTRO usuário
 * (colisão real — dois cadastros que hoje só diferem pela capitalização
 * do e-mail), a conta é pulada e sinalizada — nunca mescla/apaga contas
 * automaticamente, isso exige uma decisão humana.
 */
export async function normalizeAllUserEmails(): Promise<{
  normalized: number;
  results: EmailNormalizationResult[];
}> {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const results: EmailNormalizationResult[] = [];
  let normalized = 0;

  for (const user of users) {
    const lower = user.email.toLowerCase();
    if (lower === user.email) {
      results.push({ userId: user.id, originalEmail: user.email, status: "already-lowercase" });
      continue;
    }

    const collision = await prisma.user.findFirst({
      where: { email: lower, id: { not: user.id } },
    });
    if (collision) {
      results.push({ userId: user.id, originalEmail: user.email, status: "collision-skipped" });
      continue;
    }

    await prisma.user.update({ where: { id: user.id }, data: { email: lower } });
    results.push({ userId: user.id, originalEmail: user.email, status: "normalized" });
    normalized++;
  }

  return { normalized, results };
}
