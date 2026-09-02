# Fase "E-mail Case-Insensitive"

> Achado real durante a fase "recuperar admin sem Shell": o usuário
> criou uma conta ADMIN via `BOOTSTRAP_ADMIN_EMAIL`, mas o login
> continuava dizendo "E-mail ou senha inválidos" mesmo com a senha
> certa.

## A causa raiz

`signIn`/`signUp`/`requestPasswordReset` já usavam
`data.email.toLowerCase()` para a CHAVE do rate-limit, mas o
`prisma.user.findUnique({ where: { email: data.email } })` de verdade
usava o e-mail com a capitalização EXATA digitada — Postgres compara
strings de forma sensível a maiúsculas/minúsculas por padrão. Uma conta
criada com `Admin@Exemplo.com` nunca batia com um login digitado
`admin@exemplo.com` (o mais natural de se digitar).

## A correção

- **`auth.schema.ts`**: novo `emailSchema` compartilhado
  (`z.string().email().transform(v => v.toLowerCase())`), usado pelos
  três schemas de entrada (`SignUpInputSchema`/`SignInInputSchema`/
  `RequestPasswordResetInputSchema`) — normaliza na BORDA de entrada,
  então todo consumidor (inclusive futuros) recebe/compara sempre o
  mesmo valor canônico, sem precisar lembrar de normalizar em cada
  `findUnique` espalhado pelo código.
- **`bootstrap-admin.service.ts`** (`upsertAdminUser`): além de
  normalizar pra minúsculas, a BUSCA por um usuário já existente agora é
  case-insensitive (`mode: "insensitive"`) — encontra uma conta já
  criada com uma capitalização diferente ANTES desta correção existir
  (como a do próprio usuário), sem criar uma segunda conta duplicada.
  Isso significa que o boot seguinte do servidor (com
  `BOOTSTRAP_ADMIN_EMAIL`/`PASSWORD` ainda definidos) já AUTO-CORRIGE a
  conta existente — nenhuma ação extra necessária além do que o usuário
  já tinha feito.
- **`normalize-user-emails.service.ts`** (novo, + CLI
  `db:normalize-emails` + botão em `/admin/manutencao`, mesmo padrão de
  sempre): corrige QUALQUER outra conta já existente com e-mail
  gravado em maiúsculas — nunca mescla/apaga em caso de colisão real
  (duas contas que hoje só diferem pela capitalização), só pula e
  sinaliza.

## Por que isso também explica "acertei 15 questões clicando sempre na
primeira opção, que também era sempre a mais longa"

O usuário só conseguiu testar a correção da fase anterior
(`fix-answer-length-bias.ts`, rodada 2) no banco de DESENVOLVIMENTO —
nunca em produção, porque ficou bloqueado sem conseguir logar como
ADMIN (primeiro por esquecer a senha, depois por este mesmo bug de
capitalização). O banco de PRODUÇÃO nunca recebeu a correção do viés de
tamanho — não é um bug novo, é a mesma correção de sempre ainda
pendente de ser aplicada lá, agora que o login finalmente vai funcionar.

## Verificação

- 118 arquivos / 726 testes passando (8 novos: `signUp`/`signIn`
  case-insensitive, `requestPasswordReset` case-insensitive,
  `upsertAdminUser` case-insensitive sem duplicar,
  `normalizeAllUserEmails` corrige/idempotente/pula colisão),
  typecheck e lint limpos.
