"use client";

/**
 * Registro do service worker (fase mobile/PWA, seção 11) — Client Component
 * mínimo, sem UI própria (retorna `null`); só efeito colateral de registrar
 * `public/sw.js` uma vez, no cliente. `NODE_ENV === "development"` fica de
 * fora de propósito: o service worker cacheando `/_next/static/...` durante
 * `next dev` atrapalha o HMR (arquivos mudam a cada instante) — o mesmo
 * cuidado que `session.ts` já tem com `secure` do cookie só em produção.
 */
import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falha de registro não deve quebrar a experiência normal (online) do
      // app — só significa que o app não fica instalável/offline-ready.
    });
  }, []);

  return null;
}
