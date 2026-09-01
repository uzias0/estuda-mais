# Fase "Correção de Bugs 1" — Questões, Filtro Quebrado, Topbar

> Bugs reais reportados pelo usuário testando o app: "não tem como
> responder às questões... quando eu filtro sem nada ele fala não foi
> possível carregar seus estudos... arrume a topbar, está muito
> centralizada... quando eu clico pra selecionar [um filtro]... está
> muito feio, só um quadradão com umas opções".

## Bugs corrigidos

### 1. Tela "Questões" não deixava responder nada

`src/app/dashboard/questoes/page.tsx` renderizava cada questão como um
cartão 100% somente-leitura (tipo/dificuldade/enunciado) — nunca chamava
`QuestionRenderer`, nunca tinha um jeito de enviar resposta. Corrigido:

- Novo componente `PracticeQuestionCard.tsx` — usa o mesmo
  `QuestionRenderer`/`QuestionFeedback` já usados em lições/revisão/
  simulados, sem nenhuma lógica de correção nova.
- Nova Server Action `submitPracticeAnswerAction` → `recordAttempt`
  (Módulo 3) com `context: AttemptContext.PRACTICE` (valor NOVO no enum,
  aditivo — mesmo padrão de quando `DIAGNOSTIC` foi adicionado). Funciona
  sem `sessionId` nenhum, confirmado no código-fonte de `recordAttempt`.

### 2. Filtro "sem nada selecionado" derrubava a página inteira

Um `<select>` nativo sem opção escolhida ainda envia
`name=""` no GET (nunca omite o campo). O helper `str()` da página
tratava isso como um valor de filtro REAL (`difficulty: ""`), que o
Prisma/Postgres rejeita por não ser um valor válido do enum —
lançando uma exceção não capturada, que subia até o `error.tsx` genérico
do dashboard ("Não foi possível carregar seus estudos"). Corrigido:
`str()` agora trata string vazia exatamente como "nenhum filtro"
(`undefined`).

### 3. `<select>` de filtro sem nenhum estilo

Confirmado no CSS: `.text-input` (única classe usada nos `<select>`)
nunca tinha nenhuma regra própria de `<select>` — o dropdown ficava 100%
com a aparência padrão do navegador (sem seta customizada, sem hover).
Corrigido com uma seta própria (`appearance: none` + ícone SVG embutido)
e um hover na cor de marca — a LISTA de opções em si continua sendo
renderizada pelo sistema operacional (nenhum navegador permite
estilizá-la com CSS puro), só a caixa fechada muda.

### 4. Barra de topo "muito centralizada"

O cabeçalho usava `justify-content: space-between` com 4 filhos (marca/
busca/selos/ícones) — a busca (`max-width: 360px`) ficava flutuando numa
faixa vazia grande no meio, sem se relacionar visualmente com o resto.
Corrigido: a busca agora cresce (`flex: 1`, até 480px) para preencher o
meio de verdade, e o grupo de selos+sino+sair é empurrado pro canto
direito (`margin-left: auto`) — qualquer sobra de espaço vira uma única
lacuna normal entre os dois grupos, não mais espalhada por todo o
cabeçalho.

## Verificação

- `src/modules/assessment/server/services/questionAttempt.service.test.ts`
  ganhou um teste confirmando que `context: "PRACTICE"` funciona sem
  `sessionId`/`simAttemptId`.
- 111 arquivos / 675 testes passando, typecheck e lint limpos.
- Verificado ao vivo: filtro "tudo vazio" não derruba mais a página;
  resposta real registrada com sucesso ("✓ Resposta correta" +
  explicação real exibida); selects com seta customizada; cabeçalho sem
  a faixa vazia no meio.
