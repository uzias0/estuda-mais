/**
 * Avatar de personagem (etapa de consolidação, seção 4) — SVG geométrico
 * ORIGINAL por padrão: um rosto abstrato flat-design cuja cor e expressão
 * variam por `character`/`expression`. Sempre acompanhado do NOME real no
 * texto ao lado (nunca pretende ser uma fotografia).
 *
 * Fase "arte própria dos personagens" (pedido do usuário, depois de ver o
 * SVG geométrico: "ficou muito ruim, você só colocou um círculo com uma
 * barba literalmente, péssimo, eu vou criar") — quando `character.portrait`
 * existe (`config/characters.ts`), mostra essa ilustração (mandada pelo
 * próprio usuário, `public/characters/`) em vez da forma geométrica. A
 * expressão (`expression`) não varia a ilustração — cada `portrait` é uma
 * pose fixa só; a "vida" do personagem continua vindo de fora do rosto em
 * si (animações de entrada, celebração, etc.), não de trocar a arte.
 */
import type { CharacterDef, CharacterExpression, CharacterFeatures } from "@/config/characters";

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

/**
 * Cabelo (fase de redesign visual, ver comentário em `src/config/characters.ts`)
 * — desenhado como uma "touca" atrás do rosto: começa antes do EyebrowPaths
 * para ficar por baixo da testa, mas por cima do círculo de pele.
 */
function HairPath({ hair, color }: { hair?: CharacterFeatures["hair"]; color: string }) {
  switch (hair) {
    case "bald":
      // Careca: só uma auréola rala nas laterais/nuca, topo da cabeça à mostra.
      return (
        <path
          d="M10 44 Q6 24 26 16 M90 44 Q94 24 74 16"
          stroke={color}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
      );
    case "receding":
      return <path d="M10 40 Q18 10 50 8 Q82 10 90 40 Q78 20 50 18 Q22 20 10 40 Z" fill={color} />;
    case "side-part":
      return <path d="M6 42 Q4 4 52 4 Q94 6 94 42 Q90 14 54 12 Q22 13 14 28 Z" fill={color} />;
    case "short-neat":
      return <path d="M6 40 Q4 2 50 2 Q96 2 94 40 Q92 14 50 10 Q8 14 6 40 Z" fill={color} />;
    case "wavy":
      return (
        <path
          d="M4 40 Q2 4 18 8 Q30 -2 50 4 Q70 -2 82 8 Q98 4 96 40 Q88 12 50 14 Q12 12 4 40 Z"
          fill={color}
        />
      );
    default:
      return null;
  }
}

function GlassesPath({ glasses }: { glasses?: CharacterFeatures["glasses"] }) {
  if (glasses === "round") {
    return (
      <g stroke="#2a2a2a" strokeWidth="2.5" fill="none">
        <circle cx="37" cy="47" r="10" />
        <circle cx="63" cy="47" r="10" />
        <path d="M47 47 L53 47" />
      </g>
    );
  }
  if (glasses === "oval") {
    return (
      <g stroke="#2a2a2a" strokeWidth="2.5" fill="none">
        <ellipse cx="37" cy="47" rx="11" ry="8" />
        <ellipse cx="63" cy="47" rx="11" ry="8" />
        <path d="M48 46 L52 46" />
      </g>
    );
  }
  return null;
}

function FacialHairPath({
  facialHair,
  color,
}: {
  facialHair?: CharacterFeatures["facialHair"];
  color: string;
}) {
  switch (facialHair) {
    case "full-beard":
      return <path d="M26 56 Q28 84 50 88 Q72 84 74 56 Q70 76 50 78 Q30 76 26 56 Z" fill={color} />;
    case "goatee":
      return <path d="M42 68 Q50 84 58 68 Q54 78 50 78 Q46 78 42 68 Z" fill={color} />;
    case "mustache":
      return <path d="M33 58 Q42 63 50 58 Q58 63 67 58 Q59 67 50 62 Q41 67 33 58 Z" fill={color} />;
    default:
      return null;
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
  const features = character.features;
  const hairColor = features?.hairColor ?? "#3a3a3a";

  if (character.portrait) {
    // Asset local simples (`public/characters/`), sem necessidade da
    // otimização de `next/image` (nenhum domínio remoto, poucos
    // arquivos, tamanho já pequeno) — mesma disciplina de "não trocar
    // de ferramenta sem necessidade" já seguida pelo resto do módulo.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={character.portrait}
        alt={`${character.name} — ${character.role}`}
        width={px}
        height={px}
        style={{
          width: px,
          height: px,
          borderRadius: "50%",
          objectFit: "cover",
          border: `3px solid ${character.colorway.accent}`,
          background: character.colorway.skin,
        }}
      />
    );
  }

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
      <HairPath hair={features?.hair} color={hairColor} />
      <EyebrowPaths expression={expression} />
      <EyePaths expression={expression} />
      <MouthPath expression={expression} />
      <FacialHairPath facialHair={features?.facialHair} color={hairColor} />
      <GlassesPath glasses={features?.glasses} />
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
