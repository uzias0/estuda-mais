/**
 * Plano de estudo completo (Módulo 11, seção 14) — consome `getStudyPlan`
 * (Módulo 10) por inteiro, na ordem de prioridade já calculada pelo
 * servidor.
 *
 * `force-dynamic`: sem API dinâmica do Next.js nesta página, ela seria
 * pré-renderizada estaticamente no build — os dados do aluno ficariam
 * congelados em vez de atualizados a cada acesso.
 */
export const dynamic = "force-dynamic";

import { requireSessionActor } from "@/server/auth/session";
import { getStudyPlan } from "@/modules/study-engine/server/services/study-plan.service";
import { StudyActionCard } from "@/components/StudyActionCard";
import { EmptyState } from "@/components/EmptyState";

export default async function EstudarPage() {
  const actor = await requireSessionActor();
  const plan = await getStudyPlan(actor, actor.userId);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Seu plano de hoje</h1>

      {plan.length === 0 ? (
        <EmptyState
          title="Nenhuma ação de estudo disponível agora."
          description="Continue estudando para gerar novas recomendações."
        />
      ) : (
        <div className="stack">
          {plan.map((action, index) => (
            <StudyActionCard
              key={index}
              action={action}
              rank={index + 1}
              emphasized={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
