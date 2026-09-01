/**
 * Ícone do aplicativo — gerado por código (fase mobile/PWA, seção 12: "não
 * usar logo do Duolingo, identidade própria"). Mesmos tokens de cor de
 * `globals.css` (`--color-brand`/`--color-brand-strong`) — nenhum asset
 * binário externo, nenhuma dependência nova: `ImageResponse` (`next/og`)
 * já vem com o Next.js. Uma única função compartilhada por
 * `icon.tsx`/`apple-icon.tsx`/`icon-192`/`icon-512` (seção 21: não
 * duplicar).
 *
 * Fase "logo própria" (pedido do usuário: "tire esses emoji... e a logo
 * também deixe mais característica do nosso projeto") — o 🧠 solto virou
 * um monograma "E" com o acento "+" característico da marca "Estuda+",
 * mesmo mostrado no `Header` (`<Brain>` do lucide-react ao lado do
 * texto). Uma arte ilustrada de verdade (não um monograma tipográfico)
 * fica para quando o usuário tiver uma arte externa pronta (ele mesmo
 * ofereceu encomendar/gerar uma) — este monograma já resolve "não é mais
 * um emoji genérico" com o que dá para fazer só em código.
 *
 * `padding` deixa uma margem segura para ícones "maskable" (o SO pode
 * recortar em círculo/squircle — conteúdo precisa caber na zona segura
 * central, ~80% do canvas).
 */
import { ImageResponse } from "next/og";

export function renderAppIcon(size: number, { padding = 0 }: { padding?: number } = {}) {
  const contentSize = size - padding * 2;
  // Selo "+" no canto — proporção fixa em relação ao "E" (não ao ícone
  // inteiro), para continuar legível tanto no favicon de 32px quanto no
  // ícone de 512px.
  const badgeSize = Math.round(contentSize * 0.34);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #6a6af5 0%, #4444d1 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "relative",
          width: contentSize,
          height: contentSize,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Monograma "E" — peso alto, leve curva na haste central pra não
         * ficar um bloco tipográfico genérico. */}
        <div
          style={{
            display: "flex",
            fontSize: contentSize * 0.72,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1,
            fontFamily: "system-ui, sans-serif",
            textShadow: "0 2px 6px rgba(0,0,0,0.18)",
          }}
        >
          E
        </div>
        {/* Selo "+" — a marca "Estuda+", nunca um emoji solto. */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: contentSize * 0.02,
            bottom: contentSize * 0.06,
            width: badgeSize,
            height: badgeSize,
            borderRadius: "50%",
            background: "#ffffff",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: badgeSize * 0.72,
              fontWeight: 800,
              color: "#4444d1",
              lineHeight: 1,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            +
          </div>
        </div>
      </div>
    </div>,
    { width: size, height: size },
  );
}
