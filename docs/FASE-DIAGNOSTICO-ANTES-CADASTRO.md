# Fase "Diagnóstico Antes do Cadastro"

> Pedido do usuário: "antes de eu criar a conta, eu quero que eu faça
> primeiro a trilha, pra começar o diagnóstico. Então isso antes de tudo,
> aí depois fale 'olha, seu resultado foi esse tal tal tal', e aí depois
> fale 'crie sua conta e continue agora mesmo grátis'".

## Novo fluxo (raiz do site, `/`)

1. **Boas-vindas** — personagem (Mente) cumprimenta o visitante.
2. **Tutorial** — explica os 4 selos do topo (🔥 sequência, ⭐ XP, ❤️
   baterias, 💎 joias) — pedido explícito: "essas estrelas nem eu sei que
   que é essa estrela".
3. **Diagnóstico** — mesmo `DiagnosticRunner` de sempre, 100% funcional,
   SEM precisar de conta.
4. **Resultado** (`/comecar/resultado`) — nível, conceitos fortes/fracos,
   recomendação — real, calculado pelo servidor.
5. **CTA**: "Criar conta e continuar agora mesmo — grátis" → `/signup`.
   Ao cadastrar, o diagnóstico já feito é herdado automaticamente.

`/login` continua acessível (link discreto na tela de boas-vindas) para
quem já tem conta.

## Como funciona sem exigir uma conta antes

`StudySession`/`QuestionAttempt` (Módulo 3) exigem um `userId` real —
não dá pra responder uma questão "sem dono". Em vez de migrar o schema
pra aceitar usuário nulo, um usuário ANÔNIMO real é criado na hora (só
com um cookie próprio, `estuda_anon_id`, `src/server/auth/anonymous-
session.ts`):

- E-mail com padrão identificável e nunca real:
  `anon-<token>@anon.estuda.invalid` (domínio `.invalid`, RFC 2606 — mesmo
  espírito do `@example.invalid` já usado em fixtures de teste).
- Sem senha (`passwordHash: null`, campo já opcional, nenhuma migration).
- Reaproveita 100% dos serviços reais do Módulo 3 (`startDiagnostic`/
  `submitDiagnosticAnswer`/`finishDiagnostic`/`getDiagnosticResult`) —
  eles só recebem um `Actor` qualquer, nunca precisaram de sessão real.

Quando o visitante cria a conta de verdade (`signUp`), a `StudySession`
e as `QuestionAttempt` do diagnóstico anônimo são REATRIBUÍDAS pro novo
`userId` (`reassignAnonymousDiagnostic`, `auth.service.ts`) — nada é
recopiado porque o "resultado" nunca foi uma entidade persistida à
parte, sempre recalculado a partir desses dois. O usuário anônimo
temporário é apagado logo em seguida. Uma checagem de segurança impede
reatribuir dados de um usuário REAL por engano (só mexe se o e-mail
bater no padrão `@anon.estuda.invalid`).

Nenhuma gamificação (XP/joia/bateria) é processada para o diagnóstico
anônimo, de propósito — mantém a superfície de reatribuição mínima (só 2
tabelas) e evita prometer recompensa antes de existir conta.

## Decisões / limitações

- Sem infraestrutura de "guest session" antes desta fase — o cookie
  `estuda_anon_id` guarda o próprio `userId` (não um token opaco): não
  há nada sensível pra proteger num usuário sem senha e sem dado
  pessoal ainda, diferente da sessão de login real.
- Usuário anônimo abandonado (visitante nunca cria conta) expira o
  cookie em 7 dias e fica órfão no banco, inofensivo — mesma filosofia
  de "sem cron" já usada em bateria/meta diária/missões; uma limpeza
  administrativa futura poderia apagar `@anon.estuda.invalid` antigos,
  se necessário.
- `DiagnosticRunner.tsx` foi parametrizado (`actions`/`onFinished`) para
  o MESMO componente servir tanto o fluxo autenticado quanto o anônimo,
  sem duplicar a máquina de estados do diagnóstico.

## Verificação

- `anonymous-session.test.ts` (6 testes): cria/reaproveita usuário
  anônimo, cookie expirado/forjado tratado com segurança.
- `auth.service.test.ts` (+3 testes): reatribuição completa (StudySession/
  QuestionAttempt migram, usuário anônimo apagado), cadastro direto
  continua igual, id forjado (usuário real) nunca é mexido.
- `auth-actions.test.ts` (+1 teste): a wiring REAL da Server Action
  (`signUpAction` lendo o cookie, chamando `signUp`, limpando o cookie
  depois) — não só a função de serviço isolada.
- 116 arquivos / 710 testes passando, typecheck e lint limpos.
- Verificado ao vivo: fluxo completo boas-vindas → tutorial → diagnóstico
  real (pergunta real, resposta corrigida pelo servidor, sem login) →
  resultado real (nível DOMINIO, 2/2 corretas) → CTA de cadastro.
