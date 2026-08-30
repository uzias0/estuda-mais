# Módulo 1 — Fundação Técnica

> Escopo: scaffold, schema, migrations, infraestrutura. **Nenhuma UI de produto, nenhum CRUD, nenhum conteúdo real.** Ver `docs/ARQUITETURA.md` (v2, direção conceitual) e `docs/RELATORIO_REVISAO_V3.md` (v3, schema corrigido) para o que motivou cada decisão abaixo.

## Stack e versões efetivamente instaladas

| Peça                           | Versão                                   | Observação                                                      |
| ------------------------------ | ---------------------------------------- | --------------------------------------------------------------- |
| Node.js                        | v24.18.0                                 | ambiente do scaffold                                            |
| Next.js                        | 16.3.1                                   | App Router, Turbopack                                           |
| React                          | 19.2.8                                   |                                                                 |
| TypeScript                     | ^5 (strict)                              | `strict: true` já vem do template                               |
| Prisma CLI / `@prisma/client`  | **7.9.1**                                | major nova — ver seção "Prisma 7" abaixo                        |
| `@prisma/adapter-pg`           | 7.9.1                                    | driver adapter obrigatório na v7                                |
| `pg` (node-postgres)           | 8.23.0                                   |                                                                 |
| Zod                            | ^4                                       |                                                                 |
| Vitest                         | ^4                                       |                                                                 |
| ESLint / Prettier              | `eslint-config-next` 16.3.1 / Prettier 3 |                                                                 |
| `embedded-postgres` (dev only) | ^18.4.0-beta.17                          | banco de desenvolvimento local — ver "Banco de desenvolvimento" |

Nenhuma versão foi fixada de antemão nos documentos anteriores — todas as versões acima são as que o `npm install` trouxe como estáveis no momento real do scaffold (2026-08-18), conforme pedido.

## Prisma 7 — o que mudou e como foi configurado

Pesquisado na documentação oficial antes de escrever qualquer config (não foi "inventado"):

