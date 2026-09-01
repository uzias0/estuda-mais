# Guia de Teste no Celular — Android

> Complementa `docs/PRODUCAO-E-DEPLOY.md` (visão geral) e
> `docs/PLAY-STORE.md` (publicação). Este documento responde, na prática:
> "como eu pego este projeto e coloco no meu celular Android agora?"

## 0. O que você precisa (uma vez só)

1. **Android Studio** (inclui o Android SDK Manager) —
   [developer.android.com/studio](https://developer.android.com/studio).
2. Durante a instalação, deixe o assistente instalar o **Android SDK**
   (padrão). Anote o caminho mostrado em
   `Android Studio > Settings > Languages & Frameworks > Android SDK`
   (Windows costuma ser `%LOCALAPPDATA%\Android\Sdk`).
3. **JDK 21 (LTS) — instale à parte, não confie só no JDK embutido do
   Android Studio.** Testado de verdade nesta sessão: o JBR (JetBrains
   Runtime) que vem junto do Android Studio pode ser mais novo que o
   Gradle deste projeto suporta (ex.: JDK 25 faz o Gradle 8.14.3 falhar
   com `Unsupported class file major version 69` — o próprio Gradle não
   inicia). E JDK 17 é novo demais para baixo: `@capacitor/android` 8.5.0
   compila com `--release 21`, então JDK 17 falha com
   `invalid source release: 21`. **JDK 21 é a versão exata que funcionou
   e é a recomendada.** Instale:
   ```bash
   winget install --id EclipseAdoptium.Temurin.21.JDK -e   # Windows
   ```
   (macOS: `brew install --cask temurin21`; Linux: gerenciador de pacotes
   da distro ou [adoptium.net](https://adoptium.net)).
4. Configure as variáveis de ambiente (uma vez):
   - `JAVA_HOME` = pasta de instalação do JDK 21 (ex.:
     `C:\Program Files\Eclipse Adoptium\jdk-21.x.x-hotspot`).
   - `ANDROID_HOME` (ou `ANDROID_SDK_ROOT`) = caminho do passo 2.
   - Adicione ao `PATH`: `%JAVA_HOME%\bin` e `%ANDROID_HOME%\platform-tools`
     (o segundo dá acesso ao `adb`).
5. Confirme no terminal:
   ```bash
   java -version    # precisa mostrar 21
   adb --version    # precisa reconhecer o comando
   ```

`npm run android:build` (`scripts/android-build.mjs`) verifica os itens
3-4 automaticamente antes de tentar compilar (versão exata do Java e
`ANDROID_HOME`/`ANDROID_SDK_ROOT`), e explica exatamente o que corrigir se
algo estiver faltando — testado de verdade nesta sessão, incluindo os dois
casos reais acima (JDK 17 e JDK 25).

## 1. Gerar o APK

```bash
# Aponte para um backend HTTPS real (staging ou produção) — NUNCA localhost.
export CAPACITOR_SERVER_URL="https://seu-staging-ou-producao-real.exemplo.com"
npm run cap:sync
npm run android:build
```

Se tudo estiver correto, o APK aparece em:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 2. Conectar seu celular físico

1. No celular: **Ajustes → Sobre o telefone** → toque 7x em "Número da
   versão/Build" até aparecer "Modo desenvolvedor ativado".
2. **Ajustes → Sistema → Opções do desenvolvedor** → ative
   **Depuração USB**.
3. Conecte o celular ao computador por cabo USB.
4. No celular, autorize a mensagem "Permitir depuração USB deste
   computador?" (aparece na primeira conexão).
5. No computador:
   ```bash
   adb devices
   ```
   Deve listar o aparelho (`device` ao lado do serial — se aparecer
   `unauthorized`, confirme a autorização na tela do celular e rode de novo).

## 3. Instalar o APK direto pelo cabo (mais rápido para você testar)

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

`-r` reinstala por cima se já existir (útil ao testar várias versões
seguidas). Abra o app pelo ícone "Estuda+" na gaveta de aplicativos.

## 4. Roteiro de teste (jornada completa)

1. Cadastro (nome, e-mail, senha).
2. Login.
3. Dashboard — "continuar estudando" aparece.
4. Diagnóstico inicial completo.
5. Abrir uma trilha (ex.: Psicanálise).
6. Abrir e concluir uma lição — responder a questão real.
7. Conferir XP recebido e o personagem reagindo.
8. Revisão (se houver itens elegíveis).
9. Simulado.
10. Conquistas/streak.
11. Perfil (nome real, versão do app no rodapé).
12. Logout → login de novo (confirma que a sessão persiste corretamente
    entre reaberturas do app).
13. **Só com conta ADMIN**: abra `/admin` pelo mesmo app — confirme que uma
    conta STUDENT NÃO consegue chegar lá (deve redirecionar para o
    dashboard).
14. **Sem internet**: ative o modo avião, feche e reabra o app — deve
    aparecer a tela "Sem conexão com o Estuda+" (`public/mobile-offline.html`,
    self-contida, nunca finge enviar uma resposta). Desative o modo avião,
    toque "Tentar de novo" — o app volta ao normal.

## 5. Distribuir o APK para outra pessoa testar (sem estar na sua Wi-Fi)

O `app-debug.apk` gerado na seção 1 já não depende da sua rede — ele aponta
para `CAPACITOR_SERVER_URL` (um endereço HTTPS público). Para enviar:

1. Mande o arquivo `.apk` por WhatsApp, Telegram, Google Drive, e-mail, ou
   qualquer meio de transferência de arquivo comum.
2. A pessoa que recebe:
   - Toca no arquivo → Android pede para **permitir instalação de fontes
     desconhecidas** (normal para um APK fora da Play Store) → permite.
   - Instala e abre o app.
   - Só precisa de **internet** (qualquer rede) — não precisa estar na
     mesma Wi-Fi que você.
3. Ela pode seguir o mesmo roteiro da seção 4 (exceto o item 13, que exige
   uma conta ADMIN real).

**Links externos**: se alguma tela do app linkar para um site fora do
próprio domínio do Estuda+, o Capacitor abre automaticamente no navegador
do celular, não dentro do app (`Bridge.launchIntent`, mecanismo nativo do
Capacitor, confirmado no código-fonte do pacote instalado — nenhuma
customização foi necessária).

## 6. Atualizar depois de uma mudança

Um APK instalado **não se atualiza sozinho** (diferente do PWA/web). Para
testar uma nova versão:

```bash
# depois de alterar o código e rodar testes/build normalmente:
export CAPACITOR_SERVER_URL="https://seu-staging-ou-producao-real.exemplo.com"
npm run cap:sync
npm run android:build
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Incremente `versionCode`/`versionName` em `android/app/build.gradle` a cada
versão realmente nova enviada para teste (facilita saber qual build cada
testador tem instalado — pergunte a versão exibida no Perfil).

## 7. O que este ambiente conseguiu validar de verdade nesta sessão

Atualizado após a instalação real de Android Studio + JDK 21 na máquina
usada nesta sessão — **o APK foi de fato compilado**:

- Projeto Android gerado e configurado corretamente (ícones/splash reais,
  permissões mínimas, orientação retrato, `errorPath` de rede) —
  confirmado por leitura e pelos testes automatizados
  (`src/test/mobile-build-config.test.ts`).
- `npm run android:build` detecta corretamente Java ausente/incompatível
  (velho ou novo demais) e `ANDROID_HOME` ausente, explicando a correção —
  testado nos três casos reais: Java 8 (ausente), JDK 17 (novo demais para
  o Gradle mas velho demais para o `--release 21` do Capacitor) e JDK 25
  (novo demais para o Gradle 8.14.3).
- **`BUILD SUCCESSFUL`** com JDK 21 (Temurin) + Android SDK reais — APK de
  debug gerado em `android/app/build/outputs/apk/debug/app-debug.apk`
  (~5,3 MB), `server.url` confirmado apontando para o staging real
  (`https://estuda-mais-lqwv.onrender.com`), `applicationId
com.estudamais.app`, `versionName 1.0.0-beta.1`.
- **2 bugs reais encontrados e corrigidos durante esse build** (não
  achados por leitura estática, só apareceram rodando o Gradle de
  verdade):
  1. `scripts/android-build.mjs` resolvia `gradlew.bat` de forma relativa
     (via `cwd` + `shell:true`), o que falhava no Windows
     (`'gradlew.bat' não é reconhecido`) — corrigido para usar o caminho
     absoluto do wrapper.
  2. `android/app/src/main/res/values/colors.xml` (criado na fase
     anterior) tinha um comentário XML citando literalmente `--color-brand`
     — XML proíbe `--` em qualquer lugar de um comentário, não só fora do
     fechamento `-->`. O parser de recursos do Android (`mergeDebugResources`)
     rejeitou o arquivo. Corrigido reescrevendo o comentário sem o prefixo
     literal das custom properties CSS.
- **Não testado neste ambiente** (exige hardware físico, que só existe na
  sua mão): instalação em dispositivo físico via `adb install`,
  comportamento visual real da tela de erro de rede dentro da WebView
  nativa, teste do fluxo completo de estudo dentro do app instalado.
