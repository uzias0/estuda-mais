# Fase "Tirar Emoji"

> Pedido do usuário: "tire esses emoji, esses emoji está muito artificial.
> Crie algo mais real, crie uma arte própria pra ele."

## O que mudou

Emoji pictóricos (🔥⭐❤️💎🥉🥈🥇💠🏆✅📚🗓️🎯💔🔴) usados como ÍCONE de
interface foram substituídos por componentes reais do `lucide-react` —
mesma biblioteca (já instalada, sem nova dependência) e o mesmo padrão já
estabelecido em `src/components/nav-items.ts` desde a fase de redesign
profundo ("não utilizar emojis como ícones principais da interface").

Arquivos alterados:

- `src/components/Header.tsx` — selos de sequência/XP/bateria/joia no topo
  (`Flame`/`Star`/`Heart`/`Gem`).
- `src/components/GamificationSnapshot.tsx` — os 5 cards de resumo
  (`Flame`/`Star`/`Target`/`BookOpen`/`Heart`+`Gem`).
- `src/components/LessonRunner.tsx` — selo de bateria durante a lição, tela
  de "sem baterias" (`HeartCrack`), ganho de joia ao concluir.
- `src/components/ComecarFlow.tsx` — cards do tutorial pré-cadastro.
- `src/app/dashboard/missoes/page.tsx` — ícone por tipo de missão
  (`BookOpen`/`CheckCircle2`/`Star`/`CalendarDays`, fallback `Target`).
- `src/app/dashboard/ranking/page.tsx` — ícone/cor por divisão (`Medal`
  bronze/prata/ouro, `Gem` platina, `Crown` diamante).
- `src/app/dashboard/conquistas/page.tsx`, `perfil/page.tsx`,
  `revisao/page.tsx` — badges/cards de conquista, atalhos e alerta de
  revisão atrasada.
- `src/components/auth/TwoFactorSettings.tsx` — confirmação de 2FA ativado.
- `src/components/characters/reactions.ts` — duas mensagens de reação
  tinham emoji solto no texto (sem slot de ícone); só removido o emoji do
  texto.
- `src/components/admin/admin-nav-items.ts` +
  `src/components/admin/AdminSidebarNav.tsx` +
  `src/components/admin/AdminHeader.tsx` — menu e cabeçalho da área
  administrativa, mesmo tratamento (ícones do `lucide-react` no lugar dos
  emoji de string).

Dois tokens de cor novos em `globals.css` (`--color-heart`, `--color-gem`)
— mesmo padrão de `--color-xp`/`--color-streak` já existentes — para os
ícones de bateria/joia terem identidade visual própria em vez de herdar a
cor neutra do texto.

## O que foi mantido de propósito

- Glifos tipográficos neutros (✕ pra remover uma tag, ✓/✗ em
  `QuestionFeedback`) não são o "emoji artificial" que o usuário
  reclamou — continuam como estão.
- O ícone/logo real do app (🧠 em `app-icon.tsx`, `manifest.ts`,
  `AuthShell.tsx`, `offline/page.tsx`, `icon-512-maskable`) NÃO foi
  mexido aqui — é o próximo item do backlog ("logo mais característica
  do projeto"), que precisa de uma arte própria de verdade, não só a
  troca por um ícone de biblioteca.

## Verificação

- `npx tsc --noEmit`: limpo.
- `npx eslint` nos arquivos alterados: limpo.
- `npx vitest run`: 116 arquivos / 710 testes passando (nenhum teste
  precisou mudar — troca é puramente visual).
- Verificado ao vivo: `/comecar` (tutorial com os 4 selos), sign-up real,
  `/dashboard` (Header), `/dashboard/missoes`, `/dashboard/ranking`,
  `/dashboard/conquistas`, `/dashboard/perfil`, e resposta real de uma
  questão em `/dashboard/questoes` (garante que a fase anterior de
  correção de bugs continua funcionando) — screenshots conferidos, sem
  emoji visível, ícones coloridos renderizando corretamente.
