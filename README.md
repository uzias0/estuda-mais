# Estuda+ — Plataforma de Aprendizagem + Enciclopédia Acadêmica de Psicologia

> Módulo 1 (Fundação Técnica) implementado. Nenhuma UI de produto, CRUD ou conteúdo real ainda — ver [`docs/MODULO-1.md`](docs/MODULO-1.md).

## Documentação

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — arquitetura conceitual (v2, os quatro núcleos)
- [`docs/RELATORIO_REVISAO_V3.md`](docs/RELATORIO_REVISAO_V3.md) — schema Prisma corrigido e validado (v3)
- [`docs/MODULO-1.md`](docs/MODULO-1.md) — o que foi implementado, como rodar, decisões técnicas

## Como rodar

```bash
cp .env.example .env
npm install
npm run db:start          # Postgres de desenvolvimento — deixe rodando num terminal dedicado
npm run db:migrate:deploy # em outro terminal
npm run db:generate
npm run test
npm run dev
```

Outros comandos úteis: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run db:status`, `npm run db:stop`.
