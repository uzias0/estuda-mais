import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";

/**
 * A raiz do site (Módulo 11, seção 6) leva à experiência do estudante — com
 * autenticação real (etapa de consolidação), só quando há uma sessão
 * válida; `/dashboard`/`/admin` também verificam por conta própria (defesa
 * em profundidade) — esta página é só o primeiro roteamento, não a única
 * barreira.
 *
 * Fase "diagnóstico antes do cadastro" (pedido do usuário: "a primeira
 * cara que a pessoa tem que ter no site é... vamos fazer uma trilha, pra
 * começar o diagnóstico"): visitante SEM sessão agora vai para `/comecar`
 * (diagnóstico anônimo → resultado → CTA de cadastro), não direto para
 * `/login` — `/login` continua existindo e acessível (link dentro de
 * `/comecar`) para quem já tem conta.
 */
export default async function Home() {
  const actor = await getSessionActor();
  redirect(actor ? "/dashboard" : "/comecar");
}
