# Fase "Missões Semanais e Ranking" — Duolingo-style

> Pedido do usuário, prioridade confirmada logo depois de vidas/joias:
> "missões semanais" → "ranking semanal com várias divisões".

## O que foi entregue

### Missões semanais

- Catálogo FIXO de 8 templates (`src/config/missions.ts`) — 3 ficam
  ativos por semana, escolhidos por uma função pura e determinística do
  `weekKey` (`selectActiveMissions`), sem sortear nada em tempo real.
- Progresso 100% derivado de dados já existentes (`LessonProgress`/
  `QuestionAttempt`/`GamificationEvent`) — nenhum contador redundante
  persistido. Só a recompensa (XP+joia) precisa de idempotência, ancorada
  em `weekKey:missionId` (mesmo padrão de `awardXp`/`creditGems`).
- Concedida em DOIS momentos: (a) toda vez que o aluno abre `/dashboard/
  missoes`, e (b) automaticamente, em paralelo com conquistas, toda vez
  que uma lição/revisão/simulado/diagnóstico é concluído
  (`finalizeGamificationProcessing`) — o aluno recebe o bônus na hora,
  sem precisar visitar a tela de missões.

### Ranking semanal com divisões

- **Decisão de arquitetura importante**: o Duolingo real forma grupos de
  ~30 pessoas aleatórios toda semana via um job agendado. Este projeto
  não tem cron/job em segundo plano (mesmo motivo já registrado para
  bateria/meta diária/missões). Em vez de grupos aleatórios, a "divisão"
  aqui é determinada pelo NÍVEL atual do aluno (Bronze 1-5, Prata 6-10,
  Ouro 11-20, Platina 21-35, Diamante 36-50) — sempre a mesma divisão pro
  mesmo nível, sem sortear/persistir nenhum grupo. Dentro da divisão, o
  ranking ordena por XP ganho NESTA SEMANA.
- Só um placar nesta primeira entrega — nenhuma recompensa de
  promoção/rebaixamento ainda (pode ser pedido depois).
- Custo documentado: agrega XP de todos os usuários duas vezes (total
  histórico pra achar a divisão de cada um; só da semana pra ranquear) —
  aceitável no volume atual, pediria uma tabela de materialização numa
  base muito maior.

### Infraestrutura nova compartilhada

- `calendar.ts` — cálculo de "semana" (segunda a domingo) reutilizável,
  mesmo padrão de `getStudyDayKey` (fuso fixo configurável, nunca o fuso
  do processo).
- Nav: "Missões" e "Ranking" adicionados ao FIM da lista de navegação —
  de propósito, pra não quebrar os índices fixos que `BOTTOM_NAV_ITEMS`
  já usava para referenciar os 5 itens centrais do mobile.

## Verificação

- `calendar.test.ts` (8 testes), `ranking.test.ts` (4 testes — pegou um
  bug real: nível abaixo do mínimo caía na ÚLTIMA divisão em vez da
  primeira, corrigido), `weekly-missions.service.test.ts` (8 testes),
  `weekly-ranking.service.test.ts` (5 testes).
- 115 arquivos / 700 testes passando, typecheck e lint limpos.
- Verificado ao vivo: progresso de missão subindo de 1/20 pra 2/20 depois
  de responder uma questão real na tela Questões; ranking mostrando a
  divisão Bronze com o próprio aluno.
