/**
 * Personagem + balão de mensagem curta (etapa de consolidação, seções 4/6)
 * — usado nas reações a resposta correta/incorreta, saudação do dashboard,
 * etc. Mensagens curtas, amigáveis, motivacionais — nunca fonte de
 * conteúdo acadêmico (seção 6: "não transformar personagens em fonte de
 * conteúdo incorreto" — o texto aqui é sempre só uma reação, nunca uma
 * explicação de domínio).
 */
import { CharacterAvatar } from "./CharacterAvatar";
import type { CharacterDef, CharacterExpression } from "@/config/characters";

export function CharacterMessage({
  character,
  expression = "neutral",
  message,
  size = "md",
}: {
  character: CharacterDef;
  expression?: CharacterExpression;
  message: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="character-message" role="status">
      <div className="character-message-avatar character-bounce-in">
        <CharacterAvatar character={character} expression={expression} size={size} />
      </div>
      <div className="character-message-bubble">
        <p style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
          {character.name}
        </p>
        <p>{message}</p>
      </div>
    </div>
  );
}
