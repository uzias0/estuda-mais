/**
 * Banco de questões (Módulo 11, seções 23/24) — consome `listQuestions`
 * (Módulo 3/6) com filtros vindos da própria URL (`searchParams`), sem
 * Client Component: um formulário GET nativo recarrega a página com os
 * filtros aplicados. Sempre `reviewStatus: PUBLISHED` — nunca rascunho
 * (seção 49: "conteúdo DRAFT não aparece na experiência pública").
 */
import { PublicationStatus } from "@/generated/prisma/enums";
import { listQuestions } from "@/modules/assessment/server/services/questionQuery.service";
import { listDisciplines } from "@/modules/knowledge/server/services/discipline.service";
import {
  listExamBoards,
  listOrganizations,
  listPositions,
} from "@/modules/assessment/server/services/examReference.service";
import { questionTypeLabel, difficultyLabel } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";

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

export default async function QuestoesPage({ searchParams }: PageProps<"/dashboard/questoes">) {
  const params = await searchParams;
  const str = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const [questions, disciplines, examBoards, organizations, positions] = await Promise.all([
    listQuestions({
      reviewStatus: PublicationStatus.PUBLISHED,
      conceptId: str("conceptId"),
      disciplineId: str("disciplineId"),
      difficulty: str("difficulty") as never,
      type: str("type") as never,
      examBoardId: str("examBoardId"),
      organizationId: str("organizationId"),
      positionId: str("positionId"),
      year: str("year") ? Number(str("year")) : undefined,
      take: 30,
    }),
    listDisciplines({ take: 50 }),
    listExamBoards({ take: 50 }),
    listOrganizations({ take: 50 }),
    listPositions({ take: 50 }),
  ]);

  const recentYears = [
    ...new Set(questions.map((q) => q.examEdition?.year).filter((y): y is number => !!y)),
  ]
    .sort((a, b) => b - a)
    .slice(0, 3);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Questões</h1>

      {recentYears.length > 0 ? (
        <div className="row-wrap">
          <span className="card-title">Questões recentes</span>
          {recentYears.map((year) => (
            <Badge key={year} tone="brand">
              {year}
            </Badge>
          ))}
        </div>
      ) : null}

      <form method="GET" className="card row-wrap">
        {str("conceptId") ? (
          <input type="hidden" name="conceptId" value={str("conceptId")} />
        ) : null}
        <select
          name="disciplineId"
          defaultValue={str("disciplineId") ?? ""}
          className="text-input"
          style={{ maxWidth: 200 }}
        >
          <option value="">Disciplina</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          name="difficulty"
          defaultValue={str("difficulty") ?? ""}
          className="text-input"
          style={{ maxWidth: 200 }}
        >
          <option value="">Dificuldade</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {difficultyLabel(d)}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={str("type") ?? ""}
          className="text-input"
          style={{ maxWidth: 220 }}
        >
          <option value="">Tipo</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {questionTypeLabel(t)}
            </option>
          ))}
        </select>
        <select
          name="examBoardId"
          defaultValue={str("examBoardId") ?? ""}
          className="text-input"
          style={{ maxWidth: 200 }}
        >
          <option value="">Banca</option>
          {examBoards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          name="organizationId"
          defaultValue={str("organizationId") ?? ""}
          className="text-input"
          style={{ maxWidth: 200 }}
        >
          <option value="">Órgão</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          name="positionId"
          defaultValue={str("positionId") ?? ""}
          className="text-input"
          style={{ maxWidth: 200 }}
        >
          <option value="">Cargo</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          name="year"
          type="number"
          placeholder="Ano"
          defaultValue={str("year") ?? ""}
          className="text-input"
          style={{ maxWidth: 120 }}
        />
        <button type="submit" className="btn btn-primary">
          Filtrar
        </button>
      </form>

      {questions.length === 0 ? (
        <EmptyState title="Nenhuma questão encontrada com estes filtros." />
      ) : (
        <div className="stack">
          {questions.map((question) => (
            <div key={question.id} className="card card--tight">
              <div className="row-wrap" style={{ justifyContent: "space-between" }}>
                <Badge tone="muted">{questionTypeLabel(question.type)}</Badge>
                <Badge tone="brand">{difficultyLabel(question.difficulty)}</Badge>
                {question.examEdition ? (
                  <Badge tone="warning">{question.examEdition.year}</Badge>
                ) : null}
              </div>
              <p style={{ marginTop: 10 }}>{question.prompt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
