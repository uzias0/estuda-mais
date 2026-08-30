import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuração do wrapper Android (fase de produção — APK de teste remoto).
 *
 * DECISÃO CRÍTICA: este app Next.js usa Server Actions e páginas dinâmicas
 * (SSR) em quase toda a árvore — um `next export` estático NÃO funcionaria
 * (autenticação, Study Engine, gamificação, tudo depende do servidor). Por
 * isso o Android NÃO empacota HTML local: ele é um wrapper fino que abre
 * `server.url` — a MESMA aplicação web real, servida por HTTPS público —
 * dentro de uma WebView nativa. `webDir: "public"` existe só porque o
 * Capacitor exige algum diretório de assets locais; seu conteúdo nunca é
 * usado enquanto `server.url` estiver definido.
 *
 * `CAPACITOR_SERVER_URL` é lida em tempo de BUILD (quando você roda
 * `npx cap sync android` / `npx cap add android`), não em tempo de execução
 * do app — o valor fica embutido no APK gerado. Por isso:
 *   - NUNCA aponte para `localhost`/`127.0.0.1`/`192.168.x.x` — um APK
 *     enviado para outra pessoa, em outra rede, não alcançaria esses
 *     endereços (ver `docs/PRODUCAO-E-DEPLOY.md`, seção Android).
 *   - Para gerar um APK de teste remoto real, exporte
 *     `CAPACITOR_SERVER_URL=https://SEU-STAGING-REAL.exemplo.com` antes de
 *     rodar `npx cap sync android`.
 *   - Sem a variável definida, cai no placeholder abaixo (propositalmente
 *     inválido) — o app abriria uma tela de erro de conexão em vez de
 *     silenciosamente tentar seu computador local.
 */
const stagingUrl = process.env.CAPACITOR_SERVER_URL ?? "https://staging-nao-configurado.invalid";

const config: CapacitorConfig = {
  appId: "com.estudamais.app",
  appName: "Estuda+",
  webDir: "public",
  server: {
    url: stagingUrl,
    cleartext: false, // nunca permite HTTP em texto puro — só HTTPS real
    // Mostrado pela WebView nativa SÓ quando `server.url` está totalmente
    // inalcançável (sem internet, backend fora do ar) — página 100%
    // estática (`public/mobile-offline.html`), nunca finge que uma
    // resposta foi enviada nem corrompe progresso (Objetivo 12). Distinto
    // do `/offline` do PWA web, que é uma rota Next.js real.
    errorPath: "mobile-offline.html",
  },
};

export default config;
