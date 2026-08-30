# Redesign Visual — Psicologia Gamificada

> Complementa `docs/ARQUITETURA.md` (aditivo), `docs/MOBILE-PWA.md` e
> `docs/FINALIZACAO-PROJETO.md`. Executada por uma única linha de execução,
> sem agentes paralelos.

## 1. Auditoria inicial

Antes de qualquer alteração, li `globals.css`, `Header`/`SidebarNav`/
`BottomNav`, `LessonRunner`/`DiagnosticRunner`/`ReviewSessionRunner`,
`QuestionRenderer`, `CharacterAvatar`/`CharacterMessage`/
`CharacterCelebration`, `StudyActionCard`, `ProgressBar`, `Badge`,
`EmptyState`/`ErrorState`/`QuestionFeedback`, o dashboard, a página de
trilha/trilhas, conquistas, perfil e login/signup. Conclusão real (não
assumida): a base já era mobile-first na prática (sidebar só aparece
`@media (min-width:1024px)`, alvos de toque ≥44px, `BottomNav` fixa com
`env(safe-area-inset-bottom)`) — mas a apresentação da árvore pedagógica
(`Trilha→Área→Unidade→Etapa→Lição`) era uma lista aninhada com indentação
crescente, visualmente idêntica a um painel administrativo — exatamente o
problema descrito na seção 2 do prompt.

## 2. Bibliotecas encontradas

`package.json` não tem Tailwind, shadcn/ui, Motion, GSAP, nem biblioteca de
ícones — só Next/React/Prisma/zod/pg. Todo o sistema visual (Módulo 11) é
CSS puro com custom properties. Avaliei adicionar uma biblioteca de
animação/ícones para esta fase e decidi **não adicionar nenhuma**: o CSS
puro já resolve tudo que esta fase precisava (transições, `@keyframes`,
`prefers-reduced-motion`), sem custo de bundle nem dependência nova — e o
prompt pede explicitamente para não adicionar biblioteca "só porque foi
mencionada no roadmap antigo" sem benefício técnico real comprovado.

## 3. Design system

Tokens novos em `:root` de `globals.css` (todos centralizados, nenhum valor
solto nos componentes):

- `--radius-pill`, `--motion-fast/base/celebrate`, `--ease-standard/bounce`;
- `--gradient-brand` (gradiente com as MESMAS cores de marca já existentes);
- `--shadow-float` (elevação colorida, para CTA/nós disponíveis),
  `--shadow-pop` (elevação funda, para cartões de destaque/celebração).

Novas classes utilitárias: `.card-hero`, `.achievement-card--unlocked/
--locked`, `.lesson-path`/`.lesson-node*` (seção 4), refinamento de
`.btn-primary` (gradiente + sombra + leve elevação só com `hover:hover`,
nunca em toque), `.option-row` (raio maior, `accent-color`, feedback de
toque), `.bottom-nav-link` (pílula de fundo no item ativo).

## 4. Telas redesenhadas

- **`/dashboard/trilhas/[trackId]`** — de lista aninhada para **caminho
  visual de nós** (`LearningPath`, novo componente). Mesma estrutura de
  `getFullTrack` e mesmo mapa de `getTrackLessonAvailability` (Módulos 4/8)
  — nenhum estado novo, só interpretação visual: nós circulares alternando
  esquerda/centro/direita ao longo de uma linha central, cor/ícone por
  estado (bloqueada/disponível/concluída/dominada), nó "disponível" com
  pulso sutil (respeitando reduced-motion).
- **Dashboard** — `StudyActionCard` em destaque agora usa `.card-hero`
  (fundo tingido de marca + sombra funda) em vez de `.card` plano.
- **Questões** (`QuestionRenderer`/`.option-row`) — alternativas maiores,
  cantos mais arredondados, cor de acento no rádio/checkbox, feedback de
  toque (`:active` scale).
- **Conquistas** — cartões desbloqueados ganham verniz dourado
  (`.achievement-card--unlocked`), bloqueados ficam com opacidade reduzida.
- **Login/Signup** — selo de marca circular com gradiente (mesmo token do
  app), entrada suave do formulário (`fade-in-up`).
- **Navegação inferior** — item ativo ganha uma pílula de fundo com leve
  elevação, em vez de só mudar a cor do texto.

## 5. Componentes novos

- `LearningPath.tsx` + `buildPathItems` (função pura, testada isoladamente
  em `LearningPath.test.ts` — achata a árvore em nós posicionados sem
  precisar renderizar nada).

## 6. Componentes reutilizados

