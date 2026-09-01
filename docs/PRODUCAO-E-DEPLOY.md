# Produção, Deploy e APK Android

> Complementa todos os documentos anteriores. Cobre as duas fases pedidas
> em sequência nesta sessão: (1) build de produção testável no celular via
> rede local/PWA e (2) empacotamento Android via Capacitor + staging remoto
>
> - preparação para a Google Play Store. Nenhuma publicação real (deploy de
>   produção, submissão à Play Store) foi feita nesta sessão — só a
>   preparação, como pedido.

## 0. Ambientes

```
DEVELOPMENT   → sua máquina, `npm run dev`, Postgres embutido (`npm run db:start`)
STAGING       → ambiente real na internet (HTTPS), banco PRÓPRIO, separado de produção
PRODUCTION    → ambiente real na internet (HTTPS), banco de produção real
```

Nenhum dos três pode ser confundido: `DATABASE_URL` é sempre específica do
ambiente (variável de ambiente da plataforma de hospedagem, nunca
compartilhada). **Nunca** rode `prisma migrate reset`/`db:start` (Postgres
embutido de dev) contra staging/produção — essas variáveis não existem lá,
e o banco de produção/staging é sempre um Postgres gerenciado real.

## 1. Variáveis de ambiente

| Variável                                           | Obrigatória               | Descrição                                                                                                                                                |
| -------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                     | sim                       | Conexão Postgres do ambiente (dev/staging/produção)                                                                                                      |
| `APP_BASE_URL`                                     | sim em produção/staging   | Origem HTTPS pública real (ex.: `https://app.exemplo.com`) — usada só para montar o link de redefinição de senha; nunca lida de cabeçalhos da requisição |
| `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` | não (tem fallback de dev) | Usadas só por `npm run db:seed-admin`, uma vez, para criar o primeiro ADMIN de cada ambiente                                                             |
| `CAPACITOR_SERVER_URL`                             | sim, ao gerar o APK       | URL HTTPS pública do ambiente (staging ou produção) que o APK deve abrir — ver seção 6                                                                   |
| `GIT_COMMIT_SHA`                                   | não                       | Se definida, aparece no `/api/health` — a maioria das plataformas de deploy já injeta uma variável equivalente automaticamente                           |

**Nunca** commitar `.env` real — `.gitignore` já cobre `.env*` (exceto
`.env.example`). Nenhum segredo está hardcoded em `src/`
(`src/test/no-hardcoded-secrets.test.ts` varre isso a cada execução da
suíte).

## 2. Rodar localmente

```bash
npm install
npm run db:start        # sobe o Postgres embutido (mantém o terminal ocupado, é esperado)
npm run db:seed-admin    # só na primeira vez — cria o primeiro ADMIN
npm run dev
```

Abra `http://localhost:3000`.

## 3. Testar no celular pela rede local (caminho mais simples, sem gerar APK)

O app já é um PWA instalável. Para testar no celular SEM precisar de um APK
nem de staging na internet — só computador e celular na mesma Wi-Fi:

1. No computador, descubra o IP local:
   - Windows: `ipconfig` → procure "Endereço IPv4" do adaptador Wi-Fi/Ethernet
     ativo (formato `192.168.x.x` ou `10.x.x.x`).
2. Rode a build de produção acessível na rede (`next start` já escuta em
   todas as interfaces por padrão, incluindo a IP da sua rede local — não
   precisa de configuração extra):
   ```bash
   npm run build
   npm run start
   ```
3. Conecte o celular à MESMA rede Wi-Fi do computador.
4. No navegador do celular, abra `http://SEU-IP-LOCAL:3000` (o IP do passo 1).
5. Android (Chrome): menu ⋮ → "Adicionar à tela inicial" / "Instalar app".
   iPhone (Safari): botão compartilhar → "Adicionar à Tela de Início".
6. O app abre como aplicativo instalado (sem barra de endereço) — teste
   cadastro, login, dashboard, diagnóstico, trilha, lição, questões (os 8
   tipos), XP, personagens, revisão, simulado, perfil, logout.

