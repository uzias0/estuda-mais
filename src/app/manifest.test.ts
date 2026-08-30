/**
 * Testes do Web App Manifest (fase mobile/PWA, seção 10/23 — "manifest
 * quando testável no ambiente"). Puro: `manifest()` é uma função síncrona
 * sem I/O, então testável diretamente sem servidor/navegador.
 */
import { describe, it, expect } from "vitest";
import manifest from "./manifest";

describe("Web App Manifest", () => {
  const result = manifest();

  it("é instalável: display standalone, orientation portrait, start_url definido", () => {
    expect(result.display).toBe("standalone");
    expect(result.orientation).toBe("portrait-primary");
    expect(result.start_url).toBe("/");
  });

  it("tem nome/nome curto e identidade própria (nada de Duolingo/terceiros)", () => {
    expect(result.name).toContain("Estuda+");
    expect(result.short_name).toBe("Estuda+");
    expect(result.name?.toLowerCase()).not.toContain("duolingo");
  });

  it("tem pelo menos um ícone 'any' e um 'maskable', ambos servidos pela própria origem", () => {
    const icons = result.icons ?? [];
    expect(icons.length).toBeGreaterThanOrEqual(2);
    expect(icons.some((i) => i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const icon of icons) {
      expect(icon.src.startsWith("/")).toBe(true); // nunca aponta para um host externo
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
    }
  });

  it("theme_color/background_color usam os mesmos tokens de globals.css (marca própria)", () => {
    expect(result.theme_color).toBe("#5b5bf0");
    expect(result.background_color).toBe("#f7f8fb");
  });
});
