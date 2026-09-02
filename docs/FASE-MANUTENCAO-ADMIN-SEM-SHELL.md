# Fase "Manutenção sem Shell"

> Pedido do usuário: ele testa a versão publicada no Render, não sabe/não
> tem acesso ao Shell do serviço — precisava de um jeito de rodar a
> correção do viés de tamanho de alternativa contra o banco de PRODUÇÃO
> sem terminal.

## O que foi feito

A lógica de `scripts/fix-answer-length-bias.ts` (lista de reescritas +
aplicação via `updateQuestion`) foi extraída para um módulo compartilhado,
**`src/modules/assessment/server/services/answer-length-bias-fix.service.ts`**
— nenhuma lógica duplicada entre dois caminhos:

1. **CLI** (`npm run db:fix-answer-length-bias`) — continua existindo,
   agora um wrapper fino sobre o módulo compartilhado. Pra quem tem
   acesso a terminal/Shell.
2. **Painel administrativo** (`/admin/manutencao`) — página nova, mesmo
   gate de toda `/admin` (`requireAdminSessionActor`, Módulo 12: sem
   sessão ADMIN válida, nem carrega). Um botão ("Rodar correção agora")
   chama a Server Action `runAnswerLengthBiasFixAction`
   (`admin-maintenance-actions.ts`), que chama a MESMA função do CLI,
   autenticado como o ADMIN logado no navegador — nenhum terminal
   necessário, só entrar no painel e clicar.

Idempotente (mesma garantia de sempre): questões já corrigidas aparecem
como "já atualizada", nunca duplica nada — seguro clicar mais de uma
vez, inclusive por engano.

## Como usar (produção)

1. Fazer login em `https://estuda-mais-lqwv.onrender.com/login` com uma
   conta `ADMIN`.
2. Ir para `https://estuda-mais-lqwv.onrender.com/admin/manutencao`.
3. Clicar em "Rodar correção agora".

## Verificação

- 116 arquivos / 713 testes passando, typecheck e lint limpos.
- CLI testado depois da extração: mesmo resultado de antes (idempotência
  confirmada — 0 corrigidas, tudo "já está atualizada").
- Verificado ao vivo, ponta a ponta, com uma conta ADMIN real
  (`admin@estuda.local`, ambiente de desenvolvimento): login → `/admin/
  manutencao` → clique → resultado real exibido na tela (0 corrigidas,
  banco de desenvolvimento já estava com a correção da rodada 2
  aplicada).
