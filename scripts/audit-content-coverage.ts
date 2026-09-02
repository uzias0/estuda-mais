#!/usr/bin/env node
/**
 * Ferramenta de QA (fase "expansão de questões") — mostra quantas
 * questões existem por conceito/lição, para acompanhar o progresso
 * rumo à meta do usuário ("no mínimo cem questões pra cada um").
 * Só leitura, nenhuma escrita.
 *
 * Uso: npx tsx scripts/audit-content-coverage.ts
 */
import { prisma } from "@/server/db";

async function main() {
  const lessons = await prisma.lesson.findMany({
    include: { blocks: { include: { question: true } } },
    orderBy: { title: "asc" },
  });

  console.log(`Total de lições: ${lessons.length}\n`);
  for (const lesson of lessons) {
    const questionBlocks = lesson.blocks.filter((b) => b.question);
    console.log(
      `${lesson.title} | blocos=${lesson.blocks.length} | questões-em-bloco=${questionBlocks.length} | status=${lesson.status}`,
    );
  }

  console.log("\nQuestões autorais por conceito (via QuestionKnowledgeTag):");
  const concepts = await prisma.concept.findMany({
    where: { slug: { not: { contains: "test-fixture" } } },
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
  for (const concept of concepts) {
    const tags = await prisma.questionKnowledgeTag.findMany({
      where: { entityType: "CONCEPT", entityId: concept.id },
      select: { questionId: true },
    });
    const questions = await prisma.question.findMany({
      where: { id: { in: tags.map((t) => t.questionId) } },
      select: { difficulty: true },
    });
    const byDifficulty = new Map<string, number>();
    for (const q of questions) byDifficulty.set(q.difficulty, (byDifficulty.get(q.difficulty) ?? 0) + 1);
    console.log(
      `  ${concept.name} (${concept.slug}): ${questions.length} — ${JSON.stringify(Object.fromEntries(byDifficulty))}`,
    );
  }

  const totalQuestions = await prisma.question.count();
  const bySource = await prisma.question.findMany({
    select: { sourceId: true, source: { select: { name: true } } },
  });
  const sourceCounts = new Map<string, number>();
  for (const q of bySource) {
    const name = q.source.name;
    sourceCounts.set(name, (sourceCounts.get(name) ?? 0) + 1);
  }
  console.log(`\nTotal de questões no banco: ${totalQuestions}`);
  console.log("Por fonte:");
  for (const [name, count] of [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x — ${name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
