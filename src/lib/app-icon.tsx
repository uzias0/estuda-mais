/**
 * Ícone do aplicativo — gerado por código (fase mobile/PWA, seção 12: "não
 * usar logo do Duolingo, identidade própria"). Mesma marca já usada no
 * `Header` (🧠 "Estuda+") e os mesmos tokens de cor de `globals.css`
 * (`--color-brand`/`--color-brand-strong`) — nenhum asset binário externo,
 * nenhuma dependência nova: `ImageResponse` (`next/og`) já vem com o
 * Next.js. Uma única função compartilhada por `icon.tsx`/`apple-icon.tsx`/
 * `icon-192`/`icon-512` (seção 21: não duplicar).
 *
 * `padding` deixa uma margem seguem para ícones "maskable" (o SO pode
 * recortar em círculo/squircle — conteúdo precisa caber na zona segura
 * central, ~80% do canvas).
 */
import { ImageResponse } from "next/og";

export function renderAppIcon(size: number, { padding = 0 }: { padding?: number } = {}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #5b5bf0 0%, #4444d1 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: size - padding * 2,
          lineHeight: 1,
        }}
      >
        🧠
      </div>
    </div>,
    { width: size, height: size },
  );
}
