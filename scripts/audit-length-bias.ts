#!/usr/bin/env node
/**
 * Ferramenta de QA (fase "viés de tamanho de alternativa") — lista toda
 * questão autoral (múltipla escolha/V-F/múltipla seleção/estudo de
 * caso) cuja alternativa CORRETA é a mais longa (ou empata com a mais
 * longa) — o mesmo padrão explorável já corrigido duas vezes nesta
 * base (`docs/FASE-VIES-TAMANHO-ALTERNATIVA-RODADA-2.md`). Rode isso
 * depois de adicionar qualquer questão nova, antes de publicar/commitar
 * — mais barato pegar aqui do que via `no-answer-length-bias.test.ts`
 * (que só falha com uma mensagem agregada, sem listar as questões).
 * Só leitura, nenhuma escrita.
 *
 * Uso: npx tsx scripts/audit-length-bias.ts
 */
import { prisma } from "@/server/db";

async function main() {
  const questions = await prisma.question.findMany({
    where: {
      reviewStatus: "PUBLISHED",
      prompt: { not: { contains: "TEST_FIXTURE" } },
      source: { name: { contains: "autoral" } },
      type: { in: ["MULTIPLE_CHOICE", "TRUE_FALSE", "MULTI_SELECT", "CASE_STUDY"] },
    },
    include: { options: { orderBy: { order: "asc" } } },
  });

  let offenders = 0;
  for (const q of questions) {
    const maxLen = Math.max(...q.options.map((o) => o.text.length));
    const correctIsLongest = q.options.some((o) => o.text.length === maxLen && o.isCorrect);
    if (!correctIsLongest) continue;
    offenders++;
    console.log(`\n=== ${q.id} ===`);
    console.log(`PROMPT: ${q.prompt}`);
    for (const o of q.options) {
      console.log(`  [${o.text.length}ch]${o.isCorrect ? " [CORRECT]" : ""} ${o.text}`);
    }
  }
  console.log(
    `\nTotal offenders: ${offenders} / ${questions.length} (${((offenders / questions.length) * 100).toFixed(1)}%)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
