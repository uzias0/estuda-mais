/**
 * Teste de regressão de qualidade de conteúdo — achado real reportado pelo
 * usuário testando o app instalado: a alternativa CORRETA das questões
 * autorais estava sistematicamente mais longa que as erradas (13 de 16
 * questões, 81%), permitindo acertar sem saber o conteúdo só escolhendo a
 * mais longa. Corrigido em `scripts/fix-answer-length-bias.ts`.
 *
 * RODADA 2 (usuário reportou de novo, testando ao vivo: "as questões que
 * têm a resposta maior sempre são acertas, em todas as vezes") — a
 * rodada 1 só tinha reduzido para 43,8% (7/16), limiar que este teste
 * (então 60%) deixava passar mas que, num banco de questões ainda
 * pequeno, o estudante sente na pele como "sempre". Depois da rodada 2 o
 * estado real caiu para 6,3% (1/16, só o falso positivo documentado de
 * Anna Freud) — o limiar abaixo foi apertado de 60% para 20% como
 * consequência: ainda folgado o bastante para não disparar por ruído
 * estatístico de amostra pequena, mas MUITO mais perto do estado real
 * saudável, para pegar uma regressão bem antes de virar 40%+ de novo.
 *
 * Este teste trava a REGRESSÃO: falha se, no futuro, uma nova leva de
 * questões reintroduzir esse padrão em proporção suspeita. Um pouco de
 * coincidência é esperado (com poucas alternativas, "a mais longa" acerta
 * por acaso parte do tempo).
 */
import { describe, it, expect } from "vitest";
import { prisma } from "@/server/db";

describe("questões autorais não têm viés de 'resposta certa = alternativa mais longa'", () => {
  it("a resposta correta não é a mais longa (ou empatada) em mais de 60% das questões com alternativas", async () => {
    const questions = await prisma.question.findMany({
      where: {
        reviewStatus: "PUBLISHED",
        prompt: { not: { contains: "TEST_FIXTURE" } },
        type: { in: ["MULTIPLE_CHOICE", "TRUE_FALSE", "MULTI_SELECT", "CASE_STUDY"] },
      },
      include: { options: true },
    });

    const withOptions = questions.filter((q) => q.options.length > 0);
    if (withOptions.length === 0) return; // nada a checar ainda

    let longestIsCorrect = 0;
    for (const q of withOptions) {
      const maxLen = Math.max(...q.options.map((o) => o.text.length));
      if (q.options.some((o) => o.text.length === maxLen && o.isCorrect)) longestIsCorrect++;
    }

    const ratio = longestIsCorrect / withOptions.length;
    expect(
      ratio,
      `${longestIsCorrect}/${withOptions.length} questões (${(ratio * 100).toFixed(1)}%) têm a ` +
        "resposta certa como a alternativa mais longa — possível viés de redação explorável sem " +
        "saber o conteúdo.",
    ).toBeLessThanOrEqual(0.2);
  });
});
