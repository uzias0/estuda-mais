export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getQuestion } from "@/modules/assessment/server/services/question.service";
import { listSources } from "@/modules/curation/server/services/source.service";
import { listExamEditions } from "@/modules/assessment/server/services/examEdition.service";
import { listTags } from "@/modules/knowledge/server/services/tag.service";
import {
  updateQuestionAction,
  publishQuestionAction,
  archiveQuestionAction,
  linkQuestionToKnowledgeAction,
  unlinkQuestionFromKnowledgeAction,
  linkQuestionToTagAction,
} from "@/server/actions/admin/questions-actions";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { Badge } from "@/components/Badge";
import { publicationStatusLabel, knowledgeEntityTypeLabel } from "@/lib/format";

const NODE_TYPES = [
  "PERSON",
  "WORK",
  "THEORY",
  "CONCEPT",
  "SCHOOL",
  "DISCIPLINE",
  "PERIOD",
  "DEVELOPMENTAL_STAGE",
];

export default async function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const question = await getQuestion(id);
  if (!question) notFound();

  const [sources, examEditions, tags] = await Promise.all([
    listSources({ take: 200 }),
    listExamEditions({ take: 200 }),
    listTags(),
  ]);
  const linkedTagIds = new Set(question.tags.map((t) => t.id));
  const updateAction = updateQuestionAction.bind(null, id, question.type);

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Questão</h1>
        <Badge
          tone={
            question.reviewStatus === "PUBLISHED"
              ? "success"
              : question.reviewStatus === "ARCHIVED"
                ? "muted"
                : "warning"
          }
        >
          {publicationStatusLabel(question.reviewStatus)}
        </Badge>
      </div>

      <QuestionForm
        action={updateAction}
        sources={sources}
        examEditions={examEditions}
        lockType
        existing={{
          prompt: question.prompt,
          type: question.type,
          explanation: question.explanation,
          difficulty: question.difficulty,
          sourceId: question.sourceId,
          examEditionId: question.examEditionId,
          reproductionAllowed: question.reproductionAllowed,
          options: question.options,
        }}
      />

      <div className="card stack">
        <p className="card-title">Conhecimento relacionado</p>
        <div className="row-wrap">
          {question.knowledgeTags.map((t) => (
            <form
              key={`${t.entityType}-${t.entityId}`}
              action={unlinkQuestionFromKnowledgeAction.bind(null, id, t.entityType, t.entityId)}
            >
              <button
                type="submit"
                className="badge badge-brand"
                style={{ border: "none", cursor: "pointer" }}
              >
                {knowledgeEntityTypeLabel(t.entityType)}: {t.entityId} ✕
              </button>
            </form>
          ))}
        </div>
        <form
          action={linkQuestionToKnowledgeAction.bind(null, id)}
          className="row-wrap"
          style={{ alignItems: "end" }}
        >
          <select name="entityType" className="text-input" required>
            {NODE_TYPES.map((t) => (
              <option key={t} value={t}>
                {knowledgeEntityTypeLabel(t)}
              </option>
            ))}
          </select>
          <input name="entityId" className="text-input" placeholder="ID da entidade" required />
          <button type="submit" className="btn btn-secondary">
            Vincular
          </button>
        </form>
      </div>

      <div className="card stack">
        <p className="card-title">Tags</p>
        <div className="row-wrap">
          {question.tags.map((t) => (
            <Badge key={t.id} tone="muted">
              {t.name}
            </Badge>
          ))}
        </div>
        <form
          action={linkQuestionToTagAction.bind(null, id)}
          className="row-wrap"
          style={{ alignItems: "end" }}
        >
          <select name="tagId" className="text-input" required>
            <option value="">— selecione uma tag —</option>
            {tags
              .filter((t) => !linkedTagIds.has(t.id))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
          <button type="submit" className="btn btn-secondary">
            Vincular
          </button>
        </form>
      </div>

      <div className="card stack">
        <p className="card-title">Publicação</p>
        <div className="admin-actions-row">
          {question.reviewStatus !== "PUBLISHED" ? (
            <form action={publishQuestionAction.bind(null, id)}>
              <button type="submit" className="btn btn-primary">
                Publicar
              </button>
            </form>
          ) : null}
          {question.reviewStatus !== "ARCHIVED" ? (
            <form action={archiveQuestionAction.bind(null, id)}>
              <button type="submit" className="btn btn-secondary">
                Arquivar
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
