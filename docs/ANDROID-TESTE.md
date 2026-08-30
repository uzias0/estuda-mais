# Guia de Teste no Celular — Android

> Complementa `docs/PRODUCAO-E-DEPLOY.md` (visão geral) e
> `docs/PLAY-STORE.md` (publicação). Este documento responde, na prática:
> "como eu pego este projeto e coloco no meu celular Android agora?"

## 0. O que você precisa (uma vez só)

1. **Android Studio** (inclui JDK 17+ embutido e o Android SDK Manager) —
   [developer.android.com/studio](https://developer.android.com/studio).
2. Durante a instalação, deixe o assistente instalar o **Android SDK**
   (padrão). Anote o caminho mostrado em
   `Android Studio > Settings > Languages & Frameworks > Android SDK`
   (Windows costuma ser `%LOCALAPPDATA%\Android\Sdk`).
3. Configure as variáveis de ambiente (uma vez):
   - `ANDROID_HOME` (ou `ANDROID_SDK_ROOT`) = caminho do passo 2.
   - Adicione ao `PATH`: `%ANDROID_HOME%\platform-tools` (dá acesso ao `adb`).
4. Confirme no terminal:
   ```bash
   java -version    # precisa mostrar 17 ou mais
   adb --version    # precisa reconhecer o comando
   ```

`npm run android:build` (`scripts/android-build.mjs`) verifica os itens 3-4
automaticamente antes de tentar compilar, e explica exatamente o que
corrigir se algo estiver faltando.

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

- Projeto Android gerado e configurado corretamente (ícones/splash reais,
  permissões mínimas, orientação retrato, `errorPath` de rede) —
  confirmado por leitura e pelos testes automatizados
  (`src/test/mobile-build-config.test.ts`).
- `npm run android:build` detecta corretamente Java/SDK ausentes/
  incompatíveis e explica a correção (testado de verdade neste sandbox:
  Java 8 + SDK ausente → mensagem exata reproduzida).
- Gradle real chegou a rodar e falhar exatamente no ponto esperado (Java
  8 incompatível) — nenhum APK foi gerado aqui, porque este ambiente não
  tem Android SDK/JDK 17+.
- **Não testado neste ambiente** (exige hardware/SDK reais, que só existem
  na sua máquina): compilação real do APK, instalação em dispositivo
  físico, comportamento visual da tela de erro de rede dentro da WebView
  nativa.
