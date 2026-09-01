/**
 * Casca visual comum às telas de autenticação — login, cadastro, "esqueci
 * minha senha" e "redefinir senha" (fase de redesign visual; queixa real
 * do usuário: "a tela de login está cru, está tudo feio", e "não vi
 * personagens nenhum, só vi uma carinha azul"). Antes cada uma dessas 4
 * páginas repetia o mesmo `<div>` com um emoji 🧠 solto; agora todas usam
 * este componente, com o personagem NEUTRO (`Mente`) como mascote de
 * boas-vindas — reaproveita só o que já existia (`CharacterAvatar`,
 * `.auth-page`/`.auth-panel`/`.auth-brand-*` de `globals.css`), nenhuma
 * biblioteca ou cor nova.
 *
 * Server Component — nenhuma interatividade própria; os formulários
 * (`LoginForm`, `SignUpForm`, etc.) que entram como `children` continuam
 * Client Components por conta própria, como já eram.
 */
import type { ReactNode } from "react";
import { CharacterAvatar } from "@/components/characters/CharacterAvatar";
import { CHARACTERS } from "@/config/characters";

export function AuthShell({
  subtitle,
  banner,
  children,
}: {
  subtitle: string;
  banner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-mascot character-bounce-in">
          <CharacterAvatar character={CHARACTERS.neutral} expression="happy" size="lg" />
        </div>
        <div>
          <h1 className="auth-brand-title">Estuda+</h1>
          <p className="auth-brand-subtitle">{subtitle}</p>
        </div>
        {banner}
        {children}
      </div>
    </div>
  );
}
