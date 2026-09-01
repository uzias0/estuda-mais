/**
 * Entrada anônima (fase "diagnóstico antes do cadastro") — visitante já
 * logado não deveria ver isto de novo, vai direto pro dashboard. Sem
 * `requireSessionActor()` nenhum: esta rota é DELIBERADAMENTE pública.
 */
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionActor } from "@/server/auth/session";
import { ComecarFlow } from "@/components/ComecarFlow";

export default async function ComecarPage() {
  const actor = await getSessionActor();
  if (actor) redirect("/dashboard");

  return (
    <div className="auth-page">
      <div className="auth-panel" style={{ maxWidth: 640 }}>
        <div>
          <h1 className="auth-brand-title">Estuda+</h1>
          <p className="auth-brand-subtitle">Aprenda Psicologia de verdade</p>
        </div>
        <ComecarFlow />
      </div>
    </div>
  );
}
