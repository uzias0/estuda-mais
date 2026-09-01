# Fase "Design Profundo 2" — Estrada, Diálogo e Barra de Status

> Pedido do usuário (transcrito): "eu quero uma estrada ali, tudo
> bonitinho... quero exercícios que o personagem tipo Freud fale com a
> pessoa... quero porções de XP, quero que fique ali em cima, sua
> [sequência], sua bateria... lembrando que tem que ter o layout pra
> computador e celular."

## O que foi entregue

### 1. Estrada (caminho de aprendizagem)

`LearningPath.tsx` ganhou um trecho de estrada curva (SVG, `<path>` com
Bézier cúbica) entre cada par de nós consecutivos, substituindo a linha
reta única de antes. Detalhes:

- `buildConnectorPathD(from, to)` — função pura, testada isoladamente
  (`LearningPath.test.ts`), gera a curva a partir das mesmas coordenadas
  X (12%/50%/88%) que já posicionavam os nós esquerda/centro/direita.
- `computeConnectorOrigins(items)` — pré-calcula, ANTES do JSX, de onde
  cada trecho de estrada deveria vir. Não é feito dentro do `.map()` de
  renderização porque mutar uma variável capturada por um callback
  executado durante o render viola a regra `react-hooks/immutability` do
  linter (o React pode, no futuro, pular/reordenar chamadas do callback).
- A estrada reinicia visualmente só ao cruzar um rótulo de ÁREA (não a
  cada unidade/etapa) — a maioria das etapas desta base tem 1 lição só,
  então resetar em todo rótulo de grupo faria a estrada nunca aparecer.
- Cores dedicadas (`--color-path`/`--color-path-edge`, claro e escuro)
  distintas de `--color-border`/`--color-surface-muted` para ter contraste
  suficiente contra o fundo — as variáveis genéricas eram baixo contraste
  demais para uma estrada "bonitinha" de verdade.
- Verificado ao vivo em desktop E mobile (375px) — a curva se estica via
  `preserveAspectRatio="none"`, sem depender de medir o DOM em JS.

### 2. Personagem conversando ("Freud fale com a pessoa")

- `reactions.ts` ganhou `lessonStartReaction()` — saudação variada ao
  ABRIR uma lição (antes só existia reação depois de responder). Message
  pools de resposta certa/errada também ficaram bem mais variadas (3→8
  cada).
- `LessonRunner` mostra essa saudação com `CharacterMessage` na tela
  inicial da lição, usando o MESMO personagem já resolvido por
  `resolveCharacterForLesson` — ou seja, Freud/Jung/Rogers/etc. realmente
  "fala" com o aluno desde a abertura, não só no feedback de resposta.
- **Bug real encontrado e corrigido durante a verificação ao vivo**: gerar
  a saudação aleatória dentro do inicializador de `useState` roda a mesma
  função TANTO no servidor quanto no cliente durante a hidratação —
  `Math.random()` sorteia valores DIFERENTES nos dois lados, causando um
  erro real de hidratação do React ("server rendered text didn't match
  the client"), confirmado no console do navegador. Corrigido com
  `LESSON_START_REACTION_FALLBACK` (mensagem fixa, idêntica nos dois
  lados) como valor inicial, e a randomização de verdade só acontece
  depois de montado, num `useEffect` (roda só no cliente, não precisa
  bater com o servidor).
- "Porção de XP" por questão certa: `+10 XP` aparece imediatamente após
  uma resposta correta (reaproveita `XP_REWARDS.LESSON_QUESTION_CORRECT`
  já existente — não é um número novo). O crédito real continua batendo
  na conclusão da lição, como sempre (Módulo 9) — este é só o preview
  visual imediato, igual ao "tique" de XP do Duolingo durante a lição.

### 3. Barra de status unificada no topo

`Header.tsx` (antes só mostrava bateria/joia, da fase anterior) agora
mostra streak 🔥, XP total ⭐, bateria ❤️ e joia 💎 juntos, sempre visível
em toda página do dashboard — pedido explícito: "quero que fique ali em
cima".

- Em telas ≤480px, o cabeçalho: esconde o texto "Estuda+" (mantém só o
  ícone), esconde o sino de notificação (ainda decorativo, sem função
  real) e reduz o padding dos selos — sem isso, só 2 dos 4 selos cabiam
  na largura, os outros 2 ficavam escondidos atrás de scroll horizontal.
  Verificado ao vivo: os 4 selos cabem numa tela de 375px sem cortar nada.

## Decisões / limites desta entrega

- A estrada é decorativa (`aria-hidden="true"`) — a navegação real continua
  só pelos links dos nós, nunca pela forma da estrada em si.
- Mensagens do personagem continuam sempre genéricas/motivacionais, nunca
  citam um conceito específico da lição (mesma regra desde a etapa de
  consolidação: personagem nunca vira fonte de conteúdo acadêmico).
- Não foi criado nenhum sistema de "conquista visual" (baú, troféu no fim
  da trilha) — fora do escopo verbal explícito desta entrega; pode ser uma
  próxima iteração se pedido.

## Verificação

- Testes novos: `LearningPath.test.ts` (+3, cobrindo `buildConnectorPathD`/
  `POSITION_X`), `reactions.test.ts` (novo arquivo, 6 testes).
- 109 arquivos / 649 testes passando, typecheck e lint limpos.
- Verificado ao vivo no dev server: estrada renderizando em 2 trilhas
  diferentes, saudação variando entre personagens reais (Mente/Rogers),
  bug de hidratação reproduzido E corrigido (confirmado limpo depois),
  barra de status em desktop (1280px) e mobile (375px).
