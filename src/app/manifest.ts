import type { MetadataRoute } from "next";

/**
 * Web App Manifest (fase mobile/PWA, seção 10) — arquivo especial do Next.js
 * (App Router), servido automaticamente em `/manifest.webmanifest`. `name`/
 * `short_name`/ícones reaproveitam o monograma "E+" de `app-icon.tsx`
 * (fase "logo própria") e os tokens de cor de `globals.css` — nenhuma
 * identidade nova criada, nenhum asset de terceiro. `display: "standalone"` +
 * `orientation: "portrait-primary"` são o que torna o app instalável e o
 * abre sem a barra de endereço do navegador, como pedido na seção 10.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Estuda+ — Psicologia",
    short_name: "Estuda+",
    description: "Plataforma de estudos de Psicologia — diagnóstico, lições, revisão e simulados.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f8fb",
    theme_color: "#5b5bf0",
    lang: "pt-BR",
    categories: ["education"],
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
