export const dynamic = "force-dynamic";
import { listSources } from "@/modules/curation/server/services/source.service";
import { listExamEditions } from "@/modules/assessment/server/services/examEdition.service";
import { createQuestionAction } from "@/server/actions/admin/questions-actions";
import { QuestionForm } from "@/components/admin/QuestionForm";

export default async function NewQuestionPage() {
  const [sources, examEditions] = await Promise.all([
    listSources({ take: 200 }),
    listExamEditions({ take: 200 }),
  ]);

  return (
    <div className="page-container stack">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Nova questão</h1>
      <QuestionForm action={createQuestionAction} sources={sources} examEditions={examEditions} />
    </div>
  );
}