Limitação real: isso só funciona enquanto computador e celular estiverem na
mesma rede — não serve para mandar para alguém em outro lugar (ver seção 6
para isso).

## 4. PWA — validação

Já implementado (`docs/MOBILE-PWA.md`) e reconfirmado nesta fase:
`src/app/manifest.ts` (nome, ícones 192/512/512-maskable, `display:
standalone`, `theme_color`/`background_color`), `viewport` com
`viewport-fit: cover` (safe areas), `public/sw.js` (cache-first só para
assets imutáveis, nunca dado de usuário; fallback `/offline`), registrado só
em produção (`ServiceWorkerRegistration.tsx`). Nenhuma alteração nesta fase
tocou esses arquivos.

**Atualização do PWA**: o service worker usa `CACHE_NAME =
"estuda-static-v1"` — ao publicar uma mudança visual/de assets estáticos
relevante, incremente esse valor em `public/sw.js` (ex.: `-v2`); o `activate`
já apaga caches antigos automaticamente. Páginas (HTML) NUNCA são
cacheadas — todo usuário sempre vê a versão publicada mais recente ao
navegar, sem precisar reinstalar nada.

## 5. Deploy web (produção)

Fluxo:

```
código → testes → build → migration (se houver) → deploy → verificar produção
```

Passo a passo (mesmo em qualquer host compatível com Node.js + Postgres —
Railway/Render/Fly.io são recomendados por rodarem SSR/Server Actions e
Postgres persistente com o mínimo de configuração; **Vercel** também roda
o Next.js perfeitamente, mas exige um Postgres gerenciado externo, já que
não hospeda banco de dados):

1. `npm ci --include=dev` (**`--include=dev` é obrigatório** — a maioria dos
   hosts define `NODE_ENV=production` já no build, o que faz `npm ci`
   pular devDependencies por padrão; `next build` typecheca o projeto
   inteiro, inclusive `*.test.ts`, que importam `vitest` — sem essa flag o
   build falha com `Cannot find module 'vitest'`, erro real já visto e
   corrigido nesta sessão)
2. `npx prisma migrate deploy` (nunca `migrate dev`/`reset` em produção)
3. `npm run build`
4. `npm run start` (ou o comando equivalente do host)
5. Verificar `GET /api/health` → `{ "status": "ok", "database": "ok" }`

Rode `npm run db:seed-admin` (com `BOOTSTRAP_ADMIN_EMAIL`/
`BOOTSTRAP_ADMIN_PASSWORD` reais) **uma única vez**, no ambiente de
produção, para criar o primeiro ADMIN. `npm run db:seed-academic` +
`db:seed-academic-v2` podem rodar em produção real (populam conteúdo
acadêmico real, não fixtures — idempotentes, seguros para rodar mais de
uma vez).

## 6. Android — APK de teste remoto (Capacitor)

### 6.1 Tecnologia escolhida

**Capacitor**, envolvendo a aplicação web REAL — nenhuma reescrita, nenhum
segundo app. Como o Next.js aqui usa Server Actions/SSR em quase toda rota
(não dá para gerar um `next export` estático funcional — autenticação,
Study Engine, gamificação dependem do servidor), o Android **não empacota
HTML local**: ele abre `server.url` (`capacitor.config.ts`) dentro de uma
WebView nativa, apontando para a aplicação real publicada.

### 6.2 Projeto Android criado nesta fase

- `capacitor.config.ts` — `appId: "com.estudamais.app"` (**PLACEHOLDER —
  troque para o domínio real antes de qualquer submissão à Play Store**,
  reverse-DNS do seu domínio de verdade, ex.: `com.suaempresa.estudamais`;
  não pode ser alterado depois de publicado), `appName: "Estuda+"`,
  `server.url` lido de `CAPACITOR_SERVER_URL` (nunca hardcoded
  `localhost`/`127.0.0.1`/IP de rede local — ver regra crítica abaixo).
