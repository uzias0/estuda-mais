#!/usr/bin/env node
/**
 * CLI fino sobre `normalizeAllUserEmails`
 * (`src/server/auth/normalize-user-emails.service.ts`) — toda a lógica
 * vive lá (também usada pela Server Action administrativa
 * `/admin/manutencao`). Ver o comentário completo naquele arquivo.
 *
 * Uso: npm run db:normalize-emails
 */
import "dotenv/config";
import { prisma } from "@/server/db";
import { normalizeAllUserEmails } from "@/server/auth/normalize-user-emails.service";

async function main() {
  const { normalized, results } = await normalizeAllUserEmails();

  for (const r of results) {
    if (r.status === "normalized") {
      console.log(`[normalize-user-emails] corrigido: ${r.originalEmail}`);
    } else if (r.status === "collision-skipped") {
      console.warn(
        `[normalize-user-emails] PULADO (já existe outra conta com a versão em minúsculas): ${r.originalEmail}`,
      );
    }
  }

  console.log(`\n[normalize-user-emails] concluído: ${normalized} conta(s) corrigida(s).`);
}

main()
  .catch((e) => {
    console.error("[normalize-user-emails] falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
