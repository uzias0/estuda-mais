# Fase "Recuperar Admin Sem Shell"

> Pedido do usuário: esqueceu a conta de ADMIN de produção e não tem
> acesso ao Shell do Render (o plano/perfil dele não oferece essa aba).

## O problema

`scripts/bootstrap-admin.ts` (`npm run db:seed-admin`) já resolvia
"criar ou redefinir a senha de um ADMIN por e-mail", mas só rodando via
terminal contra o banco — exatamente o que o usuário não tem em
produção.

## O que foi feito

A lógica de "criar ou atualizar um usuário ADMIN por e-mail" foi
extraída para `src/server/auth/bootstrap-admin.service.ts`
(`upsertAdminUser`) — usada por dois caminhos com contratos de
segurança **deliberadamente diferentes**:

1. **CLI** (`scripts/bootstrap-admin.ts`) — continua igual, só chama a
   função compartilhada agora. Tem fallback de e-mail/senha de
   desenvolvimento quando as variáveis de ambiente não são definidas.
2. **`src/instrumentation.ts`** (novo) — hook oficial do Next.js
   (`register()`, estável desde o Next 15, nenhuma flag experimental),
   roda automaticamente **toda vez que o servidor sobe**. Chama
   `bootstrapAdminIfConfigured()`, que só age quando
   `BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` estão
   **explicitamente** definidos no ambiente — nunca usa um valor
   padrão (diferente do CLI). Sem essas duas variáveis, é 100% no-op,
   em qualquer ambiente, sempre.

## Como usar (produção, sem Shell)

1. No dashboard do Render, abrir o serviço → aba **"Environment"**.
2. Adicionar `BOOTSTRAP_ADMIN_EMAIL` (um e-mail de verdade, que o
   usuário tenha acesso) e `BOOTSTRAP_ADMIN_PASSWORD` (senha nova).
3. Salvar — o Render reinicia o serviço automaticamente quando uma
   variável de ambiente muda.
4. No boot seguinte, o hook cria (ou redefine a senha de) esse ADMIN.
5. Fazer login normalmente com esse e-mail/senha.
6. **Importante**: remover as duas variáveis do Render depois de logar.
   Enquanto elas continuarem lá, TODO restart do servidor (nem que seja
   por um deploy de código não relacionado) reaplica essa senha —
   revertendo silenciosamente qualquer troca de senha feita depois pelo
   fluxo normal do app.

## Decisões

- Duas implementações da MESMA operação (`upsertAdminUser` central,
  chamada por dois wrappers com regras de fallback diferentes) —
  nunca duplica o hash de senha nem a lógica de upsert em si, só o
  contrato de "quando é seguro agir sem confirmação explícita".
- Nenhum novo endpoint HTTP, nenhuma nova Server Action pública —
  a única superfície nova é o próprio boot do processo, que já exige
  acesso ao painel de deploy (a mesma autoridade de quem pode alterar
  o Build/Start Command do serviço).

## Verificação

- 117 arquivos / 718 testes passando (4 novos:
  `bootstrap-admin.service.test.ts` — cria, atualiza sem duplicar,
  nunca age sem as variáveis, age quando definidas), typecheck e lint
  limpos.
- CLI (`npm run db:seed-admin`) retestado depois da extração: mesmo
  comportamento de antes.
- Verificado ao vivo, ponta a ponta: `.env` com
  `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` temporários →
  reiniciar o servidor → log confirmando `[bootstrap-admin-
  instrumentation] criado: ...` → login real com esse e-mail/senha →
  `/admin/manutencao` carregou normalmente. Conta de teste e variáveis
  temporárias removidas depois da verificação.
