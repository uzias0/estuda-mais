/**
 * Hook oficial do Next.js — `register()` roda UMA VEZ, automaticamente,
 * a cada boot do servidor (App Router, estável desde o Next 15, nenhuma
 * flag experimental necessária). Único uso hoje: recuperação de acesso
 * de ADMIN sem precisar de Shell (fase "recuperar admin sem Shell" —
 * pedido do usuário: "eu não tenho acesso o shell" do Render). Ver
 * `src/server/auth/bootstrap-admin.service.ts` para o contrato completo
 * de segurança (só age quando as duas variáveis de ambiente já estão
 * explicitamente definidas — nenhum valor padrão aqui).
 *
 * `NEXT_RUNTIME === "nodejs"`: este hook também é chamado no runtime
 * `edge` (middleware); Prisma/Node crypto não funcionam lá, então só
 * executa a lógica real no runtime Node de verdade.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapAdminIfConfigured } = await import("@/server/auth/bootstrap-admin.service");
    await bootstrapAdminIfConfigured();
  }
}
