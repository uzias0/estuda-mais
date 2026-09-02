#!/usr/bin/env node
/**
 * CLI fino sobre `applyAnswerLengthBiasFixes`
 * (`src/modules/assessment/server/services/answer-length-bias-fix.service.ts`)
 * — toda a lista de correções e a lógica de aplicação vivem lá (também
 * usada pela Server Action administrativa `/admin/manutencao`, para quem
 * não tem acesso a um terminal contra o banco de produção). Ver o
 * comentário completo naquele arquivo.
 *
 * Uso: npm run db:fix-answer-length-bias
 */
import "dotenv/config";
import { prisma } from "@/server/db";
import { applyAnswerLengthBiasFixes } from "@/modules/assessment/server/services/answer-length-bias-fix.service";
import { resolveSeedActor } from "./seed-academic-content";

async function main() {
  const actor = await resolveSeedActor();
  const { fixed, results } = await applyAnswerLengthBiasFixes(actor);

  for (const r of results) {
    if (r.status === "not-found") {
      console.warn(`[fix-answer-length-bias] questão ${r.questionId} não encontrada — pulando`);
    } else if (r.status === "already-up-to-date") {
      console.log(`[fix-answer-length-bias] ${r.questionId} já está atualizada — pulando`);
    } else {
      console.log(`[fix-answer-length-bias] corrigida: ${r.promptPreview}...`);
    }
  }

  console.log(`\n[fix-answer-length-bias] concluído: ${fixed} questão(ões) corrigida(s).`);
}

main()
  .catch((e) => {
    console.error("[fix-answer-length-bias] falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
