/**
 * Teste de contrato de segurança (Módulo 11, seções 11/49) — confirma que
 * o formato que `QuestionRenderer`/`PublicQuestionViewLike` espera
 * (`toPublicQuestionView`, Módulo 3/6) NUNCA inclui `isCorrect` em nenhuma
 * alternativa nem `answerKey` — a UI não tem como exibir/vazar o gabarito
 * mesmo que tentasse, porque o dado simplesmente não chega até ela.
 */
import { describe, it, expect, afterAll } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "@/server/db";
import { toPublicQuestionView } from "@/modules/assessment/server/services/questionQuery.service";
import {
  createFixtureSource,
  createFixtureMultipleChoiceQuestion,
  cleanupFixtures,
} from "@/test/fixtures";
import { QuestionRenderer, type PublicQuestionViewLike } from "./QuestionRenderer";

describe("Contrato de segurança do QuestionRenderer", () => {
  const sourceIds: string[] = [];
  const questionIds: string[] = [];

  it("toPublicQuestionView nunca inclui isCorrect nem answerKey, e é compatível com PublicQuestionViewLike", async () => {
    const source = await createFixtureSource("qr-contract");
    sourceIds.push(source.id);
    const question = await createFixtureMultipleChoiceQuestion("qr-contract", source.id, {
      correctIndex: 0,
    });
    questionIds.push(question.id);

    const full = await prisma.question.findUniqueOrThrow({
      where: { id: question.id },
      include: { options: true },
    });
    const publicView = toPublicQuestionView(full);

    // Compatibilidade estrutural com o que o componente aceita.
    const asComponentProp: PublicQuestionViewLike = publicView;
    expect(asComponentProp.id).toBe(question.id);

    expect(publicView).not.toHaveProperty("answerKey");
    for (const option of publicView.options) {
      expect(option).not.toHaveProperty("isCorrect");
      expect(Object.keys(option).sort()).toEqual(["id", "order", "text"]);
    }
  });

  it("o HTML de fato renderizado por QuestionRenderer nunca contém 'isCorrect'/'answerKey' (fase de redesign profundo, seção 30)", () => {
    // Diferente do teste acima (que só confere a FORMA do dado que chega),
    // este renderiza o COMPONENTE de verdade (`renderToStaticMarkup`, sem
    // DOM/jsdom — mesma técnica de `CharacterAvatar.test.ts`) e varre o
    // HTML resultante — a garantia real de que a UI nunca vaza o gabarito,
    // não só que o tipo de entrada não permitiria.
    const question: PublicQuestionViewLike = {
      id: "q-fixture",
      prompt: "Pergunta de teste",
      type: "MULTIPLE_CHOICE",
      difficulty: "BASICO",
      options: [
        { id: "opt-a", text: "Alternativa A", order: 0 },
        { id: "opt-b", text: "Alternativa B", order: 1 },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(QuestionRenderer, { question, onSubmit: () => {} }),
    );
    expect(html.toLowerCase()).not.toContain("iscorrect");
    expect(html.toLowerCase()).not.toContain("answerkey");
  });

  afterAll(async () => {
    await cleanupFixtures({ questionIds, sourceIds });
    await prisma.$disconnect();
  });
});
