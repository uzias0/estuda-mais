/**
 * Teste de política do CSS global (fase mobile/PWA, seção 9/19/23 —
 * `prefers-reduced-motion`). Não há DOM/renderer nesta suíte (ambiente
 * `node`, ver `vitest.config.mts`), então o teste lê `globals.css` como
 * texto e confirma, estruturalmente, que toda classe com `animation:`
 * própria também é desativada sob `@media (prefers-reduced-motion: reduce)`
 * — protege contra alguém adicionar uma animação nova (personagem,
 * celebração, XP) e esquecer o fallback (seção 9: "não remover animação
 * para resolver acessibilidade; fornecer fallback").
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.join(import.meta.dirname, "globals.css"), "utf-8");

function classesWithOwnAnimation(source: string): string[] {
  // Casa qualquer regra `seletor { ... animation: ... }` (inclusive
  // seletores compostos tipo `.a .b { animation: ... }`, usados pelos nós
  // do caminho de aprendizagem) e extrai TODAS as classes do seletor —
  // ignora blocos de `@keyframes` (não têm `animation:` na própria
  // declaração, só nos frames internos, que não casam com o padrão).
  const ruleMatches = [...source.matchAll(/([^{}]+)\{[^{}]*\banimation:\s*[a-z][\w-]*[^;]*;/gi)];
  const classes = new Set<string>();
  for (const rule of ruleMatches) {
    for (const cls of rule[1].matchAll(/\.([a-zA-Z0-9-]+)/g)) classes.add(cls[1]);
  }
  return [...classes];
}

describe("globals.css — prefers-reduced-motion", () => {
  it("tem um bloco @media (prefers-reduced-motion: reduce)", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it("toda classe com animação própria está coberta por ALGUM bloco de reduced-motion", () => {
    // Existe mais de um bloco `@media (prefers-reduced-motion: reduce)` no
    // arquivo (ex.: `.skeleton` tem o seu próprio, logo após a definição) —
    // precisa juntar todos antes de checar, não só o primeiro.
    const reducedMotionBlocks = [
      ...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g),
    ].map((m) => m[1]);
    expect(reducedMotionBlocks.length).toBeGreaterThan(0);
    const combined = reducedMotionBlocks.join("\n");

    const animatedClasses = classesWithOwnAnimation(css);
    expect(animatedClasses.length).toBeGreaterThan(0); // confirma que o regex encontrou algo real

    for (const className of animatedClasses) {
      expect(
        combined.includes(`.${className}`),
        `.${className} usa \`animation\` mas não aparece em nenhum bloco de prefers-reduced-motion`,
      ).toBe(true);
    }
  });
});
