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
];
const INCORRECT_MESSAGES = [
  "Quase! Vamos entender essa questão.",
  "Não foi dessa vez — mas o aprendizado está no processo.",
  "Sem problemas, vamos revisar isso.",
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
