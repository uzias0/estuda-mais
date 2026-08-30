# Mobile-first + PWA

> Complementa `docs/ARQUITETURA.md` (aditivo) e `docs/FINALIZACAO-PROJETO.md`.
> Executada por uma única linha de execução, sem agentes paralelos.

## 1. Arquitetura mobile

A base visual (`src/app/globals.css`, Módulo 11) **já era mobile-first na
prática** antes desta fase — confirmado lendo o código antes de mexer, não
assumido:

- `.app-sidebar` é `display: none` por padrão, só aparece
  `@media (min-width: 1024px)` — o estilo sem prefixo já É o mobile, desktop
  é a exceção progressiva, não o contrário.
- `.btn`/`.option-row`/`.text-input` já usam `min-height: 44px` (alvo de
  toque confortável).
- `.bottom-nav` já existia, `position: fixed`, com
  `env(safe-area-inset-bottom, 0)`.
- Personagens/celebrações já respeitavam `prefers-reduced-motion`.

Por isso esta fase não reconstruiu o sistema visual — só fechou lacunas
reais encontradas (seção 3) e adicionou a camada que faltava por completo:
PWA (seção 4).

## 2. Navegação

`BottomNav`/`SidebarNav` (Módulo 11) reaproveitados sem alteração de
componente — só o CONTEÚDO de `BOTTOM_NAV_ITEMS`
(`src/components/nav-items.ts`) mudou: o 5º destino passou de "Conquistas"
para **"Perfil"** (Início / Estudar / Revisão / Simulados / Perfil — os 5
destinos centrais de um app mobile). Conquistas continua acessível na
sidebar completa e, agora, também por um atalho dentro do próprio Perfil —
nenhuma rota foi removida.

## 3. Componentes reutilizados

`CharacterAvatar`/`CharacterMessage`/`CharacterCelebration`,
`QuestionRenderer` (todos os 8 tipos), `GamificationSnapshot`, `ProgressBar`,
`LessonRunner`/`DiagnosticRunner`/`ReviewSessionRunner`, `Header`,
`getGamificationSummary`, `getStudyPlan`/`getNextStudyAction` — nenhum
recriado, nenhuma lógica duplicada. Único ajuste de toque: os botões
↑/↓ de reordenação em `ORDERING` (`QuestionRenderer.tsx`) foram de 32px para
44px de altura mínima (evidência real: abaixo do mínimo recomendado de
toque).

## 4. PWA

- `src/app/manifest.ts` — Web App Manifest nativo do Next.js, servido em
  `/manifest.webmanifest`. `display: "standalone"`,
  `orientation: "portrait-primary"`, `theme_color`/`background_color` iguais
  aos tokens de `globals.css`.
- `viewport` (novo export em `src/app/layout.tsx`): `width=device-width,
initial-scale=1, viewport-fit=cover` + `themeColor` por esquema de cor +
  `appleWebApp` (`capable`, `statusBarStyle: "default"`).

## 5. Manifest

Ver seção 4. Testado em `src/app/manifest.test.ts` (instalável, ícones
`any`/`maskable`, nenhuma URL externa, identidade própria — nunca menciona
Duolingo/terceiros).

## 6. Ícones

Gerados por código (`src/lib/app-icon.tsx`, `ImageResponse` do próprio
Next.js — **nenhuma dependência nova, nenhum asset binário externo**):
gradiente com os tokens de marca (`--color-brand`/`--color-brand-strong`) +
o mesmo emoji 🧠 já usado no `Header`. `app/icon.tsx` (favicon 32×32),
`app/apple-icon.tsx` (180×180), `app/icon-192`/`icon-512`/
`icon-512-maskable` (rotas dedicadas para o manifest). Confirmado servindo
imagens reais via navegador nesta sessão (`/icon-192` carregou como imagem
192×192 real).

## 7. Offline

Service worker mínimo (`public/sw.js`) — escopo deliberadamente pequeno:

1. Cache-first só para `/_next/static/*`, ícones e o manifest (assets
   imutáveis, nunca dado de usuário).
2. Navegação: sempre tenta a rede primeiro; só cai para `/offline`
   (`src/app/offline/page.tsx`, estática, sem sessão/banco) quando a rede
   falha de verdade.
3. Todo o resto (Server Actions, dados) passa direto — o service worker
   nunca participa de nenhuma regra de negócio nem cacheia conteúdo
   acadêmico/privado.

Registrado por `src/components/ServiceWorkerRegistration.tsx`, só em
produção (`NODE_ENV === "production"` — em dev atrapalharia o HMR).

**Não é** um sistema offline completo — de propósito (regra 11 do prompt).

## 8. Acessibilidade

Nenhuma animação foi removida; `src/app/globals-css.test.ts` (novo) varre
`globals.css` e falha se alguma classe com `animation` própria não estiver
coberta por um bloco `prefers-reduced-motion`. Rótulos/`aria-label`/foco já
existentes (etapa de consolidação) preservados; nenhum controle ficou
menor que 44px (seção 3).

## 9. Performance

Nenhuma mudança de Server/Client Component — os runners já eram Client
Component só onde precisavam de estado local (padrão do Módulo 11,
confirmado por leitura, não refeito). Ícones/manifest são gerados sob
demanda pelo próprio Next (`ImageResponse`), sem novo peso de bundle
JavaScript no cliente.

## 10. Limitações

- Verificação end-to-end por clique físico no navegador teve estabilidade
  parcial neste ambiente (o mesmo já registrado em `docs/FINALIZACAO-
PROJETO.md`) — login/dashboard/perfil foram confirmados via JavaScript
  injetado (preenchimento+submit programático) e `read_page`/`get_page_text`
  reais contra o servidor de desenvolvimento, incluindo a navegação inferior
  mostrando exatamente os 5 itens esperados; screenshot visual não pôde ser
  capturado (pane não compositava nesta sessão).
- `env(safe-area-inset-bottom)` não pôde ser confirmado com valor > 0 (exige
  hardware/emulador com notch real, indisponível aqui) — só a pré-condição
  (`viewport-fit=cover` no meta tag) foi confirmada presente, que é a causa
  raiz corrigida.
- Nenhum ícone/splash específico por plataforma além do gerado (sem
  screenshots para a seção "Rich Install UI" do Chrome, opcional).

## 11. Preparação para Android/iOS

PWA é a primeira versão instalável (seção 22 do prompt) — instalável via
navegador em Android (Chrome, "Adicionar à tela inicial") e iOS Safari
("Adicionar à Tela de Início", usa `apple-touch-icon`/`appleWebApp`). Nenhum
projeto React Native ou nativo foi criado nesta etapa (fora de escopo,
explicitamente adiado). O mesmo frontend Next.js poderá futuramente ser
embalado (Capacitor/Trusted Web Activity ou equivalente) sem mudança de
arquitetura — decisão e ferramenta específicas ficam para uma etapa
posterior, com autorização própria.
