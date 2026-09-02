/**
 * Testes de `CharacterAvatar` (fase de redesign profundo, seção 9/30 —
 * "personagem correto", cobertura dos novos estados). Usa
 * `renderToStaticMarkup` (server, sem DOM/jsdom — este projeto não tem
 * nenhum) para confirmar que TODAS as expressões (incluindo as novas:
 * excited/sad/confused/pointing) renderizam um SVG válido, sem lançar —
 * `React.createElement` em vez de JSX porque o arquivo é `.ts`, não `.tsx`
 * (convenção do projeto: só `.test.ts` entra no `include` do vitest).
 *
 * Fase "arte própria dos personagens" — personagens com `portrait`
 * (`config/characters.ts`) renderizam `<img>` em vez do SVG geométrico;
 * testado separadamente abaixo (nome + papel real sempre no `alt`).
 */
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterAvatar } from "./CharacterAvatar";
import { CHARACTERS, type CharacterExpression } from "@/config/characters";

const ALL_EXPRESSIONS: CharacterExpression[] = [
  "neutral",
  "happy",
  "excited",
  "celebrating",
  "thinking",
  "encouraging",
  "surprised",
  "sad",
  "confused",
  "pointing",
];

describe("CharacterAvatar", () => {
  it.each(ALL_EXPRESSIONS)("renderiza um SVG válido para a expressão '%s'", (expression) => {
    const html = renderToStaticMarkup(
      createElement(CharacterAvatar, { character: CHARACTERS.neutral, expression }),
    );
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
  });

  it("o aria-label sempre identifica nome real + papel (SVG geométrico, sem `portrait`)", () => {
    const html = renderToStaticMarkup(
      createElement(CharacterAvatar, { character: CHARACTERS.neutral, expression: "pointing" }),
    );
    expect(html).toContain(`aria-label="${CHARACTERS.neutral.name} — ${CHARACTERS.neutral.role}"`);
  });

  it("personagem com `portrait` (fase 'arte própria') renderiza a ilustração real, com nome + papel no alt", () => {
    const html = renderToStaticMarkup(
      createElement(CharacterAvatar, { character: CHARACTERS.freud, expression: "pointing" }),
    );
    expect(html).toContain(`<img`);
    expect(html).toContain(`src="${CHARACTERS.freud.portrait}"`);
    expect(html).toContain(`alt="${CHARACTERS.freud.name} — ${CHARACTERS.freud.role}"`);
  });

  it("'pointing' desenha a seta indicativa; 'neutral' não", () => {
    const pointing = renderToStaticMarkup(
      createElement(CharacterAvatar, { character: CHARACTERS.neutral, expression: "pointing" }),
    );
    const neutral = renderToStaticMarkup(
      createElement(CharacterAvatar, { character: CHARACTERS.neutral, expression: "neutral" }),
    );
    expect(pointing).not.toBe(neutral);
  });
});
