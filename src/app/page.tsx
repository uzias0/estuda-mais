import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";

/**
 * A raiz do site (Módulo 11, seção 6) leva à experiência do estudante — mas
 * agora, com autenticação real (etapa de consolidação), só quando há uma
 * sessão válida; sem sessão, para `/login`. `/dashboard`/`/admin` também
 * verificam por conta própria (defesa em profundidade) — esta página é só
 * o primeiro roteamento, não a única barreira.
 */
export default async function Home() {
  const actor = await getSessionActor();
  redirect(actor ? "/dashboard" : "/login");
}
