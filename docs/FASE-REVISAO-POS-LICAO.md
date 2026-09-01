# Fase "Revisão Pós-Lição"

> Pedido do usuário: "ao fim de toda a tarefa você tem que fazer uma
> revisão de erros que a pessoa teve, e se não teve erros não precisa.
> Colocar quantos por cento que ela aceitou, se ela acertou cem por
> cento, aí deu um parabéns, deu uma resposta personalizada."

## O que já existia

O aproveitamento (`accuracy`, 0–100 ou `null`) já era calculado pelo
Módulo 8 (`deriveLessonAccuracy`, `lesson-progress.ts`) e já aparecia na
tela de conclusão da lição (`"Aproveitamento: X%"`). Faltava:

1. Mostrar QUAIS questões foram erradas (só o número, não o conteúdo).
2. Uma mensagem de conclusão personalizada quando o aproveitamento é
   100% — antes a mensagem era sempre a mesma genérica.

## O que foi adicionado

- `getWrongLessonBlocks(lessonProgressId)`
  (`src/modules/pedagogy/server/services/lesson-execution.service.ts`) —
  leitura pura dos `LessonBlockCompletion` com `isCorrect: false` de uma
  execução, juntando o `prompt`/`explanation` da `Question` (Módulo 3) —
  nenhuma correção nova, só reaproveita o que `recordAttempt` já gravou.
  Não é uma Server Action própria (sem checagem de privacidade própria)
  porque o `lessonProgressId` que recebe já vem de um `completeLesson`
  que validou pertencer ao `actor` — mesmo padrão de função "interna" já
  usado em `evaluateAndRewardWeeklyMissions` (Módulo 9).
- `completeLessonAction` (`lesson-actions.ts`) agora também devolve
  `wrongQuestions` (chama `getWrongLessonBlocks` em paralelo com
  `processLessonCompletionEvent`, mesmo `Promise.all` de antes).
- `lessonCompleteReaction(accuracy)` (`reactions.ts`) — devolve uma das 3
  mensagens de celebração personalizadas quando `accuracy === 100`,
  senão a reação genérica de sempre (`LESSON_COMPLETE_REACTION`).
- `LessonRunner.tsx`: tela de conclusão agora usa
  `lessonCompleteReaction(completed.accuracy)` como título, e — só
  quando `wrongQuestions.length > 0` — mostra um card "Revisão — o que
  revisar nesta lição" com o enunciado + explicação de cada questão
  errada. Quando não há nenhuma errada (100%), o card simplesmente não
  aparece (pedido explícito: "se não teve erros não precisa").

## Decisões

- Mostra só enunciado + explicação da `Question`, não um diff "sua
  resposta vs. resposta certa" — a explicação já cobre o raciocínio
  correto, e cada tipo de questão (8 tipos) teria uma representação de
  resposta diferente; manter simples nesta entrega.
- Nenhuma tabela nova, nenhuma migration — os dados já existiam em
  `LessonBlockCompletion`/`Question`.

## Verificação

- Testes novos: `getWrongLessonBlocks` (fixture com 1 questão certa + 1
  errada, confere que só a errada aparece, na ordem certa, com a
  explicação certa), `completeLessonAction` (extensão do teste
  existente: resposta forjada como errada de propósito → aparece em
  `wrongQuestions`), `lessonCompleteReaction` (accuracy null/<100 →
  reação genérica; accuracy 100 → mensagem personalizada, nunca a
  genérica).
- 116 arquivos / 713 testes passando, typecheck e lint limpos.
- Verificado ao vivo, ponta a ponta, com uma conta real: lição
  "Freud e o Inconsciente" respondida com 1 erro proposital → tela final
  mostrou "Aproveitamento: 0%" + o card de revisão com a pergunta e a
  explicação certa; lição "Jung e os Arquétipos" respondida 100% certa →
  "Perfeito! Você acertou todas as questões desta lição." +
  "Aproveitamento: 100%", sem nenhum card de revisão.