`CharacterAvatar`/`CharacterMessage`/`CharacterCelebration`,
`QuestionRenderer` (8 tipos, intocado na lógica), `GamificationSnapshot`,
`ProgressBar`, `Badge`, `EmptyState`/`ErrorState`, `StudyActionCard`,
`LessonRunner`/`DiagnosticRunner`/`ReviewSessionRunner`, `Header`,
`SidebarNav`/`BottomNav` — nenhum recriado.

## 7. Bibliotecas utilizadas

Nenhuma nova. Só CSS nativo + o que o Next.js já embutia (`ImageResponse`
da fase PWA, inalterado).

## 8. Animações

Reaproveitadas as já existentes (`fade-in-up`, `character-bounce-in`,
`character-pop`, `xp-gain-pop`) + as novas desta fase (pulso do nó
disponível, elevação do botão primário, pílula da navegação, feedback de
toque das alternativas) — todas com `transition`/`animation` curtas
(120–550ms), nenhuma repetição indefinida excessiva além do pulso do nó
"disponível" (2.2s, sutil, com o único propósito de guiar o olho para a
próxima ação).

## 9. Personagens

Sistema inalterado (`CHARACTERS`, `resolveCharacterForSchoolSlug`/
`resolveCharacterForLesson`, das fases anteriores) — nenhuma autoridade
nova, nenhum personagem de terceiro.

## 10. Experiência mobile

Prioridade real: toda mudança foi pensada primeiro no viewport 375×812 e
verificada por leitura do HTML servido (seção 14) antes de qualquer ajuste
de desktop.

## 11. Experiência desktop

Nenhuma regra de desktop foi removida (`@media (min-width:1024px)`
intacto); os tokens/gradiente/sombra novos se aplicam igualmente em telas
maiores, sem duas implementações.

## 12. Acessibilidade

Toda animação nova tem fallback em `prefers-reduced-motion` — garantido
estruturalmente por `globals-css.test.ts` (varre `globals.css` e falha se
alguma classe com `animation` própria não estiver coberta). Nenhum alvo de
toque abaixo de 44px; `aria-label`/`aria-disabled` mantidos/adicionados no
`LearningPath` (nó bloqueado nunca vira link, sempre anunciado como
"bloqueada").

## 13. PWA

Preservada integralmente (manifest, ícones, service worker, viewport) —
nenhuma alteração desta fase tocou nesses arquivos.

## 14. Validação visual

Como o clique físico via navegador automatizado se mostrou instável nesta
sessão (mesma limitação já registrada em `docs/FINALIZACAO-PROJETO.md` e
`docs/MOBILE-PWA.md` — a página ficava presa no fallback de streaming do
React mesmo com servidor respondendo 200 e sem erro de console), a
validação real foi feita lendo o HTML efetivamente servido (`curl` direto
contra o servidor de desenvolvimento, com sessão real) para as telas
prioritárias:

- `/login`, `/signup` — selo de marca e formulário confirmados no HTML.
- `/dashboard` — saudação/personagem reais confirmados.
- `/dashboard/trilhas` — nome da trilha real semeada
  ("Fundamentos da Psicologia") confirmado.
- `/dashboard/trilhas/[trackId]` — `lesson-path`/`lesson-node-circle` e o
  título real de uma lição semeada ("Freud e o Inconsciente") confirmados
  no HTML — o caminho visual está de fato renderizando dados reais.
- `/dashboard/conquistas` — estado vazio real (esta conta não tem
  conquista desbloqueada) renderizado corretamente.
- `/dashboard/perfil` — nome real do perfil confirmado.

## 15. Testes

**559/559 passando** (555 anteriores + 4 novos de `LearningPath.test.ts`:
ordem/posição dos nós, fallback seguro para `LOCKED` quando não há
disponibilidade calculada, rótulos de grupo). `globals-css.test.ts`
(fase mobile/PWA) continua cobrindo toda animação nova.

## 16. Typecheck/Lint/Format/Build

Todos limpos.

## 17. Problemas encontrados e corrigidos

- Reaproveitar uma variável mutável (`nodeIndex += 1`) durante a renderização
  do `LearningPath` disparou o lint `react-hooks/immutability` — corrigido
  achatando a árvore numa função pura (`buildPathItems`) ANTES de
  renderizar, em vez de mutar estado durante o JSX (também deixou a lógica
  de posicionamento testável isoladamente).

## 18. Limitações

- Validação por clique físico no navegador automatizado não foi possível
  nesta sessão (ver seção 14) — mitigado com leitura direta do HTML real
  servido pelo servidor de desenvolvimento.