- `android/` — projeto nativo gerado por `npx cap add android`.
  - Permissões: só `INTERNET` (nenhuma câmera/microfone/localização/
    contatos/armazenamento solicitada — nada na aplicação exige isso).
  - Orientação travada em retrato (`android:screenOrientation="portrait"`).
  - Ícone e splash reais gerados a partir do ícone de marca real do app
    (mesmo gradiente/emoji 🧠 de `src/lib/app-icon.tsx`, buscado do próprio
    servidor e processado com `@capacitor/assets`) — `assets/` na raiz do
    projeto guarda as imagens-fonte, para regenerar quando quiser.
  - `versionName "1.0.0-beta.1"` / `versionCode 1` (`android/app/build.gradle`,
    testado em `src/test/mobile-build-config.test.ts` para ficar em
    sincronia com `package.json`).
  - **Bug real encontrado e corrigido**: o template do Capacitor 8.5.0
    referencia `@color/colorPrimary`/`colorPrimaryDark`/`colorAccent` em
    `styles.xml` mas não cria o arquivo de cores — o build Gradle falharia
    por recurso inexistente. Criado `android/app/src/main/res/values/colors.xml`
    com as mesmas cores de marca do app web.
  - `android/.gitignore`: linhas de keystore (`*.jks`/`*.keystore`/
    `keystore.properties`) **descomentadas** — o template padrão vem com
    elas comentadas, o que arriscaria versionar uma chave de assinatura.
  - **`server.errorPath: "mobile-offline.html"`** (nova, fase de teste em
    celular real): página estática própria (`public/mobile-offline.html`)
    mostrada pela WebView nativa quando `server.url` está totalmente
    inalcançável (sem internet/backend fora do ar) — nunca finge que uma
    resposta foi enviada, nenhum dado é lido/gravado nessa tela.
  - **Links externos**: abertos automaticamente no navegador do sistema
    (não dentro do WebView do app) — mecanismo nativo do Capacitor
    (`Bridge.launchIntent`, confirmado no código-fonte do pacote
    instalado), nenhuma customização necessária.

Guia completo de teste em dispositivo físico (instalar JDK/SDK, conectar
por USB, `adb install`, roteiro de teste, envio remoto do APK):
**`docs/ANDROID-TESTE.md`**. Checklist de preparação para a Play Store
(keystore, AAB, Data Safety, política de privacidade): **`docs/PLAY-STORE.md`**.

### 6.3 REGRA CRÍTICA — o APK não pode depender do seu computador

`CAPACITOR_SERVER_URL` é lida em tempo de BUILD (quando você roda `npx cap
sync android`), não em tempo de execução — o valor fica embutido no APK.
Por isso, **antes de gerar um APK para mandar para outra pessoa**:

```bash
export CAPACITOR_SERVER_URL="https://SEU-STAGING-REAL.exemplo.com"
npm run cap:sync
```

Sem isso, o app usa o placeholder `https://staging-nao-configurado.invalid`
— inválido de propósito, para o app mostrar um erro de conexão claro em vez
de silenciosamente tentar `localhost`.

### 6.4 Ambiente de staging — o que falta para existir de verdade

**BLOQUEIO EXTERNO: é necessária uma conta de hospedagem e suas
credenciais.** Confirmado nesta sessão (e reconfirmado na fase seguinte):
nenhuma CLI de hospedagem está disponível neste ambiente
(`railway`/`vercel`/`flyctl`/`doctl`/`aws`/`heroku` — nenhum instalado,
nenhuma credencial fornecida). Não foi inventado nenhum deploy, nenhuma URL
de staging fictícia. Passos exatos para você criar (Railway como exemplo —
Render/Fly.io equivalentes):

