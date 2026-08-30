export const dynamic = "force-dynamic";
import Link from "next/link";
import { listQuestions } from "@/modules/assessment/server/services/questionQuery.service";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { publicationStatusLabel, difficultyLabel, questionTypeLabel } from "@/lib/format";

const DIFFICULTIES = ["INICIANTE", "BASICO", "INTERMEDIARIO", "AVANCADO", "DOMINIO"];
const TYPES = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "MULTI_SELECT",
  "ORDERING",
  "MATCHING",
  "FILL_BLANK",
  "SHORT_ANSWER",
  "CASE_STUDY",
];
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

/**
 * Filtros expostos aqui = exatamente os já existentes em `QuestionFilters`
 * (`questionQuery.service.ts`, Módulo 3) — nenhum filtro novo foi inventado.
 * `conceptId`/`disciplineId` continuam por ID (não há busca textual de
 * conceito neste módulo; a UI administrativa de conhecimento resolve o ID).
 */
export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const questions = await listQuestions({
    difficulty: (sp.difficulty as never) || undefined,
    type: (sp.type as never) || undefined,
    reviewStatus: (sp.status as never) || undefined,
    conceptId: sp.conceptId || undefined,
    disciplineId: sp.disciplineId || undefined,
    examEditionId: sp.examEditionId || undefined,
    examBoardId: sp.examBoardId || undefined,
    organizationId: sp.organizationId || undefined,
    positionId: sp.positionId || undefined,
    year: sp.year ? Number(sp.year) : undefined,
    take: 100,
  });

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Questões</h1>
        <Link href="/admin/questions/new" className="btn btn-primary">
          Nova questão
        </Link>
      </div>

      <form method="GET" className="admin-toolbar card">
        <div className="field">
          <label htmlFor="type">Tipo</label>
          <select id="type" name="type" className="text-input" defaultValue={sp.type ?? ""}>
            <option value="">Todos</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {questionTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="difficulty">Dificuldade</label>
          <select
            id="difficulty"
            name="difficulty"
            className="text-input"
            defaultValue={sp.difficulty ?? ""}
          >
            <option value="">Todas</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {difficultyLabel(d)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" className="text-input" defaultValue={sp.status ?? ""}>
            <option value="">Todos</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {publicationStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="year">Ano</label>
          <input
            id="year"
            name="year"
            type="number"
            className="text-input"
            defaultValue={sp.year ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="conceptId">ID do conceito</label>
          <input
            id="conceptId"
            name="conceptId"
            className="text-input"
            defaultValue={sp.conceptId ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="disciplineId">ID da disciplina</label>
          <input
            id="disciplineId"
            name="disciplineId"
            className="text-input"
            defaultValue={sp.disciplineId ?? ""}
          />
        </div>
        <button type="submit" className="btn btn-secondary">
          Filtrar
        </button>
      </form>

      {questions.length === 0 ? (
        <EmptyState title="Nenhuma questão encontrada com estes filtros." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Enunciado</th>
                <th>Tipo</th>
                <th>Dificuldade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id}>
                  <td style={{ whiteSpace: "normal", maxWidth: 420 }}>
                    <Link href={`/admin/questions/${q.id}`}>{q.prompt.slice(0, 120)}</Link>
                  </td>
                  <td>{questionTypeLabel(q.type)}</td>
                  <td>{difficultyLabel(q.difficulty)}</td>
                  <td>
                    <Badge
                      tone={
                        q.reviewStatus === "PUBLISHED"
                          ? "success"
                          : q.reviewStatus === "ARCHIVED"
                            ? "muted"
                            : "warning"
                      }
                    >
                      {publicationStatusLabel(q.reviewStatus)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
