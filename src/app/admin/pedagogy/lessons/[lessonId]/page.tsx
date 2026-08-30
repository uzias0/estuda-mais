export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getLesson } from "@/modules/pedagogy/server/services/lesson.service";
import { listQuestions } from "@/modules/assessment/server/services/questionQuery.service";
import {
  updateSimpleEntityAction,
  publishSimpleEntityAction,
  archiveSimpleEntityAction,
} from "@/server/actions/admin/simple-entity-actions";
import {
  linkLessonToKnowledgeAction,
  unlinkLessonFromKnowledgeAction,
  createLessonBlockAction,
  updateLessonBlockAction,
  deleteLessonBlockAction,
  reorderLessonBlocksAction,
} from "@/server/actions/admin/pedagogy-actions";
import { listCitationsForEntity } from "@/modules/curation/server/services/citation.service";
import { CitationEntityType } from "@/generated/prisma/enums";
import { Badge } from "@/components/Badge";
import { CitationForm } from "@/components/admin/CitationForm";
import { publicationStatusLabel, blockTypeLabel, knowledgeEntityTypeLabel } from "@/lib/format";

const BLOCK_TYPES = ["INTRO", "CONCEPT", "EXAMPLE", "QUESTION", "CONCLUSION"];
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

/**
 * Editor de Lesson + LessonBlock (Módulo 12, seção 9) — NÃO é a execução da
 * lição (isso continua sendo `LessonRunner`/`lesson-execution.service.ts`,
 * Módulo 8): esta página só edita a estrutura de CURADORIA (título, blocos,
 * conhecimento relacionado, publicação), a mesma `Lesson`/`LessonBlock` que
 * o aluno depois executa.
 */
export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);
  if (!lesson) notFound();

  const [publishedQuestions, citations] = await Promise.all([
    listQuestions({ reviewStatus: "PUBLISHED" as never, take: 200 }),
    listCitationsForEntity(CitationEntityType.LESSON, lessonId),
  ]);
  const blockOrder = lesson.blocks.map((b) => b.id).join(",");

  const updateTitle = updateSimpleEntityAction.bind(null, "lessons", lessonId);
  const publish = publishSimpleEntityAction.bind(null, "lessons", lessonId);
  const archive = archiveSimpleEntityAction.bind(null, "lessons", lessonId);

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{lesson.title}</h1>
        <Badge
          tone={
            lesson.status === "PUBLISHED"
              ? "success"
              : lesson.status === "ARCHIVED"
                ? "muted"
                : "warning"
          }
        >
          {publicationStatusLabel(lesson.status)}
        </Badge>
      </div>

      <form action={updateTitle} className="row-wrap card" style={{ alignItems: "end" }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="title">Título</label>
          <input id="title" name="title" className="text-input" defaultValue={lesson.title} />
        </div>
        <button type="submit" className="btn btn-secondary">
          Salvar título
        </button>
      </form>

      <div className="card stack">
        <p className="card-title">Blocos ({lesson.blocks.length})</p>
        {blockOrder ? (
          <form
            action={reorderLessonBlocksAction.bind(null, lessonId)}
            className="row-wrap"
            style={{ alignItems: "end" }}
          >
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="orderedIds">Ordem (ids separados por vírgula)</label>
              <input
                id="orderedIds"
                name="orderedIds"
                className="text-input"
                defaultValue={blockOrder}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Reordenar
            </button>
          </form>
        ) : null}

        <div className="stack">
          {lesson.blocks.map((block) => (
            <div key={block.id} className="card card--tight stack">
              <form
                action={updateLessonBlockAction.bind(null, lessonId, block.id)}
                className="stack"
              >
                <div className="row-wrap">
                  <Badge tone="muted">#{block.order}</Badge>
                  <select
                    name="type"
                    className="text-input"
                    defaultValue={block.type}
                    style={{ maxWidth: 200 }}
                  >
                    {BLOCK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {blockTypeLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>
                {block.type === "QUESTION" ? (
                  <select
                    name="questionId"
                    className="text-input"
                    defaultValue={block.questionId ?? ""}
                  >
                    <option value="">— selecione uma questão publicada —</option>
                    {publishedQuestions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.prompt.slice(0, 80)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    name="content"
                    className="text-input"
                    rows={3}
                    defaultValue={block.content ?? ""}
                  />
                )}
                <div className="admin-actions-row">
                  <button type="submit" className="btn btn-secondary">
                    Salvar bloco
                  </button>
                </div>
              </form>
              <form action={deleteLessonBlockAction.bind(null, lessonId, block.id)}>
                <button type="submit" className="btn btn-secondary">
                  Remover bloco
                </button>
              </form>
            </div>
          ))}
        </div>

        <details className="card">
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Adicionar bloco</summary>
          <form
            action={createLessonBlockAction.bind(null, lessonId)}
            className="stack"
            style={{ marginTop: "var(--space-4)" }}
          >
            <div className="form-grid">
              <div className="field">
                <label htmlFor="order">Posição</label>
                <input
                  id="order"
                  name="order"
                  type="number"
                  className="text-input"
                  defaultValue={lesson.blocks.length}
                />
              </div>
              <div className="field">
                <label htmlFor="new-type">Tipo</label>
                <select id="new-type" name="type" className="text-input" required>
                  {BLOCK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {blockTypeLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field field--full">
              <label htmlFor="content">Conteúdo (para blocos não-QUESTION)</label>
              <textarea id="content" name="content" className="text-input" rows={3} />
            </div>
            <div className="field field--full">
              <label htmlFor="questionId">Questão (só para blocos QUESTION)</label>
              <select id="questionId" name="questionId" className="text-input" defaultValue="">
                <option value="">— nenhuma —</option>
                {publishedQuestions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.prompt.slice(0, 80)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: "start" }}>
              Adicionar
            </button>
          </form>
        </details>
      </div>

      <div className="card stack">
        <p className="card-title">Conhecimento relacionado</p>
        <div className="row-wrap">
          {lesson.knowledgeTags.map((t) => (
            <form
              key={`${t.entityType}-${t.entityId}`}
              action={unlinkLessonFromKnowledgeAction.bind(
                null,
                lessonId,
                t.entityType,
                t.entityId,
              )}
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
          action={linkLessonToKnowledgeAction.bind(null, lessonId)}
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
        <p className="card-title">Procedência (Citation)</p>
        {citations.length === 0 ? (
          <p style={{ color: "var(--color-danger)" }}>
            Sem nenhuma citação — publicação será recusada.
          </p>
        ) : (
          <ul className="stack">
            {citations.map((c) => (
              <li key={c.id}>Fonte: {c.source.name}</li>
            ))}
          </ul>
        )}
        <CitationForm
          entityType="LESSON"
          entityId={lessonId}
          redirectPath={`/admin/pedagogy/lessons/${lessonId}`}
        />
      </div>

      <div className="card stack">
        <p className="card-title">Publicação</p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
          Exige ao menos um bloco e ao menos uma Citation vinculada à Lesson (mesmo gate de
          procedência do Módulo 2, aplicado a `Lesson` desde o Módulo 4).
        </p>
        <div className="admin-actions-row">
          {lesson.status !== "PUBLISHED" ? (
            <form action={publish}>
              <button type="submit" className="btn btn-primary">
                Publicar
              </button>
            </form>
          ) : null}
          {lesson.status !== "ARCHIVED" ? (
            <form action={archive}>
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
