# Preparação para a Google Play Store

> Nada foi publicado nesta sessão — este documento só prepara o terreno.
> Toda ação aqui é MANUAL, sua, quando decidir publicar de verdade.

## 1. O que já está pronto no código

| Item                        | Status                                     | Onde                                                                      |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| `applicationId`             | placeholder — **troque antes de publicar** | `capacitor.config.ts` + `android/app/build.gradle` (`com.estudamais.app`) |
| Nome do app                 | pronto                                     | `appName: "Estuda+"`                                                      |
| `versionCode`/`versionName` | pronto, incrementar a cada release         | `android/app/build.gradle`                                                |
| Ícone (todas as densidades) | pronto, gerado a partir da marca real      | `android/app/src/main/res/mipmap-*`                                       |
| Splash screen               | pronto (claro/escuro)                      | `android/app/src/main/res/drawable*/splash.png`                           |
| Permissões                  | mínimas (só `INTERNET`)                    | `android/app/src/main/AndroidManifest.xml`                                |
| Build tipo AAB              | comando pronto, falta assinatura           | `cd android && ./gradlew bundleRelease`                                   |

## 2. `applicationId` definitivo — AÇÃO MANUAL OBRIGATÓRIA

`com.estudamais.app` é um placeholder. Antes de qualquer upload à Play
Store, troque para o reverse-DNS do SEU domínio real em DOIS lugares:

- `capacitor.config.ts` (`appId`)
- `android/app/build.gradle` (`namespace` e `applicationId`)

**Não pode ser alterado depois da primeira publicação** — a Play Store
trata um `applicationId` diferente como um app totalmente novo.

## 3. Chave de assinatura (keystore) — NÃO gerada nesta sessão

Decisão deliberada: uma chave de assinatura de release é um artefato
permanente e sensível — perdê-la depois de publicar impede atualizar o app
para sempre. Gerar uma automaticamente num ambiente sandbox descartável
seria irresponsável. Quando você decidir publicar de verdade:

```bash
keytool -genkeypair -v -keystore estuda-release.keystore \
  -alias estuda -keyalg RSA -keysize 2048 -validity 10000
```

- Guarde `estuda-release.keystore` e a senha em um **cofre de senhas** ou
  gerenciador de segredos — nunca em texto puro, nunca no Git
  (`android/.gitignore` já bloqueia `*.jks`/`*.keystore`/
  `keystore.properties`).
- Crie `android/keystore.properties` (arquivo LOCAL, não versionado):
  ```properties
  storeFile=/caminho/absoluto/para/estuda-release.keystore
  storePassword=SUA_SENHA_AQUI
  keyAlias=estuda
  keyPassword=SUA_SENHA_AQUI
  ```
- Configure `signingConfigs`/`buildTypes.release` em
  `android/app/build.gradle` para ler esse arquivo (padrão documentado
  pelo próprio Android: [developer.android.com/studio/publish/app-signing](https://developer.android.com/studio/publish/app-signing)).
- A partir daí: `cd android && ./gradlew bundleRelease` gera o `.aab`
  assinado em `android/app/build/outputs/bundle/release/app-release.aab`.

## 4. Google Play Console — passo a passo (quando decidir)

1. Crie uma conta de desenvolvedor em [play.google.com/console](https://play.google.com/console)
   (taxa única cobrada pelo Google, não relacionada a este projeto).
2. "Criar app" → nome, idioma padrão, tipo (app), gratuito/pago.
3. Upload do `.aab` gerado (seção 3) em "Produção" (ou "Teste interno"
   primeiro — recomendado, ver seção 6).
4. Preencher os itens da seção 5 abaixo — **todos exigem informação sua**,
   nenhum foi inventado aqui.

## 5. Itens que dependem de você (AÇÃO MANUAL — não inventados)

- **Política de privacidade**: URL pública obrigatória pela Play Store.
  Precisa refletir o que o app REALMENTE coleta (e-mail, nome, progresso de
  estudo, respostas de questões) — escreva ou contrate a redação com base
  no comportamento real do sistema (`docs/ARQUITETURA.md` descreve os
  dados coletados).
- **Página/e-mail de suporte**: um canal real de contato seu.
- **Screenshots**: capture telas reais do app (dashboard, lição, trilha,
  perfil) no seu dispositivo/emulador — não geradas aqui.
- **Descrição curta/longa**: texto de marketing seu, sobre o produto real.
- **Classificação indicativa (content rating)**: preenchida através do
  questionário oficial da Play Store (perguntas sobre violência,
  conteúdo sexual, etc.) — as respostas dependem do conteúdo real do app,
  você deve preenchê-las.
- **Data Safety (segurança de dados)**: formulário oficial da Play Store
  declarando quais dados o app coleta/compartilha. Com base no que este
  projeto realmente faz: coleta e-mail e nome (cadastro), armazena
  progresso de estudo/XP/respostas — tudo em banco próprio, nunca
  compartilhado com terceiros, nenhum SDK de analytics/anúncio presente.
  Preencha o formulário com esses fatos reais, não invente nem omita.
- **Ícone de 512×512 para a store** (diferente do ícone do app): a Play
  Store exige um PNG 512×512 separado para a listagem — pode reaproveitar
  `assets/icon.png` (já é 512×512 real da marca).

## 6. Recomendação de processo

1. Suba primeiro para **Teste interno** (até 100 testadores, por e-mail,
   sem revisão do Google) — mesmo grupo que já testou o APK debug (seção
   `docs/ANDROID-TESTE.md`) pode continuar testando o `.aab` assinado ali.
2. Só depois de validado, promova para produção (fechada → aberta → total,
   conforme sua preferência de rollout gradual).

## 6.1 Processo de atualização (depois de já publicado)

```
alterar código → testar → build web → deploy do backend
```

- Se a mudança foi só web/conteúdo (a maioria): **nenhuma nova versão do
  app é necessária** — o wrapper Android carrega `server.url` ao vivo, o
  usuário já vê a mudança na próxima vez que abrir o app.
- Se a mudança envolveu o projeto nativo (`android/`, ícone, permissão,
  `capacitor.config.ts`): incremente `versionCode` (sempre) e `versionName`
  (semver — `1.0.1` correção, `1.1.0` funcionalidade nova, `2.0.0` mudança
  grande) em `android/app/build.gradle`, gere um novo `.aab`
  (`cd android && ./gradlew bundleRelease`) e suba como nova versão na Play
  Console — a Play Store nunca aceita reenviar o mesmo `versionCode`.

## 7. O que NÃO foi feito nesta sessão (por decisão, não esquecimento)

- Nenhuma chave de assinatura real foi gerada.
- Nenhum `applicationId` definitivo foi escolhido (permanece placeholder).
- Nenhuma política de privacidade/texto de marketing foi escrito (depende
  de decisões e informações que só você tem).
- Nenhum upload real foi feito à Play Store.
