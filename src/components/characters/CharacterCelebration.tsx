/**
 * Celebração em destaque (etapa de consolidação, seção 13) — conclusão de
 * lição, subida de nível, conquista desbloqueada, meta cumprida. Cartão
 * inline (não um modal sobreposto — mantém a navegação simples do Módulo
 * 11, sem nova biblioteca de diálogo); a animação de entrada respeita
 * `prefers-reduced-motion` (`.character-celebration`, `globals.css`).
 */
import { CharacterAvatar } from "./CharacterAvatar";
import type { CharacterDef } from "@/config/characters";

export function CharacterCelebration({
  character,
  title,
  subtitle,
}: {
  character: CharacterDef;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="card character-celebration" style={{ textAlign: "center" }} role="status">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <CharacterAvatar character={character} expression="celebrating" size="lg" />
      </div>
      <p style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: 8 }}>{title}</p>
      {subtitle ? (
        <p style={{ color: "var(--color-text-muted)", marginTop: 4 }}>{subtitle}</p>
      ) : null}
    </div>
  );
}
