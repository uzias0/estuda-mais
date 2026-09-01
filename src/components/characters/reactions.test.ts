/**
 * Testes de `reactions.ts` — funções puras, sem I/O. `Math.random()`
 * dentro de `pick()` é aceitável aqui (comentário do arquivo): só chamado
 * a partir de um manipulador de evento do cliente, nunca durante
 * renderização SSR — os testes rodam a função várias vezes e checam que o
 * resultado está sempre dentro do conjunto esperado, nunca um valor exato.
 */
import { describe, it, expect } from "vitest";
import { answerReaction, lessonStartReaction, LESSON_COMPLETE_REACTION } from "./reactions";

describe("answerReaction", () => {
  it("resposta correta: expressão 'happy', mensagem não vazia", () => {
    for (let i = 0; i < 20; i++) {
      const r = answerReaction(true);
      expect(r.expression).toBe("happy");
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it("resposta incorreta: expressão 'encouraging', mensagem não vazia", () => {
    for (let i = 0; i < 20; i++) {
      const r = answerReaction(false);
      expect(r.expression).toBe("encouraging");
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it("varia a mensagem entre chamadas (não é sempre a mesma string)", () => {
    const seen = new Set(Array.from({ length: 30 }, () => answerReaction(true).message));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("lessonStartReaction", () => {
  it("devolve sempre uma saudação não vazia", () => {
    for (let i = 0; i < 20; i++) {
      const r = lessonStartReaction();
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it("nunca cita um conceito específico de conteúdo (só saudação genérica)", () => {
    // Guarda contra a regressão óbvia: mensagem de abertura não deveria
    // acidentalmente virar "fonte de conteúdo acadêmico" (regra do topo do
    // arquivo) — checagem simples, não uma verificação semântica completa.
    for (let i = 0; i < 20; i++) {
      const r = lessonStartReaction();
      expect(r.message).not.toMatch(/inconsciente|arquétipo|reforço|condicionamento/i);
    }
  });
});

describe("LESSON_COMPLETE_REACTION", () => {
  it("é uma reação de celebração fixa (não varia)", () => {
    expect(LESSON_COMPLETE_REACTION.expression).toBe("celebrating");
    expect(LESSON_COMPLETE_REACTION.message.length).toBeGreaterThan(0);
  });
});
