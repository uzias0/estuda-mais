/**
 * Testes de metadata/viewport da casca raiz (fase mobile/PWA, seção 10/23).
 * Só importa os exports nomeados (objetos simples, sem I/O) — nunca invoca
 * o componente `RootLayout` (JSX real, precisaria de DOM/renderer, fora do
 * ambiente `node` desta suíte).
 */
import { describe, it, expect } from "vitest";
import { metadata, viewport } from "./layout";

describe("Metadata/viewport da casca raiz", () => {
  it("viewport tem viewport-fit=cover — é o que ativa env(safe-area-inset-*) de verdade no iOS", () => {
    expect(viewport.viewportFit).toBe("cover");
    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);
  });

  it("themeColor cobre claro e escuro, coerente com os tokens de globals.css", () => {
    expect(Array.isArray(viewport.themeColor)).toBe(true);
    const entries = viewport.themeColor as Array<{ media?: string; color: string }>;
    const light = entries.find((e) => e.media?.includes("light"));
    const dark = entries.find((e) => e.media?.includes("dark"));
    expect(light?.color).toBe("#5b5bf0");
    expect(dark?.color).toBe("#12131a");
  });

  it("metadata aponta para o manifest real e habilita appleWebApp standalone", () => {
    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(metadata.appleWebApp).toMatchObject({ capable: true });
  });
});
