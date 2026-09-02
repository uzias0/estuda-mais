/**
 * Sistema de personagens (etapa de consolidação, seção 4/5 do prompt) —
 * representações VISUAIS ORIGINAIS, abstratas (SVG geométrico, cores +
 * expressão facial simples), inspiradas em papéis de figuras históricas da
 * Psicologia — nunca um retrato realista nem cópia de arte/imagem
 * existente de ninguém. Cada personagem é identificado por NOME + PAPEL no
 * texto ao lado do avatar (nunca finge ser uma fotografia).
 *
 * `schoolSlug` é a chave de associação com dado REAL (`School.slug`,
 * Módulo 2) — `resolveCharacterForSchoolSlug` (`src/lib/characters.ts`)
 * só usa um personagem específico quando existe de fato uma `School`
 * publicada com aquele slug; caso contrário cai no personagem NEUTRO
 * (seção 5 do prompt: "quando não houver personagem apropriado, usar
 * personagem neutro"). Nenhuma relação acadêmica é inventada — a base
 * ainda não tem conteúdo real (Módulo 12, seção 24), então hoje o
 * resolvedor sempre cai no neutro; o mecanismo já está pronto para quando
 * houver `School`s reais cadastradas.
 */
/**
 * Expressões (fase de redesign profundo, seção 9: "os personagens devem
 * possuir diferentes expressões... normal, happy, excited, thinking,
 * celebrating, encouraging, sad, confused, pointing"). `neutral`≈normal,
 * `happy`/`celebrating`/`thinking`/`encouraging`/`surprised` já existiam
 * (etapa de consolidação); `excited`/`sad`/`confused`/`pointing` são novos
 * — mesmo componente paramétrico (`CharacterAvatar`), nenhum arquivo novo
 * por expressão (seção 9: "não criar dezenas de arquivos").
 */
export type CharacterExpression =
  | "neutral"
  | "happy"
  | "excited"
  | "celebrating"
  | "thinking"
  | "encouraging"
  | "surprised"
  | "sad"
  | "confused"
  | "pointing";

/**
 * Traços visuais que tornam cada personagem reconhecível à distância (fase
 * de redesign visual — antes todos os personagens usavam exatamente a
 * mesma forma, só variando a cor de preenchimento, o que na prática lia
 * como "uma carinha colorida genérica", nunca como Freud/Jung/etc.
 * distintos). Traço 100% geométrico/flat por padrão — só um punhado de
 * formas a mais (cabelo, óculos, barba) compostas pelo mesmo
 * `CharacterAvatar`, sem imagem nova por personagem.
 *
 * Fase "arte própria dos personagens" — pedido do usuário: "ficou muito
 * ruim, você só colocou um círculo com uma barba literalmente, péssimo,
 * eu vou criar" — o usuário desenhou (fez gerar) uma ilustração real por
 * personagem e mandou os arquivos; `portrait`, quando presente, faz
 * `CharacterAvatar` mostrar essa imagem em vez da forma geométrica (ver
 * `public/characters/`, `docs/FASE-ARTE-PERSONAGENS.md`).
 */
export interface CharacterFeatures {
  hair?: "bald" | "receding" | "side-part" | "short-neat" | "wavy";
  hairColor?: string;
  glasses?: "round" | "oval";
  facialHair?: "full-beard" | "goatee" | "mustache";
}

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  colorway: { skin: string; accent: string };
  /** Slug de `School` que este personagem representa, quando existir de verdade. */
  schoolSlug?: string;
  features?: CharacterFeatures;
  /** Ilustração real (PNG, fundo transparente, `public/characters/`) — quando presente, substitui o avatar SVG geométrico. */
  portrait?: string;
}

export const CHARACTERS: Record<string, CharacterDef> = {
  neutral: {
    id: "neutral",
    name: "Mente",
    role: "sua companhia de estudos",
    colorway: { skin: "#8686ff", accent: "#5b5bf0" },
  },
  freud: {
    id: "freud",
    name: "S. Freud",
    role: "psicanálise",
    colorway: { skin: "#c99a5b", accent: "#8a5a2b" },
    schoolSlug: "psicanalise",
    features: {
      hair: "receding",
      hairColor: "#d8d3c8",
      glasses: "round",
      facialHair: "full-beard",
    },
    portrait: "/characters/freud.png",
  },
  jung: {
    id: "jung",
    name: "C. Jung",
    role: "psicologia analítica",
    colorway: { skin: "#7fa6c9", accent: "#3d6690" },
    schoolSlug: "psicologia-analitica",
    features: { hair: "side-part", hairColor: "#5a4632", glasses: "oval", facialHair: "goatee" },
    portrait: "/characters/jung.png",
  },
  skinner: {
    id: "skinner",
    name: "B. F. Skinner",
    role: "behaviorismo",
    colorway: { skin: "#7fbf8f", accent: "#2e7d4f" },
    schoolSlug: "behaviorismo",
    features: { hair: "short-neat", hairColor: "#2e2620" },
    portrait: "/characters/skinner.png",
  },
  piaget: {
    id: "piaget",
    name: "J. Piaget",
    role: "psicologia do desenvolvimento",
    colorway: { skin: "#e0a458", accent: "#b5651d" },
    schoolSlug: "psicologia-do-desenvolvimento",
    features: { hair: "bald", hairColor: "#e6e2da", glasses: "round" },
    portrait: "/characters/piaget.png",
  },
  rogers: {
    id: "rogers",
    name: "C. Rogers",
    role: "humanismo",
    colorway: { skin: "#e08fa0", accent: "#c4536b" },
    schoolSlug: "humanismo",
    features: { hair: "wavy", hairColor: "#dcdad4" },
    portrait: "/characters/rogers.png",
  },
  bandura: {
    id: "bandura",
    name: "A. Bandura",
    role: "aprendizagem social",
    colorway: { skin: "#a68fe0", accent: "#6c4bb5" },
    schoolSlug: "aprendizagem-social",
    features: { hair: "side-part", hairColor: "#3a2f26", facialHair: "mustache" },
    portrait: "/characters/bandura.png",
  },
};

export const NEUTRAL_CHARACTER = CHARACTERS.neutral;
