/**
 * Avatar de personagem (etapa de consolidação, seção 4) — SVG geométrico
 * ORIGINAL (sem IA generativa de imagem, sem arte de terceiros): um rosto
 * abstrato flat-design cuja cor e expressão variam por `character`/
 * `expression`. Não é um retrato de ninguém — é uma representação visual
 * simples, sempre acompanhada do NOME real no texto ao lado (nunca
 * pretende ser uma fotografia).
 */
import type { CharacterDef, CharacterExpression } from "@/config/characters";

const SIZE_PX: Record<"sm" | "md" | "lg", number> = { sm: 40, md: 64, lg: 112 };

function EyebrowPaths({ expression }: { expression: CharacterExpression }) {
  switch (expression) {
    case "happy":
    case "encouraging":
    case "pointing":
      return (
        <>
          <path
            d="M30 38 Q37 33 44 37"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M56 37 Q63 33 70 38"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "celebrating":
    case "surprised":
    case "excited":
      return (
        <>
          <path
            d="M29 33 Q37 26 45 32"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M55 32 Q63 26 71 33"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "thinking":
      return (
        <>
          <path
            d="M30 36 Q37 34 44 38"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M56 40 Q63 32 70 34"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "sad":
      return (
        <>
          <path
            d="M30 34 Q37 39 44 37"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M56 37 Q63 39 70 34"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "confused":
      return (
        <>
          <path
            d="M30 33 Q37 30 44 35"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M56 38 L70 38"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    default:
      return (
        <>
          <path
            d="M30 37 L44 37"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M56 37 L70 37"
            stroke="#2a2a2a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
  }
}

function EyePaths({ expression }: { expression: CharacterExpression }) {
  if (expression === "celebrating") {
    return (
      <>
        <path
          d="M32 47 Q37 42 42 47"
          stroke="#2a2a2a"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M58 47 Q63 42 68 47"
          stroke="#2a2a2a"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  }
  if (expression === "surprised" || expression === "excited") {
    return (
      <>
        <circle cx="37" cy="47" r="5.5" fill="#2a2a2a" />
        <circle cx="63" cy="47" r="5.5" fill="#2a2a2a" />
      </>
    );
  }
  if (expression === "thinking" || expression === "confused") {
    return (
      <>
        <circle cx="39" cy="47" r="4" fill="#2a2a2a" />
        <circle cx="65" cy="47" r="4" fill="#2a2a2a" />
      </>
    );
  }
  if (expression === "sad") {
    return (
      <>
        <circle cx="37" cy="49" r="4" fill="#2a2a2a" />
        <circle cx="63" cy="49" r="4" fill="#2a2a2a" />
      </>
    );
  }
  return (
    <>
      <circle cx="37" cy="47" r="4.5" fill="#2a2a2a" />
      <circle cx="63" cy="47" r="4.5" fill="#2a2a2a" />
    </>
  );
}

function MouthPath({ expression }: { expression: CharacterExpression }) {
  switch (expression) {
    case "celebrating":
    case "excited":
      return <path d="M35 60 Q50 78 65 60 Q50 68 35 60 Z" fill="#2a2a2a" />;
    case "happy":
    case "encouraging":
    case "pointing":
      return (
        <path
          d="M35 60 Q50 72 65 60"
          stroke="#2a2a2a"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "surprised":
      return <ellipse cx="50" cy="64" rx="7" ry="9" fill="#2a2a2a" />;
    case "thinking":
      return (
        <path
          d="M40 64 Q50 62 60 64"
          stroke="#2a2a2a"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "sad":
      return (
        <path
          d="M38 68 Q50 60 62 68"
          stroke="#2a2a2a"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "confused":
      return (
        <path
          d="M38 63 Q44 66 50 63 Q56 60 62 63"
          stroke="#2a2a2a"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
    default:
      return (
        <path
          d="M38 62 Q50 66 62 62"
          stroke="#2a2a2a"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      );
  }
}

export function CharacterAvatar({
  character,
  expression = "neutral",
  size = "md",
}: {
  character: CharacterDef;
  expression?: CharacterExpression;
  size?: "sm" | "md" | "lg";
}) {
  const px = SIZE_PX[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${character.name} — ${character.role}`}
    >
      <circle cx="50" cy="50" r="46" fill={character.colorway.skin} />
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke={character.colorway.accent}
        strokeWidth="3"
      />
      <EyebrowPaths expression={expression} />
      <EyePaths expression={expression} />
      <MouthPath expression={expression} />
      {expression === "celebrating" ? (
        <>
          <path d="M14 22 l4 8 8 2-8 3-4 8-3-8-8-3 8-2z" fill="var(--color-xp, #7c4dff)" />
          <path d="M82 66 l3 6 6 2-6 2-3 6-2-6-6-2 6-2z" fill="var(--color-xp, #7c4dff)" />
        </>
      ) : null}
      {expression === "pointing" ? (
        <path d="M84 50 l14 0 -5 -6 12 6 -12 6 5 -6z" fill="var(--color-brand, #5b5bf0)" />
      ) : null}
    </svg>
  );
}
