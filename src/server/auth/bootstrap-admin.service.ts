/**
 * Núcleo de "criar ou promover um usuário ADMIN por e-mail" — usado por
 * dois caminhos com contratos de segurança DIFERENTES, por isso vive
 * separado dos dois:
 *
 * 1. `scripts/bootstrap-admin.ts` (CLI, `npm run db:seed-admin`,
 *    invocado manualmente por quem tem acesso a um terminal contra o
 *    banco) — TEM um fallback de e-mail/senha de DESENVOLVIMENTO quando
 *    as variáveis de ambiente não estão definidas.
 * 2. `instrumentation.ts` (roda automaticamente toda vez que o servidor
 *    sobe, inclusive em produção, a cada boot) — NUNCA usa fallback: só
 *    age quando `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` estão
 *    EXPLICITAMENTE definidos. Existe pelo pedido do usuário: recuperar
 *    o acesso de ADMIN esquecido em produção sem precisar de Shell —
 *    só o dashboard do Render (aba "Environment", sem terminal nenhum),
 *    que já é a mesma autoridade de quem pode mexer no deploy do
 *    serviço. Reaplica a senha do env var a CADA boot do servidor
 *    enquanto as duas variáveis continuarem definidas — por isso é
 *    essencial REMOVER as duas do Render assim que o login funcionar,
 *    ou um restart futuro (por qualquer motivo, nem que seja um deploy
 *    de código não relacionado) reverteria a senha de volta pra esse
 *    valor, silenciosamente desfazendo uma troca de senha feita depois
 *    pelo app normal.
 */
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { hashPassword } from "@/server/auth/password";

export async function upsertAdminUser(
  email: string,
  password: string,
): Promise<{ created: boolean }> {
  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: Role.ADMIN },
    });
    return { created: false };
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.ADMIN,
      profile: { create: { name: "Administrador" } },
    },
  });
  return { created: true };
}

/**
 * Chamado por `instrumentation.ts` a cada boot do servidor — no-op
 * (nunca cria nada, nunca usa um valor padrão) a menos que as duas
 * variáveis estejam explicitamente definidas no ambiente de deploy.
 * Nunca lança: uma falha aqui não pode derrubar o boot do servidor
 * inteiro (só loga o erro).
 */
export async function bootstrapAdminIfConfigured(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) return;

  try {
    const { created } = await upsertAdminUser(email, password);
    console.log(
      `[bootstrap-admin-instrumentation] ${created ? "criado" : "atualizado (senha redefinida)"}: ${email} — ` +
        "REMOVA BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD do ambiente agora que o login funciona.",
    );
  } catch (e) {
    console.error("[bootstrap-admin-instrumentation] falhou:", e);
  }
}
