/**
 * Dashboard inicial (Módulo 11, seções 6/7/8/34) — responde visualmente "o
 * que eu devo estudar agora?" consumindo `getStudyPlan` (Módulo 10) e
 * `getGamificationSummary` (Módulo 9). Server Component: toda leitura
 * acontece no servidor: a UI só apresenta o que os serviços devolveram.
 *
 * `force-dynamic`: a página não usa nenhuma API dinâmica do Next.js
 * (cookies/headers/searchParams) e, sem isto, seria pré-renderizada
 * ESTATICAMENTE no build — os dados do aluno ficariam congelados no
 * momento do build em vez de atualizados a cada acesso.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireSessionActor } from "@/server/auth/session";
import { getStudyPlan } from "@/modules/study-engine/server/services/study-plan.service";
import { getGamificationSummary } from "@/modules/gamification/server/services/gamification-summary.service";
import { StudyActionCard } from "@/components/StudyActionCard";
import { GamificationSnapshot } from "@/components/GamificationSnapshot";
import { CharacterMessage } from "@/components/characters/CharacterMessage";
import { NEUTRAL_CHARACTER } from "@/config/characters";

export default async function DashboardHomePage() {
  const actor = await requireSessionActor();
  const [plan, summary] = await Promise.all([
    getStudyPlan(actor, actor.userId),
    getGamificationSummary(actor, actor.userId),
  ]);

  const topAction = plan[0];
  const isFirstAccess = topAction?.type === "START_DIAGNOSTIC";

  return (
    <div className="page-container stack">
      <CharacterMessage
        character={NEUTRAL_CHARACTER}
        expression={isFirstAccess ? "encouraging" : "happy"}
        message={
          isFirstAccess
            ? "Bem-vindo! Vamos descobrir juntos por onde começar."
            : "Que bom te ver de novo! Vamos continuar de onde você parou?"
        }
      />

      {isFirstAccess ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1.4rem", fontWeight: 800 }}>Bem-vindo à sua jornada de estudos!</p>
          <p
            style={{
              color: "var(--color-text-muted)",
              marginTop: 12,
              maxWidth: 480,
              marginInline: "auto",
            }}
          >
            Antes de começar, vamos descobrir qual é o seu nível atual. Você responderá uma mini
            avaliação e receberá um ponto de partida personalizado.
          </p>
          <Link
            href="/dashboard/diagnostico"
            className="btn btn-primary"
            style={{ marginTop: 20, minWidth: 220 }}
          >
            Começar diagnóstico
          </Link>
        </div>
      ) : (
        <>
          <GamificationSnapshot summary={summary} />

          <section>
            <p className="card-title" style={{ marginBottom: 10 }}>
              Continue seus estudos
            </p>
            {topAction ? <StudyActionCard action={topAction} emphasized /> : null}
          </section>

          {plan.length > 1 ? (
            <section>
              <p className="card-title" style={{ marginBottom: 10 }}>
                Em seguida no seu plano
              </p>
              <div className="grid-cards">
                {plan.slice(1).map((action, index) => (
                  <StudyActionCard key={index} action={action} rank={index + 2} />
                ))}
              </div>
            </section>
          ) : null}

          <Link
            href="/dashboard/estudar"
            className="btn btn-secondary"
            style={{ alignSelf: "flex-start" }}
          >
            Ver plano de estudo completo
          </Link>
        </>
      )}
    </div>
  );
}
