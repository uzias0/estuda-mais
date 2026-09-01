/**
 * Fallback offline (fase mobile/PWA, seção 11) — servida pelo service
 * worker (`public/sw.js`) quando uma navegação falha por falta de rede.
 * Deliberadamente ESTÁTICA: nenhuma sessão, nenhum serviço de domínio,
 * nenhuma chamada ao banco — precisa renderizar mesmo sem rede nenhuma
 * (é o próprio conceito de fallback offline). `force-static` deixa isso
 * explícito e permite que o Next pré-renderize a página no build, para o
 * service worker poder cacheá-la de verdade no `install`.
 */
export const dynamic = "force-static";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="page-container" style={{ textAlign: "center", paddingTop: "20vh" }}>
      <div className="card stack" style={{ maxWidth: 420, margin: "0 auto" }}>
        <WifiOff
          size={44}
          color="var(--color-text-muted)"
          strokeWidth={1.75}
          aria-hidden="true"
          style={{ alignSelf: "center" }}
        />
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Sem conexão no momento</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Verifique sua internet e tente novamente. Seu progresso é sempre calculado e salvo pelo
          servidor — nada é perdido.
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- deliberado:
            "tentar de novo" precisa forçar uma navegação de verdade pela rede
            (o service worker intercepta e tenta a rede antes de cair aqui de
            novo); `<Link>` faria navegação client-side, que não teria como
            reexercitar a rede da mesma forma. */}
        <a href="/" className="btn btn-primary btn-block">
          Tentar de novo
        </a>
      </div>
    </div>
  );
}
