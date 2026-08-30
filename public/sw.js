/**
 * Service worker mínimo (fase mobile/PWA, seção 11) — escopo deliberadamente
 * pequeno e seguro:
 *
 *   1. Cache-first só para assets estáticos IMUTÁVEIS do build
 *      (`/_next/static/...`) e os ícones/manifest gerados por código
 *      (`/icon-*`, `/manifest.webmanifest`) — nenhum dado de usuário, nunca
 *      muda de conteúdo sob a mesma URL.
 *   2. Para NAVEGAÇÃO (o aluno abrindo uma página): sempre tenta a rede
 *      primeiro (nunca serve HTML autenticado/acadêmico do cache — seção
 *      11: "não colocar dados acadêmicos privados ou informações sensíveis
 *      em cache indiscriminado"); só cai para a página `/offline` estática
 *      quando a rede falha de verdade.
 *   3. Todo o resto (Server Actions, API, dados) passa direto pela rede,
 *      sem interceptação nenhuma — este service worker nunca decide nem
 *      participa de nenhuma regra de negócio.
 *
 * Não é um sistema offline completo (seção 11: "não transformar em sistema
 * offline complexo nesta etapa") — só o suficiente para o app ser instalável
 * e não mostrar o erro genérico do navegador quando a rede cai.
 */
const CACHE_NAME = "estuda-static-v1";
const STATIC_PREFIXES = ["/_next/static/", "/icon-", "/manifest.webmanifest"];
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isImmutableStaticAsset(url) {
  return STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // nunca intercepta Server Actions (POST)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // nunca intercepta terceiros

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((res) => res ?? Response.error())),
    );
    return;
  }

  if (isImmutableStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