1. Crie uma conta em [railway.app](https://railway.app) (ou equivalente).
2. Novo projeto → "Deploy from GitHub repo" (depois de você conectar este
   projeto a um repositório Git — ver seção 8) ou "Empty project" + deploy
   manual via CLI.
3. Adicione um serviço PostgreSQL gerenciado (botão "New" → "Database" →
   "PostgreSQL") — copie a `DATABASE_URL` gerada.
4. No serviço do app, configure as variáveis de ambiente: `DATABASE_URL`
   (a do passo 3), `APP_BASE_URL` (a URL pública que o Railway atribuir,
   ex.: `https://estuda-staging.up.railway.app`).
5. Deploy. Rode, uma vez, `npx prisma migrate deploy` e
   `npm run db:seed-admin` contra esse ambiente (via `railway run` ou
   painel de comando do provedor).
6. Rode `npm run db:seed-academic` e `db:seed-academic-v2` contra staging,
   se quiser o conteúdo acadêmico real disponível lá também (idempotente,
   seguro).
7. Use essa URL pública HTTPS como `CAPACITOR_SERVER_URL` (seção 6.3).

### 6.5 Gerar o APK

`npm run android:build` (`scripts/android-build.mjs`) — verifica Java/
`ANDROID_HOME` ANTES de chamar o Gradle e explica exatamente o que
corrigir, em vez de expor só o stack trace cru.

**Build real gerado com sucesso nesta sessão** (não só tentado — o `.apk`
existe de verdade), depois de instalar Android Studio + Android SDK + JDK
21 (Temurin) na máquina usada nesta sessão:

```
BUILD SUCCESSFUL in 37s
93 actionable tasks: 54 executed, 39 up-to-date
[android:build] APK gerado com sucesso: android/app/build/outputs/apk/debug/app-debug.apk
```

Confirmado: ~5,3 MB, `applicationId com.estudamais.app`,
`versionName 1.0.0-beta.1`, `server.url` apontando para o staging real
(`https://estuda-mais-lqwv.onrender.com`).

**JDK — atenção à versão exata** (descoberto rodando o build de verdade,
não por leitura estática): `@capacitor/android` 8.5.0 compila com
`--release 21`, então **JDK 17 falha** (`invalid source release: 21`); e o
Gradle 8.14.3 deste projeto **falha ao rodar sob JDK 25**
(`Unsupported class file major version 69`) — o JBR embutido em versões
recentes do Android Studio pode já vir nessa versão. **JDK 21 (LTS) é a
versão testada e recomendada** — instale à parte se necessário:

```bash
winget install --id EclipseAdoptium.Temurin.21.JDK -e   # Windows
```

e aponte `JAVA_HOME` para ela (não precisa desinstalar outras versões).
Guia completo de instalação em `docs/ANDROID-TESTE.md`, seção 0.

**2 bugs reais encontrados e corrigidos** rodando o Gradle de verdade
(nenhum dos dois seria detectado só lendo o código):

1. `scripts/android-build.mjs` resolvia `gradlew.bat` de forma relativa
   (`cwd` + `shell:true`), o que falhava no Windows — corrigido para usar
   o caminho absoluto do wrapper.
2. `android/app/src/main/res/values/colors.xml` tinha um comentário XML
   citando literalmente as custom properties CSS com seu prefixo usual —
   XML proíbe hifens duplicados em qualquer lugar de um comentário, não só
   fora do fechamento. Corrigido o texto do comentário.

Comando completo usado (sua máquina, com Android Studio + JDK 21 já
instalados):

```bash
export CAPACITOR_SERVER_URL="https://seu-staging-real.exemplo.com"
npm run cap:sync
npm run android:build
```

O `.apk` de debug (assinado automaticamente com uma chave de debug, só para
teste) aparece em:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Alternativa (recomendada se você quiser ver/depurar visualmente):

```bash
npm run android:open   # abre o projeto no Android Studio
```

e gere o APK pelo menu Build → Build Bundle(s)/APK(s) → Build APK(s).

### 6.6 Enviar o APK para teste remoto

`app-debug.apk` pode ser enviado por WhatsApp, Google Drive, Telegram ou
qualquer transferência de arquivo comum. Quem receber precisa:

1. Permitir "instalar de fontes desconhecidas" (Android pede isso
   automaticamente na primeira instalação de um APK fora da Play Store).
2. Ter internet (qualquer rede — não precisa ser a mesma Wi-Fi) para
   alcançar `CAPACITOR_SERVER_URL`.
3. Abrir o app e usar normalmente — cadastro, login, dashboard,
   diagnóstico, trilha, lição, questões, XP, personagem, celebração,
   revisão, simulado, perfil, logout, reabrir pelo ícone.

### 6.7 Atualizar o APK depois de uma mudança

```
alterar código → testar → atualizar staging → gerar novo APK → reenviar para teste → validar → produção
```

Diferente do PWA (que atualiza sozinho ao recarregar a página), um APK
instalado **não recebe atualização automática** — cada nova versão exige
reinstalar o novo `.apk` manualmente (normal nesta fase de teste; distribuição
automática de atualização só existe via Play Store/Firebase App
Distribution, fora do escopo desta etapa).

## 7. Preparação para a Google Play Store (sem publicar)

**Não publicado nesta fase** — só preparado:

- `applicationId`/`versionCode`/`versionName` já configurados
  (`android/app/build.gradle`) — troque `com.estudamais.app` para seu
  domínio real antes de qualquer submissão.
- Ícones/splash reais já gerados (seção 6.2).
- Para gerar o `.aab` (formato exigido pela Play Store) quando chegar a
  hora: `cd android && ./gradlew bundleRelease` — precisa de uma chave de
  assinatura de release (próximo item).
- **Chave de assinatura de release**: NÃO gerada nesta sessão (é um
  artefato permanente e sensível — perder essa chave depois de publicar
  impede atualizar o app na Play Store para sempre; gerar uma
  automaticamente num sandbox descartável seria irresponsável). Quando for
  a hora:
  ```bash
  keytool -genkeypair -v -keystore estuda-release.keystore \
    -alias estuda -keyalg RSA -keysize 2048 -validity 10000
  ```
  Guarde `estuda-release.keystore` e a senha em um cofre de senhas ou
  gerenciador de segredos — **nunca no Git** (`android/.gitignore` já
  bloqueia `*.keystore`/`*.jks`/`keystore.properties`). Referencie o
  keystore em `android/keystore.properties` (arquivo local, não versionado)
  e configure `signingConfigs` em `android/app/build.gradle` apontando para
  ele.
- Depois disso: Google Play Console → criar app → upload do `.aab` →
  teste interno → gradual/produção.

## 8. CI/CD

`.github/workflows/ci.yml` criado e pronto (`typecheck → lint →
format:check → test → build`, bloqueando em qualquer falha) — **inativo**
até este projeto virar um repositório Git de verdade e ser conectado ao
GitHub (`git init`, criar repositório remoto, `git push`). Nenhuma etapa de
deploy automático está no workflow — deploy continua manual/via o próprio
provedor de hospedagem (que normalmente builda a partir do push, à parte
deste CI de validação).

## 9. Backup e rollback

- **Backup**: responsabilidade do provedor de banco gerenciado
  (Railway/Render/RDS costumam oferecer snapshot automático) — configure a
  retenção no painel do provedor assim que o banco de produção existir.
  Nenhum mecanismo de backup foi implementado em código nesta fase (não
  inventar infraestrutura inexistente).
- **Rollback de código**: reverter para o commit/deploy anterior no
  provedor de hospedagem (a maioria mantém histórico de deploys com
  "restaurar" de um clique) — agora possível de verdade, já que o projeto
  tem um repositório Git real (seção 16): `git revert`/`git checkout` para
  qualquer commit anterior.
- **Rollback de migration**: Prisma não gera "down migrations" automáticas
  — se uma migration precisar ser desfeita, escreva uma migration NOVA que
  reverte a alteração (nunca edite uma migration já aplicada). Todas as 12
  migrations deste projeto são aditivas (nenhuma removeu coluna/tabela) —
  sem histórico de rollback destrutivo necessário até agora.
- **Rollback de PWA**: o service worker (`CACHE_NAME`) — reverter o código
  publicado já basta; o próximo `activate` limpa o cache antigo
  automaticamente.
- **Rollback do app Android**: a Play Console permite reverter para uma
  versão anterior já publicada (rollout); localmente, basta reinstalar um
  `.apk`/`.aab` de `versionCode` anterior que você tenha guardado.
- **Importância da chave de assinatura (keystore)**: é o único jeito de
  publicar uma ATUALIZAÇÃO de um app já na Play Store — perdê-la significa
  não conseguir mais atualizar esse app para sempre (só publicar um app
  novo, com `applicationId` diferente, perdendo todos os usuários/reviews).
  Guarde-a em pelo menos 2 lugares seguros e independentes (ex.: cofre de
  senhas + backup físico offline), nunca só no seu computador de
  desenvolvimento.
- **Importância das variáveis de ambiente**: `DATABASE_URL`/`APP_BASE_URL`/
  `CAPACITOR_SERVER_URL` de produção não estão em nenhum arquivo versionado
  — existem só no painel do provedor de hospedagem. Se você trocar de
  provedor ou perder acesso ao painel sem ter essas variáveis anotadas em
  um cofre de senhas, precisará reconfigurar tudo do zero (o código
  continua íntegro no Git; só a configuração de ambiente não é
  recuperável por si só).

## 10. Observabilidade

`GET /api/health` (sem autenticação, seção 6 acima) — `{status, database,
version, commit, environment}`. Suficiente para um monitor externo simples
(UptimeRobot, ou o próprio "health check" do provedor de hospedagem)
detectar app fora do ar ou banco inacessível. Nenhum analytics/rastreamento
foi adicionado (fora de escopo).

## 11. Segurança — auditoria desta fase

- Cabeçalhos de segurança adicionados (`next.config.ts`):
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` (nega câmera/microfone/geolocalização — nada no app
  usa isso). HSTS deliberadamente deixado para o proxy/host real (ver
  comentário no arquivo).
- Rate limiting (login/cadastro/recuperação de senha): já existia,
  confirmado.
- Recuperação de senha real: implementada na fase de fechamento anterior
  desta sessão.
- Verificação de e-mail: continua dependente de provedor externo, não
  implementada (mesma decisão documentada em `FASE-FECHAMENTO-PROJETO.md`).
- CSRF: Server Actions do Next.js já validam a origem da requisição
  automaticamente (proteção nativa do framework) — nenhuma configuração
  adicional necessária/foi adicionada.
- `src/test/no-hardcoded-secrets.test.ts` (novo): varre `src/` por padrões
  óbvios de chave/segredo — 0 encontrados.

## 12. Testes desta fase

`src/app/api/health/route.test.ts` (1) + `src/test/no-hardcoded-secrets.test.ts`
(2) + `src/test/mobile-build-config.test.ts` (7, fase de build do APK: sem
localhost/IP privado no `server.url` padrão, `cleartext=false`,
`errorPath` configurado, `versionName` do Android em sincronia com
`package.json`, `mobile-offline.html` estática e sem referência externa) =
**10 novos** nas duas fases de produção/APK. Total: **615** (605 ao final
da fase de fechamento + 10). Suíte completa executada, 615/615 passando.
`npx prisma validate`/`generate`, `typecheck`, `lint`, `format:check`,
`build` — todos limpos (ver relatório final da conversa para a execução
real).

## 13. Limitações honestas desta fase

- **Nenhum ambiente de staging/produção real existe** — só documentado e
  configurável; exige uma conta real em um provedor de hospedagem, que
  este ambiente não pode criar por você.
- **Nenhum `.apk` real foi gerado** — o ambiente sandbox não tem Android
  SDK/JDK 17 (só Java 8); a falha real do Gradle foi documentada (seção
  6.5) em vez de fingida. O projeto Android está pronto para build na sua
  máquina.
- **Nenhuma chave de assinatura de release foi criada** — decisão
  deliberada (seção 7), não limitação técnica.
- **Este projeto ainda não é um repositório Git** — `.github/workflows/ci.yml`
  fica inerte até isso ser feito manualmente (fora do escopo de uma ação
  que eu deva tomar sem pedido explícito de commit/push).

## 14. Como eu testo o aplicativo hoje (passo a passo prático)

Resposta direta à pergunta mais comum — **"ela precisa estar no mesmo
Wi-Fi?" → NÃO.** O APK conversa com a internet, não com o seu computador;
o que precisa estar na internet é o backend de staging/produção (seção
6.4), não o celular de quem testa.

1. **Configurar staging** (seção 6.4) — crie a conta de hospedagem, o
   banco, defina `DATABASE_URL`/`APP_BASE_URL`; **bloqueio externo
   enquanto isso não existir**.
2. **Configurar a URL** — anote a URL HTTPS pública que o provedor
   atribuir (ex.: `https://estuda-staging.up.railway.app`).
3. **Instalar Android Studio** (`docs/ANDROID-TESTE.md`, seção 0) — inclui
   JDK 17+ e o SDK Manager.
4. **Configurar o JDK** — confirme `java -version` ≥ 17 no terminal.
5. **Configurar o SDK** — defina `ANDROID_HOME`/`ANDROID_SDK_ROOT` e
   adicione `platform-tools` ao `PATH` (confirme com `adb --version`).
6. **Gerar o APK**:
   ```bash
   export CAPACITOR_SERVER_URL="https://SUA-URL-DE-STAGING"
   npm run cap:sync
   npm run android:build
   ```
7. **Instalar no seu celular** — cabo USB + depuração ativada (seção 2 de
   `docs/ANDROID-TESTE.md`) → `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
8. **Testar** — roteiro completo na seção 4 de `docs/ANDROID-TESTE.md`
   (cadastro → login → dashboard → diagnóstico → trilha → lição → questão →
   XP → revisão → simulado → perfil → logout).
9. **Enviar o APK para outra pessoa** — WhatsApp/Drive/Telegram (seção 5 de
   `docs/ANDROID-TESTE.md`); ela só precisa de Android + internet, nunca da
   sua rede, nunca de Node.js/Android Studio/banco de dados.
10. **Receber o feedback dela** — anote os problemas relatados.
11. **Corrigir** — altere o código, rode `npm run test`/`npm run build` de
    novo antes de qualquer coisa.
12. **Gerar nova versão** — incremente `versionCode`/`versionName`
    (`android/app/build.gradle`) e repita os passos 6-9.

## 15. Guia definitivo: do zero até produção (A→P)

Cada letra usa comandos REAIS deste projeto (não genéricos). Repositório
Git já inicializado nesta fase (branch `main`, commit inicial com todo o
código — ver seção 16).

**A. Preparar o computador**

```bash
node --version   # 22+
git --version
```

Instale Android Studio se ainda não tiver (`docs/ANDROID-TESTE.md`, seção 0).

**B. Configurar Git** (já feito nesta sessão — para uma máquina nova/clone):

```bash
git clone <URL-DO-SEU-REPOSITORIO-REMOTO>   # depois de você criar um remoto (GitHub/GitLab)
cd estuda-mais
npm install
```

**C. Criar o banco** (staging/produção — nunca reutilize o de dev):

- Provisionar um Postgres gerenciado real no seu provedor escolhido
  (seção 6.4) — copie a `DATABASE_URL` gerada.

**D. Configurar o ambiente**

```bash
cp .env.example .env
# edite .env: DATABASE_URL (do passo C), APP_BASE_URL (a URL HTTPS pública)
```

**E. Configurar staging** — ver seção 6.4 (**BLOQUEIO EXTERNO** enquanto
não houver conta de hospedagem).

**F. Deploy**

```bash
npm ci --include=dev
npx prisma migrate deploy
npm run build
npm run start
```

**G. Criar o administrador** (uma vez, por ambiente):

```bash
BOOTSTRAP_ADMIN_EMAIL=seu-email-real@dominio.com \
BOOTSTRAP_ADMIN_PASSWORD=umaSenhaForteReal123! \
npm run db:seed-admin
```

**H. Testar a web**: abra `APP_BASE_URL` no navegador → cadastro → login →
dashboard → `GET /api/health` deve responder `{"status":"ok"}`. Rode
`npm run db:seed-academic && npm run db:seed-academic-v2` se quiser o
conteúdo acadêmico real também nesse ambiente (idempotente).

**I. Configurar o Android** — ver `docs/ANDROID-TESTE.md`, seção 0 (JDK
17+, Android SDK, `ANDROID_HOME`).

**J. Gerar o APK**

```bash
export CAPACITOR_SERVER_URL="https://SUA-URL-DE-STAGING-OU-PRODUCAO"
npm run cap:sync
npm run android:build
```

**K. Testar no celular** — `docs/ANDROID-TESTE.md`, seções 2-4 (`adb
devices`, `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`,
roteiro completo).

**L. Testar o APK remotamente (outra pessoa)** — `docs/ANDROID-TESTE.md`,
seção 5 (envie o `.apk` por qualquer meio; ela só precisa de internet).

**M. Gerar o release** (assinado — depois de criar sua keystore, ver
`docs/PLAY-STORE.md` seção 3):

```bash
cd android && ./gradlew assembleRelease
```

**N. Gerar o AAB** (formato exigido pela Play Store):

```bash
cd android && ./gradlew bundleRelease
# saída: android/app/build/outputs/bundle/release/app-release.aab
```

**O. Publicar na Play Store** — `docs/PLAY-STORE.md`, seções 4-6 (Google
Play Console, upload do `.aab`, preencher os itens que dependem de você).

**P. Atualizar depois de publicado**:

```
alterar código → npm run test → npm run build → deploy do backend
→ (se a mudança for só web/conteúdo: PRONTO, nenhum novo APK necessário)
→ (se a mudança envolver o wrapper nativo: incrementar versionCode/versionName
   → repetir J-N → enviar atualização pela Play Console)
```

## 16. Git

Repositório inicializado nesta fase: `git init`, branch `main` (identidade
local configurada só neste repositório, não globalmente), **1 commit
inicial** com todo o código atual (553 arquivos, conferido antes do commit
que nenhum `.env`/keystore/`node_modules`/build gerado foi incluído — só
`.env.example`, como esperado). **Nenhum remoto configurado, nenhum push
feito** — isso é uma ação sua (`git remote add origin <URL> && git push -u
origin main`), quando você decidir onde hospedar o código (GitHub/GitLab/
etc.). `.github/workflows/ci.yml` só passa a rodar de verdade depois desse
push para o GitHub.

## 17. Como colocar o aplicativo no ar (checklist rápido)

Resumo de referência rápida — cada item aponta para a seção com o passo a
passo completo e os comandos reais.

1. **GitHub**: `git remote add origin <URL-DO-SEU-REPOSITORIO> && git push -u origin main` (seção 16).
2. **Hospedagem**: crie a conta (Railway/Render/Fly.io — seção 6.4). 🔴 bloqueio externo até você ter uma conta.
3. **Banco**: adicione um serviço PostgreSQL gerenciado no mesmo provedor (seção 6.4).
4. **Variáveis de ambiente**: `DATABASE_URL`, `APP_BASE_URL` no painel do provedor (seção 1).
5. **Migrations**: `npx prisma migrate deploy` (seção 5/15-F).
6. **Deploy**: `npm ci --include=dev && npm run build && npm run start` (ou o botão de deploy do provedor) (seção 5/15-F).
7. **Health check**: abra `<APP_BASE_URL>/api/health` → espere `{"status":"ok","database":"ok"}` (seção 10).
8. **Teste web**: cadastro → login → dashboard pelo navegador, na URL pública.
9. **Capacitor**: `export CAPACITOR_SERVER_URL="https://SUA-URL"` (nunca localhost/IP privado) (seção 6.3).
10. **APK**: `npm run cap:sync && npm run android:build` (seção 6.5). ⚠️ exige JDK 17+/Android SDK na sua máquina.
11. **Teste no celular**: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` (`docs/ANDROID-TESTE.md`). ⚠️ exige celular conectado.
12. **Envio para outra pessoa**: mande o `.apk` por WhatsApp/Drive/Telegram (seção 14/`docs/ANDROID-TESTE.md` seção 5) — ela só precisa de internet, nunca da sua Wi-Fi.
13. **Correções**: altere o código → `npm run test && npm run build` → repita a partir do passo 6 (ou 9, se só mudou conteúdo web).
14. **Release**: `cd android && ./gradlew assembleRelease` (exige keystore — `docs/PLAY-STORE.md` seção 3). 🔴 bloqueio até você gerar sua chave.
15. **AAB**: `cd android && ./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab`.
16. **Play Store**: upload do `.aab` no Google Play Console (`docs/PLAY-STORE.md` seções 4-6). 🔴 exige conta de desenvolvedor + informações suas (política de privacidade, screenshots).