- Nenhuma biblioteca de ícones/ilustração foi adicionada — os glifos
  seguem sendo emoji Unicode (já usados desde o Módulo 11), por decisão
  deliberada (seção 2), não por limitação técnica.

## 19. Confirmação: nenhuma regra de negócio duplicada

`LearningPath` só interpreta `LessonAvailabilityStatus` (Módulo 8) e os
dados de `getFullTrack` (Módulo 4) — nenhum cálculo de desbloqueio, XP,
progresso ou recomendação foi recriado. Nenhuma outra alteração desta fase
tocou em serviço de domínio, Server Action ou regra de autorização.

## 20. Confirmação: nenhum conteúdo acadêmico falso inserido

Nenhuma questão, obra, autor, prova ou atualidade foi criada nesta fase —
só CSS/componentes de apresentação. O conteúdo real exibido nas capturas da
seção 14 é o mesmo semeado na fase anterior
(`docs/FASE-CONTEUDO-ACADEMICO.md`), não algo novo desta fase.

## 21. Estimativa atual de conclusão

**~95%** (era ~94%). Ganho real: a tela mais visualmente "administrativa"
do produto (árvore de trilha) virou um caminho gamificado de verdade, e o
design system deixou de ser só funcional para ter identidade própria
consistente. O que falta para 100% continua sendo o mesmo: conteúdo
acadêmico em maior volume, verificação de e-mail/recuperação de senha, e
infraestrutura de produção — nada disso é lacuna de design/UX.

---

## 22. Redesign profundo (2ª passagem) — ícones reais + expressões de personagem

Continuação da mesma fase, focada no que era genuinamente NOVO em relação
à passagem anterior (não repete design system/`LearningPath`, já
entregues):

- **Biblioteca de ícones adicionada**: `lucide-react` (única dependência
  nova de toda a fase de redesign) — SVG puro, tree-shakeable (cada ícone é
  seu próprio módulo, só o usado entra no bundle), sem CSS-in-JS,
  compatível com React 19. Substituiu emoji como ÍCONE DE INTERFACE em
  `SidebarNav`/`BottomNav` (`nav-items.ts` agora carrega o componente do
  ícone, não mais uma string), `Header` (🔔→`Bell`, 👤→`LogOut`, 🧠→`Brain`)
  e nos nós do `LearningPath` (▶/🔒/✓/★ → `Play`/`Lock`/`Check`/`Star`).
  Emoji continuam em textos/celebrações (`reactions.ts`,
  `CharacterCelebration`) — não são "ícone de interface", são conteúdo.
- **Expressões de personagem expandidas**: `CharacterExpression` ganhou
  `excited`/`sad`/`confused`/`pointing` (antes só `neutral`/`happy`/
  `celebrating`/`thinking`/`encouraging`/`surprised`) — mesmo componente
  paramétrico (`CharacterAvatar`), nenhum arquivo novo por expressão.
- **Personagem "apontando" no `LearningPath`**: a primeira lição
  `AVAILABLE` da sequência (`isCurrent`, novo campo só de apresentação em
  `buildPathItems` — nenhum status de negócio novo) ganha destaque visual
  maior + o personagem correto (resolvido por `resolveCharacterForLesson`,
  já existente) ao lado, expressão `pointing`.
- **Componentes nomeados de card (AppCard/ActionCard/.../ReviewCard,
  seção 4 do prompt) — decisão deliberada de NÃO criar**: o sistema já
  atinge consistência visual via classes CSS compartilhadas
  (`.card`/`.card--tight`/`.card-hero`); embrulhar cada uma em 9
  componentes React finos seria mais duplicação estrutural, não menos.

### Testes novos desta passagem

`CharacterAvatar.test.ts` (12 casos — `renderToStaticMarkup`, sem DOM/
jsdom: as 10 expressões renderizam SVG válido, `aria-label` sempre
nome+papel real, `pointing` desenha a seta), `LearningPath.test.ts` (+2:
`isCurrent` marca só a primeira `AVAILABLE`, nunca marca nada quando não
há disponível), `nav-items.test.ts` (+1: todo ícone é componente, nunca
string/emoji), `QuestionRenderer.contract.test.ts` (+1: o HTML
REALMENTE renderizado pelo componente — não só o formato do dado — nunca
contém `isCorrect`/`answerKey`). **575/575 passando** (559 + 16 novos).

Verificado no HTML servido de verdade (mesma técnica de `curl` com sessão
real das passagens anteriores): 0 emoji na navegação/cabeçalho, 20 SVGs em
`/dashboard`, 31 em `/dashboard/trilhas/[trackId]` incluindo
`lesson-node--current`/`lesson-node-pointer`.