- [Reference: prisma config file](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [Upgrade to Prisma ORM 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [PostgreSQL connector — driver adapters](https://www.prisma.io/docs/orm/overview/databases/postgresql)

Mudanças relevantes na v7, todas confirmadas empiricamente com o CLI 7.9.1 instalado (`npx prisma validate`/`generate`, não só lidas na doc):

1. **`datasource db { url = ... }` não existe mais no `schema.prisma`.** A conexão vive em `prisma.config.ts` (raiz do projeto):
   ```ts
   import "dotenv/config";
   import { defineConfig, env } from "prisma/config";

   export default defineConfig({
     schema: "prisma/schema.prisma",
     migrations: { path: "prisma/migrations" },
     datasource: { url: env("DATABASE_URL") },
   });
   ```
2. **Variáveis de ambiente não são carregadas automaticamente** pelo CLI nem pelo Client — `import "dotenv/config"` é explícito tanto em `prisma.config.ts` quanto em `vitest.setup.ts`.
3. **O generator mudou de nome e exige `output` explícito:**
   ```prisma
   generator client {
     provider = "prisma-client"
     output   = "../src/generated/prisma"
   }
   ```
   (não é mais `"prisma-client-js"` sem `output` — ver "Divergências" abaixo, é a única mudança em relação ao texto do `schema.prisma` da v3.)
4. **`PrismaClient` exige um driver adapter explícito** — não existe mais engine binário embutido:
   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
   const prisma = new PrismaClient({ adapter });
   ```
   Implementado em [`src/server/db.ts`](../src/server/db.ts).

Comandos validados de verdade neste módulo (não só "deveria funcionar"): `prisma validate`, `prisma format`, `prisma generate`, `prisma migrate dev` (duas migrations reais aplicadas), `prisma migrate deploy` (script disponível).

## Estrutura de pastas criada

```
estuda-mais/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── 20260818210055_init/
│       └── 20260818210111_review_item_scope_constraint/   # SQL manual do ReviewItem
├── prisma.config.ts
├── scripts/
│   └── dev-db.mjs                  # start/stop/status do Postgres de dev
├── src/
│   ├── app/                        # placeholder mínimo do Next.js (sem UI de produto)
│   ├── modules/
│   │   ├── knowledge/
│   │   │   ├── server/services/resolveEntity.ts
│   │   │   └── types/academic-relation.schema.ts
│   │   ├── assessment/    (só README — vazio neste módulo)
│   │   ├── pedagogy/      (só README — vazio neste módulo)
│   │   ├── gamification/  (só README — vazio neste módulo)
│   │   ├── review/
│   │   │   ├── types/review-item.schema.ts
│   │   │   └── review-item.integration.test.ts
│   │   ├── simulation/    (só README — vazio neste módulo)
│   │   └── curation/      (só README — vazio neste módulo)
│   ├── shared/schemas/     (User, Profile, Source, LegalReference, Citation, enum helper)
│   ├── config/relation-types.ts
│   ├── server/
│   │   ├── db.ts            (Prisma Client singleton + adapter-pg)
│   │   └── auth/password.ts (hash/verify — única peça de "auth" deste módulo)
│   ├── test/fixtures.ts     (dados de TESTE descartáveis, não conteúdo real)
│   └── generated/prisma/    (gerado pelo Prisma — gitignored)
└── docs/
    ├── ARQUITETURA.md
    ├── RELATORIO_REVISAO_V3.md
    └── MODULO-1.md
```

`config/relation-types.ts` da instrução original ficou em `src/config/relation-types.ts` — a Seção 4 do próprio pedido já havia estabelecido `src/config/` como a pasta de infraestrutura; mantido consistente com o resto de `src/`.

## Banco de desenvolvimento (decisão técnica)

O ambiente do scaffold não tinha **Docker nem PostgreSQL instalados**, e o Prisma exige PostgreSQL real (a arquitetura não permite trocar por SQLite "por conveniência" — regra 20 da sua instrução). Resolvido com [`embedded-postgres`](https://www.npmjs.com/package/embedded-postgres): baixa um binário real do Postgres (18.4) e roda localmente, sem serviço de SO, sem admin.

```bash
npm run db:start    # sobe o Postgres de dev — mantém o terminal ocupado, como `next dev`
npm run db:stop     # para, de outro terminal
npm run db:status   # checa se está no ar
```

**Limitação real descoberta durante a implementação:** no Windows, este pacote não daemoniza de verdade — o servidor fica atrelado ao processo Node que o iniciou. Por isso `db:start` roda em primeiro plano (não "inicia e volta o prompt"); `db:stop` invoca `pg_ctl -m fast stop` diretamente pelo binário (resolvido de forma independente de plataforma), porque chamar `.stop()` do wrapper a partir de uma instância nova se mostrou pouco confiável na prática (foi testado, falhou, e foi corrigido — não ficou como suposição).

Em qualquer ambiente com Docker ou um Postgres gerenciado (Neon, Supabase, RDS...), basta apontar `DATABASE_URL` para o serviço real — nenhum código do projeto muda.

## Como rodar

```bash
cp .env.example .env        # ajustar se necessário
npm install
npm run db:start             # em um terminal dedicado
npm run db:migrate:deploy    # em outro terminal — aplica as migrations existentes
npm run db:generate
npm run test                 # 22 testes, integração real contra o Postgres de dev
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Decisões técnicas

1. **Autenticação mínima:** só `src/server/auth/password.ts` (hash/verify com `crypto.scrypt` da stdlib, sem dependência nova). Nenhuma tela de login, sessão, OAuth ou MFA — isso é funcionalidade de produto, adiada para o módulo de Layout Principal/Autenticação, conforme a própria instrução permitia ("a menos que seja estritamente necessário para o scaffold técnico" — não foi).
2. **`embedded-postgres` como devDependency** para viabilizar banco de desenvolvimento real sem Docker — decisão de infraestrutura local, não uma mudança de arquitetura (produção continua sendo qualquer PostgreSQL real via `DATABASE_URL`).
3. **Enums Prisma no client gerado são objetos `const`, não `enum` TS** (formato do provider `"prisma-client"`) — criado `src/shared/schemas/zod-enum.ts` como ponte única para `z.enum`, em vez de duplicar cada lista de valores manualmente em cada schema Zod.
4. **`NODE_ENV === "development"`** (não `!== "production"`) como condição para cachear o Prisma Client em `globalThis` — evita que o cache de hot-reload do Next.js vaze entre arquivos de teste do Vitest (que roda com `NODE_ENV=test`).
5. **Fixtures de teste com prefixo `TEST_FIXTURE_`**, criadas e removidas a cada suíte (`afterAll`) — nenhuma linha de conteúdo acadêmico real ou de exemplo (Freud, Piaget etc.) foi inserida em nenhum banco.

## Testes — cobertura dos 10 itens pedidos

| #   | Item pedido                              | Onde                                                                                    |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Schema Prisma válido                     | `npx prisma validate` (executado, não só suposto)                                       |
| 2   | Migration executa                        | `prisma migrate dev` rodado de verdade contra o Postgres de dev (2 migrations)          |
| 3   | ReviewItem QUESTION válido               | `review-item.integration.test.ts`                                                       |
| 4   | ReviewItem CONCEPT válido                | `review-item.integration.test.ts`                                                       |
| 5   | ReviewItem ambos nulos rejeitado         | `review-item.integration.test.ts` (CHECK do banco) + `review-item.schema.test.ts` (Zod) |
| 6   | ReviewItem ambos preenchidos rejeitado   | idem                                                                                    |
| 7   | Duplicação do mesmo ReviewItem rejeitada | `review-item.integration.test.ts` (índice único parcial)                                |
| 8   | resolveEntity reconhece tipos suportados | `resolveEntity.test.ts`                                                                 |
| 9   | relationType inválido rejeitado          | `relation-types.test.ts`                                                                |
| 10  | Nenhuma relação Prisma quebrada          | `npx prisma validate` (schema não compila com relação incompleta)                       |

22 testes, todos passando (`npm run test`).
