/**
 * Simulados (Módulo 11, seção 20) — as 3 formas de montagem que o Módulo 6
 * já suporta (`buildSimulation`: PERSONALIZED/EXAM_EDITION/REVIEW), com
 * "disciplina" como filtro do personalizado. Formulário nativo (`<form
 * action={...}>`) chamando a Server Action direto — sem Client Component
 * (seção 45: Server Component quando não há necessidade de interatividade
 * além do próprio envio do formulário).
 *
 * `force-dynamic`: evita pré-renderização estática (dados ficariam
 * congelados no momento do build).
 */
export const dynamic = "force-dynamic";

import { requireSessionActor } from "@/server/auth/session";
import { listSimulations } from "@/modules/simulation/server/services/simulation.service";
import { listDisciplines } from "@/modules/knowledge/server/services/discipline.service";
import { listExamEditions } from "@/modules/assessment/server/services/examEdition.service";
import { buildSimulationAction } from "@/server/actions/simulation-actions";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import Link from "next/link";

export default async function SimuladosPage() {
  const actor = await requireSessionActor();
  const [mine, disciplines, examEditions] = await Promise.all([
    listSimulations(actor, { mine: true }),
    listDisciplines({ take: 50 }),
    listExamEditions({ take: 50 }),
  ]);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Simulados</h1>

      <form action={buildSimulationAction} className="card stack">
        <p className="card-title">Montar novo simulado</p>

        <fieldset className="stack" style={{ border: "none", padding: 0 }}>
          <legend className="visually-hidden">Tipo de simulado</legend>
          <label className="option-row">
            <input type="radio" name="kind" value="PERSONALIZED" defaultChecked />
            <span>Simulado personalizado</span>
          </label>
          <label className="option-row">
            <input type="radio" name="kind" value="EXAM_EDITION" />
            <span>Prova real</span>
          </label>
          <label className="option-row">
            <input type="radio" name="kind" value="REVIEW" />
            <span>Revisão</span>
          </label>
        </fieldset>

        <label>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
            Quantidade de questões
          </span>
          <input
            type="number"
            name="count"
            defaultValue={10}
            min={1}
            max={100}
            className="text-input"
          />
        </label>

        <label>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
            Disciplina (opcional, só para personalizado)
          </span>
          <select name="disciplineId" className="text-input">
            <option value="">Todas</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
            Prova (só para &quot;Prova real&quot;)
          </span>
          <select name="examEditionId" className="text-input">
            <option value="">Selecione uma prova</option>
            {examEditions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.name} ({edition.year})
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn btn-primary">
          Montar simulado
        </button>
      </form>

      <section>
        <p className="card-title" style={{ marginBottom: 10 }}>
          Meus simulados
        </p>
        {mine.length === 0 ? (
          <EmptyState title="Você ainda não montou nenhum simulado." />
        ) : (
          <div className="grid-cards">
            {mine.map((simulation) => (
              <Link
                key={simulation.id}
                href={`/dashboard/simulados/${simulation.id}`}
                className="card card--tight"
              >
                <p style={{ fontWeight: 700 }}>{simulation.title}</p>
                <Badge tone="muted">{simulation.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
