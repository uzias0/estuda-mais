import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança mínimos de produção (fase de fechamento/produção,
 * seção 13/18: "headers de segurança"). Aplicados a TODAS as rotas — não há
 * conteúdo estático de terceiros embutido em iframe nem inline script de
 * fontes externas que exigisse uma CSP mais permissiva; a política abaixo é
 * deliberadamente restritiva por padrão.
 *
 * Não inclui HSTS explícito aqui: em produção real, o proxy/host (Vercel,
 * Railway, Render, nginx) tipicamente já injeta `Strict-Transport-Security`
 * quando HTTPS está configurado — duplicar aqui sem HTTPS real configurado
 * neste ambiente arriscaria um cabeçalho inconsistente com a realidade do
 * deploy. Documentado em `docs/PRODUCAO-E-DEPLOY.md`.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
