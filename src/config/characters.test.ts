/**
 * Regressão de design real, reportada pelo usuário navegando no app
 * instalado: todo personagem histórico usava exatamente a mesma forma de
 * rosto, só variando a cor de preenchimento ("não vi personagens nenhum,
 * só vi uma carinha azul dentro do site") — em telas pequenas (ex.: nó de
 * lição no `LearningPath`, ~40px) a diferença de cor sozinha não bastava
 * para o personagem parecer distinto de outro.
 *
 * Corrigido adicionando `features` (cabelo/óculos/barba) por personagem em
 * `CHARACTERS`, renderizados por `CharacterAvatar`. Este teste trava a
 * regressão: exige que todo personagem histórico (com `schoolSlug`, ou
 * seja, exclui o `neutral`) tenha pelo menos um traço visual definido, e
 * que não haja dois com a combinação de traços idêntica — senão dois
 * personagens diferentes voltariam a parecer o mesmo rosto.
 */
import { describe, it, expect } from "vitest";
import { CHARACTERS } from "./characters";

describe("personagens históricos são visualmente distinguíveis entre si", () => {
  const historical = Object.values(CHARACTERS).filter((c) => c.schoolSlug);

  it("existe mais de um personagem histórico cadastrado", () => {
    expect(historical.length).toBeGreaterThan(1);
  });

  it.each(historical.map((c) => [c.name, c] as const))(
    "%s tem ao menos um traço visual (cabelo/óculos/barba) além da cor",
    (_name, character) => {
      const f = character.features;
      expect(f, `${character.name} não tem \`features\` definido`).toBeDefined();
      expect(
        Boolean(f?.hair || f?.glasses || f?.facialHair),
        `${character.name} tem \`features\` vazio — voltaria a ser só uma cor`,
      ).toBe(true);
    },
  );

  it("nenhum par de personagens históricos compartilha a mesma combinação de traços", () => {
    const signatures = historical.map(
      (c) =>
        `${c.features?.hair ?? "-"}|${c.features?.glasses ?? "-"}|${c.features?.facialHair ?? "-"}`,
    );
    const unique = new Set(signatures);
    expect(unique.size, `combinações de traços: ${signatures.join(", ")} — duas coincidem`).toBe(
      signatures.length,
    );
  });
});
