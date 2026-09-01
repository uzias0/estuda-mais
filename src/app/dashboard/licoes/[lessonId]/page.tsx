/**
 * Execução de lição (Módulo 11, seção 15) — busca a lição real (Módulo 4)
 * e o estado de progresso real (Módulo 8, leitura pura — `getLessonSession`
 * nunca escreve nada) e entrega tudo pronto ao `LessonRunner`. Perguntas de
 * blocos QUESTION passam por `toPublicQuestionView` (Módulo 3/6) antes de
 * chegar ao cliente — nunca `isCorrect`/`answerKey` (seção 11).
 */
import { requireSessionActor } from "@/server/auth/session";
import { getLesson } from "@/modules/pedagogy/server/services/lesson.service";
import { getQuestion } from "@/modules/assessment/server/services/question.service";
import { toPublicQuestionView } from "@/modules/assessment/server/services/questionQuery.service";
import { getLessonSession } from "@/modules/pedagogy/server/services/lesson-execution.service";
import { getHeartsState } from "@/modules/gamification/server/services/hearts.service";
import { getGemBalanceForActor } from "@/modules/gamification/server/services/gems.service";
import { LessonRunner, type LessonBlockData } from "@/components/LessonRunner";
import { EmptyState } from "@/components/EmptyState";
import { resolveCharacterForLesson } from "@/lib/characters";

export default async function LessonPage({ params }: PageProps<"/dashboard/licoes/[lessonId]">) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);

  if (!lesson || lesson.status !== "PUBLISHED") {
    return (
      <div className="page-container">
        <EmptyState title="Esta lição não está disponível." />
      </div>
    );
  }

  const blocks: LessonBlockData[] = await Promise.all(
    lesson.blocks.map(async (block) => {
      let question = null;
      if (block.type === "QUESTION" && block.questionId) {
        const full = await getQuestion(block.questionId);
        question = full ? toPublicQuestionView(full) : null;
      }
      return {
        id: block.id,
        order: block.order,
        type: block.type,
        content: block.content,
        question,
      };
    }),
  );

  const actor = await requireSessionActor();
  const [session, character, hearts, gemBalance] = await Promise.all([
    getLessonSession(actor, lessonId),
    resolveCharacterForLesson(lesson),
    getHeartsState(actor),
    getGemBalanceForActor(actor),
  ]);

  return (
    <div className="page-container">
      <LessonRunner
        lessonId={lessonId}
        lessonTitle={lesson.title}
        blocks={blocks}
        character={character}
        initialHearts={hearts}
        initialGemBalance={gemBalance}
        initialSession={{
          status: session.status,
          blocksTotal: session.blocksTotal,
          blocksCompleted: session.blocksCompleted,
          percentage: session.percentage,
          currentBlock: session.currentBlock,
          accuracy: session.accuracy,
        }}
      />
    </div>
  );
}
