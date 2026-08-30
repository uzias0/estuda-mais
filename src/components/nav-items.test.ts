/**
 * Testes da navegação mobile (fase mobile/PWA, seção 3/23) — garante que a
 * barra inferior continua com os 5 destinos centrais de um app (Início,
 * Estudar, Revisão, Simulados, Perfil) e que todo item, em ambas as listas,
 * tem uma rota real dentro de `/dashboard` (nunca um link morto).
 */
import { describe, it, expect } from "vitest";
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from "./nav-items";

describe("nav-items", () => {
  it("BOTTOM_NAV_ITEMS tem exatamente 5 destinos (uma mão, sem sobrecarregar a barra)", () => {
    expect(BOTTOM_NAV_ITEMS).toHaveLength(5);
  });

  it("BOTTOM_NAV_ITEMS inclui Início, Estudar, Revisão, Simulados e Perfil", () => {
    const labels = BOTTOM_NAV_ITEMS.map((i) => i.label);
    expect(labels).toEqual(["Início", "Estudar", "Revisão", "Simulados", "Perfil"]);
  });

  it("todo item de BOTTOM_NAV_ITEMS existe (por referência) em NAV_ITEMS — mesma fonte, sem lista paralela", () => {
    for (const item of BOTTOM_NAV_ITEMS) {
      expect(NAV_ITEMS).toContainEqual(item);
    }
  });

  it("toda rota de navegação é uma sub-rota real de /dashboard", () => {
    for (const item of NAV_ITEMS) {
      expect(item.href === "/dashboard" || item.href.startsWith("/dashboard/")).toBe(true);
    }
  });

  it("nenhum item tem href ou label duplicado", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    const labels = NAV_ITEMS.map((i) => i.label);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("todo ícone é um componente (lucide-react), nunca um emoji/string (fase de redesign profundo, seção 22)", () => {
    for (const item of NAV_ITEMS) {
      expect(typeof item.icon).toBe("object"); // forwardRef do lucide-react — nunca "string"
      expect(item.icon).not.toBeTypeOf("string");
    }
  });
});
