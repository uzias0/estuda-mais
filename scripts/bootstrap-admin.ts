#!/usr/bin/env node
/**
 * Bootstrap do primeiro usuário ADMIN (etapa de consolidação, seção 18 do
 * prompt) — todo cadastro real (`signUp`,
 * `src/modules/auth/server/services/auth.service.ts`) nasce `Role.STUDENT`,
 * de propósito (nunca aceita `role` do cliente). Isso cria o problema
 * clássico de "ovo e galinha": alguém precisa ser o primeiro ADMIN para
 * promover outros curadores depois. Este script resolve isso da mesma
 * forma que qualquer aplicação real resolve — um utilitário de operação,
 * fora do fluxo HTTP, que só quem tem acesso ao servidor/ao banco pode
 * rodar. Reaproveita `hashPassword` real (`src/server/auth/password.ts`) —
 * não duplica o algoritmo.
 *
 * Idempotente: se o e-mail já existir, apenas atualiza senha/role (nunca
 * cria um segundo usuário). Lê credenciais de variáveis de ambiente, com
 * fallback para um e-mail/senha fixos de DESENVOLVIMENTO — troque a senha
 * assim que possível; em produção, `BOOTSTRAP_ADMIN_EMAIL`/
 * `BOOTSTRAP_ADMIN_PASSWORD` DEVEM ser definidos com valores reais.
 *
 * Executado via `tsx` (`npm run db:seed-admin`) — dependência de
 * desenvolvimento adicionada especificamente para isto: o Prisma 7
 * (`provider = "prisma-client"`) gera só TypeScript com imports relativos
 * sem extensão (resolução de bundler/`tsc`, não de Node ESM puro); `node
 * script.mjs` puro não consegue importar o client gerado (confirmado —
 * `ERR_MODULE_NOT_FOUND` nos imports internos do próprio Prisma). `tsx` é
 * a ferramenta padrão mínima para isto, sem exigir build prévio nem mudar
 * o generator do schema.
 *
 * Uso:
 *   npm run db:seed-admin
 *   BOOTSTRAP_ADMIN_EMAIL=admin@real.com BOOTSTRAP_ADMIN_PASSWORD=SenhaForte123! npm run db:seed-admin
 */
import "dotenv/config"; // mesmo padrão de prisma.config.ts — tsx não carrega .env por conta própria
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { hashPassword } from "@/server/auth/password";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@estuda.local";
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "TrocarSenha123!";
const isDefaultCredential =
  !process.env.BOOTSTRAP_ADMIN_EMAIL || !process.env.BOOTSTRAP_ADMIN_PASSWORD;

async function main() {
  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: Role.ADMIN },
    });
    console.log(
      `[bootstrap-admin] usuário existente atualizado: ${email} (role=ADMIN, senha redefinida)`,
    );
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.ADMIN,
        profile: { create: { name: "Administrador" } },
      },
    });
    console.log(`[bootstrap-admin] usuário ADMIN criado: ${email}`);
  }

  if (isDefaultCredential) {
    console.warn(
      "[bootstrap-admin] ATENÇÃO: usando e-mail/senha padrão de DESENVOLVIMENTO " +
        "(BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD não definidos). " +
        "NUNCA use este padrão em produção — defina as duas variáveis com valores reais.",
    );
  }
}

main()
  .catch((err) => {
    console.error("[bootstrap-admin] falhou:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
