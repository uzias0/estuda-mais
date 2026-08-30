/**
 * MOCK DE DESENVOLVIMENTO — NÃO É AUTENTICAÇÃO (Módulo 11, seção 47: "o
 * projeto ainda não possui autenticação real... não implementar
 * autenticação neste módulo"). Toda a camada de UI precisa de um `Actor`
 * (Módulo 1) para chamar os serviços de domínio; sem login/sessão, este
 * módulo resolve um único usuário STUDENT fixo, persistido no banco real
 * (find-or-create por e-mail fixo), e o devolve como o `Actor` "logado".
 *
 * Isto é INFRAESTRUTURA DE DESENVOLVIMENTO, não um usuário de teste
 * (`TEST_FIXTURE_*`) nem uma fixture de produto — é o substituto temporário
 * do login real, que o módulo de autenticação (fora do escopo deste
 * módulo, seção 52) vai remover por completo. Documentado aqui e em
 * `docs/MODULO-11.md`, seção "Decisões técnicas"/"O que não foi
 * implementado".
 *
 * NUNCA usar isto num ambiente de produção real — não há verificação de
 * identidade nenhuma; qualquer requisição se torna automaticamente este
 * usuário.
 *
 * ATUALIZAÇÃO — a autenticação real chegou (etapa de consolidação,
 * `src/server/auth/session.ts`, `docs/FINALIZACAO-PROJETO.md`): nenhuma
 * página/Server Action de produção usa mais este mock — todas resolvem o
 * `Actor` via `requireSessionActor()`. Esta função permanece só para os
 * testes de integração (`src/test/authTestHelpers.ts` usa o `userId`
 * resolvido aqui para "logar" um usuário real de teste).
 */
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import type { Actor } from "@/server/auth/authorize";

const DEV_ACTOR_EMAIL = "dev.student@estuda.local";
const DEV_ACTOR_NAME = "Aluno (ambiente de desenvolvimento)";

/**
 * Devolve o `Actor` de desenvolvimento — cria o `User`+`Profile`
 * correspondentes na primeira chamada, reaproveita nas seguintes. Sempre
 * `Role.STUDENT`: a UI deste módulo é a experiência do estudante (seção 2
 * do prompt), não a de curadoria/administração.
 */
export async function getCurrentActor(): Promise<Actor> {
  const existing = await prisma.user.findUnique({ where: { email: DEV_ACTOR_EMAIL } });
  if (existing) return { userId: existing.id, role: existing.role };

  const created = await prisma.user.create({
    data: {
      email: DEV_ACTOR_EMAIL,
      role: Role.STUDENT,
      profile: { create: { name: DEV_ACTOR_NAME } },
    },
  });
  return { userId: created.id, role: created.role };
}

// ============================================================================
// Módulo 12 — mock de desenvolvimento para a área /admin
// ============================================================================

const DEV_ADMIN_EMAIL = "dev.curator@estuda.local";
const DEV_ADMIN_NAME = "Curador (ambiente de desenvolvimento)";

/**
 * MOCK DE DESENVOLVIMENTO PARA A ÁREA ADMINISTRATIVA — mesmo mecanismo e
 * mesma ressalva de `getCurrentActor()` acima (Módulo 11), NÃO é
 * autenticação real (Módulo 12, seção 20: "não implementar autenticação
 * real" também se aplica aqui). O Módulo 12 exige um `Actor` com papel
 * ADMIN para exercitar toda a superfície de curadoria/publicação
 * (`CURATOR_ROLES`/`PUBLISHER_ROLES`, Módulos 2-9) — sem login/sessão,
 * resolve um SEGUNDO usuário fixo, distinto do `dev.student@estuda.local`
 * usado pela experiência do aluno, para que as duas áreas nunca compartilhem
 * identidade nem papel.
 *
 * `Role.ADMIN` (não `CONTENT_EDITOR`) foi escolhido para o ator de
 * desenvolvimento porque `ADMIN` é um superconjunto de `CURATOR_ROLES`
 * (`[CONTENT_EDITOR, ADMIN]`) — com ele, toda a superfície administrativa
 * (criar/editar/relacionar/arquivar/restaurar E publicar) fica exercitável
 * em desenvolvimento. A distinção real CONTENT_EDITOR vs. ADMIN (quem pode
 * publicar) já é impostas pelos serviços de domínio (`assertRole`,
 * Módulos 2-9) e é isso — não este mock — que os testes de segurança deste
 * módulo verificam (`src/server/auth/devActor.test.ts` e os testes de
 * autorização de cada Server Action administrativa).
 *
 * NUNCA usar isto num ambiente de produção real — mesma ressalva de
 * `getCurrentActor()`.
 *
 * ATUALIZAÇÃO (etapa de consolidação, seção 18): com autenticação real
 * implementada (`src/server/auth/session.ts`), nenhuma página/Server
 * Action de produção chama mais `getCurrentActor()`/`getCurrentAdminActor()`
 * — ambas seguem existindo só para os testes de integração (que "logam"
 * um usuário via `src/test/authTestHelpers.ts` usando o `userId` resolvido
 * aqui) e para o script `scripts/bootstrap-admin.ts`.
 */
export async function getCurrentAdminActor(): Promise<Actor> {
  const existing = await prisma.user.findUnique({ where: { email: DEV_ADMIN_EMAIL } });
  if (existing) return { userId: existing.id, role: existing.role };

  const created = await prisma.user.create({
    data: {
      email: DEV_ADMIN_EMAIL,
      role: Role.ADMIN,
      profile: { create: { name: DEV_ADMIN_NAME } },
    },
  });
  return { userId: created.id, role: created.role };
}
