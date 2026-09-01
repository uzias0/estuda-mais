/**
 * Mensagens de reação (etapa de consolidação, seção 6) — curtas, amigáveis,
 * motivacionais, puras (sem I/O, seguras para Client Component). Usa
 * sempre o personagem NEUTRO aqui — a resolução por escola/personagem
 * específico (`src/lib/characters.ts`) é feita nas páginas Server
 * Component, onde há acesso ao banco; o `LessonRunner` (Client Component)
 * só reage ao resultado que o servidor já calculou, nunca decide nada.
 */
import { NEUTRAL_CHARACTER, type CharacterExpression } from "@/config/characters";

export interface Reaction {
  expression: CharacterExpression;
  message: string;
}

const CORRECT_MESSAGES = [
  "Muito bem! 🎉",
  "Isso aí! Você mandou bem.",
  "Perfeito, continue assim!",
  "Exatamente isso!",
  "Mandou muito bem nessa!",
  "Isso mesmo — você está pegando o jeito.",
  "Na mosca! 🎯",
  "Show de bola!",
];
const INCORRECT_MESSAGES = [
  "Quase! Vamos entender essa questão.",
  "Não foi dessa vez — mas o aprendizado está no processo.",
  "Sem problemas, vamos revisar isso.",
  "Essa foi difícil — olha a explicação com calma.",
  "Errar faz parte de aprender. Vamos em frente!",
  "Não desanime — releia a explicação e siga.",
  "Foi por pouco! Vamos entender o porquê.",
];

/**
 * Mensagens de boas-vindas ao ABRIR uma lição (pedido do usuário: "quero
 * exercícios que o personagem tipo Freud fale com a pessoa" — a conversa
 * começa já na abertura, não só depois de responder). Genéricas de
 * propósito (nunca citam um conceito específico da lição) — o personagem
 * é sempre uma mascote que incentiva, nunca uma fonte de conteúdo
 * acadêmico (mesma regra do topo deste arquivo).
 */
const LESSON_START_MESSAGES = [
  "Vamos começar? Estou aqui para te acompanhar.",
  "Pronto para mais uma lição? Vamos nessa!",
  "Bora estudar juntos — no seu ritmo.",
  "Essa lição é sua. Vamos passo a passo.",
  "Que bom te ver por aqui de novo!",
];

/**
 * Escolhe uma mensagem da lista — variação real (não sempre a mesma) para
 * a reação não parecer repetitiva a cada questão. Só chamada a partir de um
 * manipulador de evento do cliente (nunca durante renderização), então
 * `Math.random()` aqui não afeta hidratação SSR/CSR.
 */
function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

export function answerReaction(isCorrect: boolean): Reaction {
  return isCorrect
    ? { expression: "happy", message: pick(CORRECT_MESSAGES) }
    : { expression: "encouraging", message: pick(INCORRECT_MESSAGES) };
}

/** Saudação ao abrir uma lição — ver comentário de `LESSON_START_MESSAGES`. */
export function lessonStartReaction(): Reaction {
  return { expression: "encouraging", message: pick(LESSON_START_MESSAGES) };
}

/**
 * Igual a `lessonStartReaction()`, mas SEMPRE a mesma mensagem (a primeira
 * da lista) — usada só como valor inicial de estado em `LessonRunner`,
 * ANTES do primeiro `useEffect` no cliente. `useState(() =>
 * lessonStartReaction())` rodaria `Math.random()` durante o render em si
 * (servidor E cliente, cada um sorteando um valor diferente), causando
 * erro de hidratação (React: "server rendered text didn't match the
 * client") — este valor fixo garante que a primeira renderização do
 * servidor e do cliente batem sempre; a troca para uma saudação
 * aleatória de verdade só acontece depois, num `useEffect` (client-only,
 * não precisa bater com o servidor).
 */
export const LESSON_START_REACTION_FALLBACK: Reaction = {
  expression: "encouraging",
  message: LESSON_START_MESSAGES[0],
};

export const LESSON_COMPLETE_REACTION: Reaction = {
  expression: "celebrating",
  message: "Lição concluída! Mais um passo na sua jornada.",
};

export const ACHIEVEMENT_REACTION: Reaction = {
  expression: "celebrating",
  message: "Você desbloqueou uma conquista!",
};

export const LEVEL_UP_REACTION: Reaction = {
  expression: "celebrating",
  message: "Você subiu de nível!",
};

export const STREAK_REACTION: Reaction = {
  expression: "happy",
  message: "Sequência mantida — continue todos os dias!",
};

export { NEUTRAL_CHARACTER };
