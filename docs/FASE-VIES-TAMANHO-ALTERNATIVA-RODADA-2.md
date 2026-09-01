# Correção: Viés "resposta mais longa = certa" (Rodada 2)

> Pedido do usuário, testando ao vivo de novo: "Um erro que ainda
> continua acontecendo. As questões que têm a resposta maior sempre são
> acertas, em todas as vezes. Conserte isso."

## O que a rodada 1 tinha deixado passar

`scripts/fix-answer-length-bias.ts` (commit `fc07ea2`) já tinha reduzido
o viés de 81,3% (13/16) para 43,8% (7/16) — só que **nunca atualizou os
scripts de seed**, só a linha de comando aplicada direto no banco via
`updateQuestion`. Duas consequências reais:

1. **43,8% ainda é enorme** num banco de só 16 questões com alternativas
   — o estudante encontra as mesmas poucas questões repetidamente
   (banco de conteúdo pequeno, expansão para 100+ lições por trilha
   ainda pendente) e sente o padrão como "sempre", exatamente o que foi
   reportado.
2. **A correção não era durável**: `seed-academic-content.ts`/
   `seed-academic-content-v2.ts` continuavam com o texto ORIGINAL
   (pré-correção) das alternativas erradas — um reseed futuro (banco
   novo, ambiente de staging, etc.) reintroduziria os 81,3% originais
   sem ninguém perceber.

## O que foi feito

- Auditoria completa (script temporário, descartado depois de usar):
  confirma 16 questões com alternativas no banco todo, 7 ainda
  exploráveis (`longestIsCorrect`), sendo 6 reais e 1 falso positivo já
  documentado (Anna Freud, MULTI_SELECT — empate de tamanho entre uma
  alternativa certa e uma errada, "escolher a mais longa" não funciona
  ali).
- `scripts/fix-answer-length-bias.ts`: nova seção `FIXES_ROUND_2` (6
  questões: Bandura, Winnicott, Wundt, Freud, Vygotsky, Piaget) —
  reescreve as alternativas erradas restantes para comprimento igual ou
  MAIOR que a correta (antes a diferença era de ~10-25 caracteres a
  menos; agora as erradas ficam de alguns a ~35 caracteres mais longas).
  Mesma disciplina de sempre: só qualificadores plausíveis adicionados
  (ex.: atribuir a teoria a outro autor real — "segundo Piaget/Jung/
  Skinner" —, ou reforçar o mesmo conceito com mais detalhe), nenhum
  fato novo inventado, nenhuma alternativa muda de certa para errada.
- **Os dois scripts de seed foram atualizados com o MESMO texto final**
  — a correção agora está na fonte, não só no banco já populado. Um
  reseed futuro não reintroduz o viés.
- `src/test/no-answer-length-bias.test.ts`: limiar de regressão apertado
  de 60% para 20% — 60% só existia para não disparar por ruído numa
  amostra de 16 questões, mas na prática deixou passar exatamente o
  problema que o usuário sentiu; 20% ainda tem folga para coincidência
  estatística, mas pega uma regressão bem antes de voltar a virar 40%+.

## Resultado

| Métrica | Antes (rodada 1) | Depois (rodada 2) |
|---|---|---|
| Resposta certa = mais longa (incl. empates) | 43,8% (7/16) | 6,3% (1/16 — só o falso positivo) |
| Resposta certa = ÚNICA mais longa (sem empate) | 31,3% (5/16) | 0,0% (0/16) |

## Verificação

- `npm run db:fix-answer-length-bias`: 6 questões corrigidas no banco de
  desenvolvimento (as outras 12 da rodada 1 continuam "já atualizada —
  pulando", confirmando idempotência).
- 116 arquivos / 713 testes passando (incluindo o teste de regressão
  apertado), typecheck e lint limpos.
- **Pendente do usuário**: rodar `npm run db:fix-answer-length-bias`
  contra o banco de PRODUÇÃO (Render) — esta correção só foi aplicada
  no banco de desenvolvimento local nesta sessão.
