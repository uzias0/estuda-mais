# Fase "Expansão de Questões" (Rodada 1)

> Pedido do usuário: "por exemplo de Freud só teve uma questão... quero
> que cada uma tenha no mínimo, questões do básico até o mais avançado
> possível." Depois, escalado para: "no mínimo cem questões pra cada
> um... cada um eu quero que tenha muitas."

## Estado antes

Cada uma das 20 lições autorais (Freud, Jung, Skinner, Piaget, Rogers,
Bandura, Pavlov, Watson, Wundt, William James, Lewin, Vygotsky, Erikson,
Ainsworth, Klein, Winnicott, Anna Freud, Karen Horney, Beck, Maslow)
tinha exatamente **1 questão** no banco — confirmado por auditoria
direta (`scripts/_audit-content-coverage.mts`).

## O que esta rodada fez

`scripts/seed-questions-expansion-1.ts` (+ `npm run
db:seed-questions-expansion-1`) adiciona **4 questões novas por
conceito** (20 × 4 = 80), cobrindo os 4 primeiros níveis de
`Difficulty` — INICIANTE, BASICO, INTERMEDIARIO, AVANCADO ("do básico
ao mais avançado", como pedido). Total: de 20 para 100 questões
autorais.

- `createQuestion`/`linkQuestionToKnowledge`/`publishQuestion` (Módulo
  3) — nenhuma escrita direta no Prisma, mesma autoridade de sempre.
  Cada questão nova é tagueada ao MESMO `Concept` que a lição já usa —
  nenhuma entidade de conhecimento nova.
- Conteúdo 100% autoral (mesma fonte "Conteúdo autoral — plataforma
  Estuda+"), fatos amplamente estabelecidos em livros-texto de
  psicologia — nunca uma citação de prova real (isso é o próximo
  passo, simulados, com curadoria de provas verificáveis e
  respostas oficiais).
- Idempotente por `prompt` (chave de "já existe" antes de criar).

## Viés de tamanho de alternativa — pego e corrigido ANTES de publicar

Ao escrever 80 questões novas rapidamente, sem medir caracteres
enquanto escrevia, o teste de regressão (`no-answer-length-bias.test.ts`)
pegou o mesmo padrão da fase anterior: 51/96 questões (53%) tinham a
alternativa correta como a mais longa. Corrigido em duas rodadas de
reescrita das alternativas erradas (mesma técnica de sempre — só
comprimento/detalhe, nunca fato novo nem alternativa correta mudada),
até restar só 1/96 (o mesmo falso positivo de Anna Freud/MULTI_SELECT
já documentado desde a fase original, não explorável por empate). As
reescritas foram sincronizadas de volta no arquivo de seed, então um
reseed futuro não reintroduz o viés.

## Verificação

- 118 arquivos / 726 testes passando, incluindo o teste de regressão de
  viés de tamanho (1/96 = 1,04%, bem abaixo do limiar de 20%).
- `npm run db:seed-questions-expansion-1` rodado até ficar totalmente
  idempotente (0 criadas, 80 já existentes na segunda execução).
- Typecheck e lint limpos.

## Próximo passo

O usuário pediu, na sequência, no mínimo 100 questões por tópico (não
mais 5) — uma expansão MUITO maior, em andamento na próxima rodada
(`seed-questions-expansion-2.ts` em diante), mesma disciplina de
qualidade e verificação anti-viés a cada lote.
