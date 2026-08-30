import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Estuda+",
  description: "Plataforma de estudos de Psicologia — diagnóstico, lições, revisão e simulados.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // "webapp" (não "default"/"black-translucent"): mantém a barra de
    // status do sistema em vez de sobrepor conteúdo — mais previsível numa
    // primeira versão instalável do que assumir controle total da barra.
    capable: true,
    statusBarStyle: "default",
    title: "Estuda+",
  },
};

/**
 * `viewport-fit: "cover"` é o que FAZ `env(safe-area-inset-*)` existir de
 * verdade no Safari/iOS — sem isso, `.bottom-nav` (globals.css) já usava
 * `env(safe-area-inset-bottom, 0)`, mas o valor injetado pelo navegador era
 * sempre 0 (o código estava presente e inerte). `themeColor` usa o mesmo
 * token de marca de `globals.css` (`--color-brand`/`--color-brand` no
 * escuro) — pintado aqui porque a barra do navegador/status bar não lê CSS
 * custom properties, só a tag `<meta name="theme-color">` que este export
 * gera.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5b5bf0" },
    { media: "(prefers-color-scheme: dark)", color: "#12131a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
