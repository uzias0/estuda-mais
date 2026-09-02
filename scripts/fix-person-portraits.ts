#!/usr/bin/env node
/**
 * CLI fino sobre `applyPersonPortraits`
 * (`src/modules/knowledge/server/services/academic-person-portraits-fix.service.ts`)
 * — toda a lista de retratos e a lógica de aplicação vivem lá (também
 * usada pela Server Action administrativa `/admin/manutencao`). Ver o
 * comentário completo naquele arquivo.
 *
 * Uso: npm run db:fix-person-portraits
 */
import "dotenv/config";
import { prisma } from "@/server/db";
import { applyPersonPortraits } from "@/modules/knowledge/server/services/academic-person-portraits-fix.service";
import { resolveSeedActor } from "./seed-academic-content";

async function main() {
  const actor = await resolveSeedActor();
  const { updated, results } = await applyPersonPortraits(actor);

  for (const r of results) {
    if (r.status === "not-found") {
      console.warn(`[fix-person-portraits] pessoa "${r.slug}" não encontrada — pulando`);
    } else if (r.status === "already-up-to-date") {
      console.log(`[fix-person-portraits] ${r.name} já está atualizada — pulando`);
    } else {
      console.log(`[fix-person-portraits] retrato definido: ${r.name}`);
    }
  }

  console.log(`\n[fix-person-portraits] concluído: ${updated} pessoa(s) atualizada(s).`);
}

main()
  .catch((e) => {
    console.error("[fix-person-portraits] falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
