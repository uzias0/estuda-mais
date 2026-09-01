# Fase "Vidas/Joias" — Baterias, Joias e Recarga

> Pedido original do usuário (transcrito, com ruído de fala-para-texto):
> "quero que a pessoa tenha um número limitado, por exemplo vinte e cinco
> baterias, igual ao Duolingo... com essas joias você comprou antes
> baterias". Confirmado via `AskUserQuestion`: 25 baterias, mecânica igual
> ao Duolingo (perde 1 por resposta errada, recarrega sozinha com o tempo,
> joia extra recarrega na hora), prioridade "vidas/joias primeiro".

## O que existe agora

- **Baterias (`HeartState`)**: contador mutável por usuário, 25 no máximo.
  Perde 1 bateria a cada resposta ERRADA **nova** dentro de uma **lição**
  (não em revisão/simulado/diagnóstico — ver "Escopo" abaixo). Regenera 1
  bateria sozinha a cada 30 minutos, até o máximo. Ao chegar a 0, a
  próxima submissão de bloco é bloqueada — nenhum progresso/XP é gravado
  até recarregar.
- **Joias (`GemTransaction`)**: ledger append-only (mesmo padrão do XP),
  saldo sempre somado. Ganha 10 joias por lição concluída e 25 joias por
  conquista desbloqueada; gasta 20 joias para recarregar 1 bateria na
  hora.
- **UI**: cabeçalho do dashboard mostra baterias/joias em tempo real
  (Server Component); a tela de gamificação (`GamificationSnapshot`) ganhou
  um 5º card; a lição mostra a bateria atual junto à barra de progresso, e
  uma tela dedicada de "sem baterias" com botão de recarga.

## Decisões de design (e por quê)

1. **`HeartState` é um contador, não um ledger.** Diferente de XP/joia
   (histórico que importa para auditoria/troféus), vida não tem valor
   histórico — só "quanto tem agora" e "desde quando", para calcular
   regeneração sob demanda (sem cron/job, este projeto não roda nada em
   segundo plano). Ver comentário completo em `hearts.service.ts`.

2. **Perder bateria só em LIÇÃO, não em revisão/simulado/diagnóstico.**
   Escopo deliberadamente reduzido nesta primeira entrega: a "jornada"
   onde o Duolingo usa vidas é a prática guiada (equivalente à nossa
   lição); revisão espaçada, simulados e diagnóstico têm objetivos
   diferentes (retenção, autoavaliação, calibração inicial) onde penalizar
   com perda de vida pareceu mais punitivo que motivador. Se o usuário
   pedir depois, o mesmo padrão (`lesson-actions.ts` → `hearts.service.ts`)
   se estende a `review-actions.ts`/`simulation-actions.ts` sem mudar o
   modelo de dados.

3. **Perda de bateria é responsabilidade da Server Action
   (`lesson-actions.ts`), não do `gamification-events.service.ts`.** XP/
   joia de conclusão só precisam ser CONCEDIDOS (nunca bloqueiam nada) e
   podem ser processados depois, na conclusão — mas perder bateria precisa
   acontecer NA HORA, resposta a resposta, podendo interromper a lição
   antes da conclusão. São dois momentos diferentes do fluxo, por isso
   vivem em dois arquivos diferentes.

4. **Idempotência da perda de bateria via `isNewCompletion`, não via
   ledger.** Um bloco de lição só é concluído pela primeira vez uma única
   vez (`@@unique([lessonProgressId, lessonBlockId])`, Módulo 8) — reenviar
   o mesmo bloco nunca soma uma segunda perda. Não foi criado um ledger de
   perdas (`HeartLossEvent`) porque essa garantia já existe de graça.

5. **Corrida rara aceita, não resolvida com lock.** Duas submissões
   simultâneas do MESMO bloco ainda não respondido podem, em teoria, fazer
   `loseHeart` ser chamado duas vezes (mesma classe de corrida já
   documentada em `lesson-execution.service.ts` para estatísticas de
   tentativa). Volume atual do produto não justifica lock pessimista.

6. **Recarga com joia: idempotência protege contra reenvio de rede, não
   contra duplo-clique.** `refillHeartsWithGemsAction` exige uma
   `idempotencyKey`; o cliente gera uma nova a cada clique
   (`crypto.randomUUID()`) e desabilita o botão durante o pedido — mesmo
   padrão de proteção (`pending`) já usado em `LoginForm`/`SignUpForm`.

## O que NÃO foi feito nesta entrega (documentado, não escondido)

- Perda de bateria em revisão/simulado/diagnóstico (ver decisão 2).
- Notificação/push quando a bateria termina de recarregar (não existe
  infraestrutura de notificação push no projeto).
- Compra de joia com dinheiro real — fora de escopo (o pedido original era
  só about a economia interna de bateria/joia, nunca pagamento real; regras
  de segurança deste ambiente proíbem qualquer fluxo de pagamento real de
  qualquer forma).
- Painel administrativo para ajustar bateria/joia de um aluno manualmente
  (não pedido; se necessário, seguiria o mesmo padrão dos demais
  `SimpleEntityPages` administrativos).

## Verificação

- `src/modules/gamification/server/services/hearts.service.test.ts` (10
  testes): perda, piso em 0, regeneração determinística (via parâmetro
  `now`), recarga sem passar do teto, privacidade.
- `src/modules/gamification/server/services/gems.service.test.ts` (11
  testes): crédito/débito, idempotência de ambos, saldo insuficiente,
  histórico, privacidade.
- `gamification-events.service.test.ts` estendido: joia de conclusão de
  lição e de conquista desbloqueada, idempotência de ambas.
- `lesson-actions.test.ts` estendido: perda de bateria real numa resposta
  errada via Server Action (com reset explícito do estado do ator de
  desenvolvimento, que é persistido entre execuções de teste — ver
  comentário no próprio teste).
- 640 testes passando (108 arquivos), typecheck e lint limpos.
