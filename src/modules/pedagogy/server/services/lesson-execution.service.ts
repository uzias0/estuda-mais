/**
 * Execução de lição pelo estudante (Módulo 8, seções 12-18) — transforma a
 * `Lesson`/`LessonBlock` do Módulo 4 (conteúdo curado) em progresso real de
 * um usuário. NÃO cria uma segunda estrutura de conteúdo nem uma
 * `LessonSession` própria: "sessão" aqui é só a leitura do `LessonProgress` +
 * `LessonBlockCompletion` já persistidos — não existe uma entidade
 * "sessão" separada (seção 12 do prompt do módulo: "verifique se
 * StudySession já pode representar... não crie LessonSession
 * desnecessariamente"). `StudySession` também não serve: só tem `stageId`
 * (não `lessonId`) e nenhuma granularidade por bloco — persistir progresso
 * por bloco exige `LessonBlockCompletion`, que não existe em nenhum outro
 * lugar do schema (ver docs/MODULO-8.md, "Análise inicial").
 *
 * Correção de atividades (blocos QUESTION) reaproveita INTEGRALMENTE o
 * mecanismo do Módulo 3 (`recordAttempt` → `gradeAnswer`) — nenhuma segunda
 * lógica de correção é criada aqui (seção 10/11).
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import {
  AttemptContext,
  BlockType,
  LessonProgressStatus,
  PublicationStatus,
} from "@/generated/prisma/enums";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { recordAttempt } from "@/modules/assessment/server/services/questionAttempt.service";
import { LessonExecutionError } from "./errors";
import { assertOwnLearningDataOrAdmin } from "./learning-privacy";
import { computeLessonProgressSummary, type LessonProgressSummary } from "./lesson-progress";
import {
  SubmitLessonActivityInputSchema,
  type SubmitLessonActivityInput,
} from "@/modules/pedagogy/types/lesson-execution.schema";

async function assertLessonPublishedForExecution(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new NotFoundError(`Lesson "${lessonId}" não encontrada.`);
  if (lesson.status !== PublicationStatus.PUBLISHED) {
    throw new LessonExecutionError(
      "Esta lição não está publicada — só conteúdo PUBLISHED pode ser executado.",
    );
  }
  return lesson;
}

/** Busca (sem escrever nada) o resumo de progresso atual — usado por toda leitura/decisão deste serviço. */
async function loadLessonProgressSummary(
  lessonId: string,
  lessonProgressId: string,
): Promise<LessonProgressSummary> {
  const [blocks, completions] = await Promise.all([
    prisma.lessonBlock.findMany({ where: { lessonId }, select: { id: true, order: true } }),
    prisma.lessonBlockCompletion.findMany({ where: { lessonProgressId } }),
  ]);
  const completedBlockIds = new Set(completions.map((c) => c.lessonBlockId));
  const totalActivities = completions.filter((c) => c.isCorrect !== null).length;
  const correctActivities = completions.filter((c) => c.isCorrect === true).length;
  return computeLessonProgressSummary({
    blocks,
    completedBlockIds,
    counters: { totalActivities, correctActivities },
  });
}

/**
 * Grava o status/contadores derivados. `completedAt`/`masteredAt` só são
 * setados na PRIMEIRA vez que o respectivo status é alcançado (seção 40/41:
 * idempotência) — chamadas repetidas com o mesmo conjunto de blocos
 * concluídos sempre convergem para o mesmo resultado, nunca sobrescrevem uma
 * data já gravada.
 */
async function persistLessonProgressSummary(
  lessonProgressId: string,
  summary: LessonProgressSummary,
  current: { completedAt: Date | null; masteredAt: Date | null },
) {
  const now = new Date();
  const reachedCompletion =
    summary.status === LessonProgressStatus.COMPLETED ||
    summary.status === LessonProgressStatus.MASTERED;
  const reachedMastery = summary.status === LessonProgressStatus.MASTERED;

  return prisma.lessonProgress.update({
    where: { id: lessonProgressId },
    data: {
      status: summary.status,
      totalActivities: summary.totalActivities,
      correctActivities: summary.correctActivities,
      lastActivityAt: now,
      completedAt: reachedCompletion ? (current.completedAt ?? now) : current.completedAt,
      masteredAt: reachedMastery ? (current.masteredAt ?? now) : current.masteredAt,
    },
  });
}

function toLessonSessionView(
  lessonId: string,
  progress: {
    id: string;
    startedAt: Date | null;
    completedAt: Date | null;
    masteredAt: Date | null;
  },
  summary: LessonProgressSummary,
) {
  return {
    lessonId,
    lessonProgressId: progress.id,
    startedAt: progress.startedAt,
    completedAt: progress.completedAt,
    masteredAt: progress.masteredAt,
    ...summary,
  };
}

/**
 * Inicia (ou retoma) a execução de uma lição publicada (seção 14). Não
 * reinicia progresso existente — chamar de novo numa lição já em andamento
 * simplesmente devolve o estado atual (seção 15: "continuar, não reiniciar
 * obrigatoriamente").
 */
export async function startLesson(actor: Actor, lessonId: string) {
  await assertLessonPublishedForExecution(lessonId);

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: actor.userId, lessonId } },
    create: {
      userId: actor.userId,
      lessonId,
      status: LessonProgressStatus.NOT_STARTED,
      startedAt: new Date(),
    },
    update: {},
  });

  const summary = await loadLessonProgressSummary(lessonId, progress.id);
  return toLessonSessionView(lessonId, progress, summary);
}

/**
 * Responde/consome um bloco da lição (seção 10/11/16/17). Blocos QUESTION
 * exigem `answerData`/`timeSpentMs` e são corrigidos de verdade via
 * `recordAttempt` (contexto `AttemptContext.LESSON`, reservado exatamente
 * para isto desde o Módulo 3); os demais tipos só marcam consumo (não há
 * "resposta" a corrigir). Reenviar um bloco já concluído é idempotente: não
 * gera uma segunda `QuestionAttempt` nem duplica o registro de conclusão
 * (protegido pelo `@@unique([lessonProgressId, lessonBlockId])` do schema).
 *
 * Concorrência (seção 41): a checagem de "já concluído" e a gravação da
 * conclusão não formam uma única transação atômica com `recordAttempt`
 * (que abre sua própria transação internamente, no Módulo 3) — numa janela
 * de corrida muito estreita, duas submissões simultâneas do MESMO bloco
 * ainda não concluído podem gerar duas `QuestionAttempt`, mas o
 * `@@unique` garante que só UMA `LessonBlockCompletion` sobrevive, e o
 * recálculo de `LessonProgress` é sempre determinístico a partir do
 * conjunto de conclusões final — o estado de progresso nunca fica
 * inconsistente, só uma tentativa extra pode ficar registrada nas
 * estatísticas. Documentado como limitação conhecida (docs/MODULO-8.md).
 */
export async function submitLessonActivity(actor: Actor, input: SubmitLessonActivityInput) {
  const data = SubmitLessonActivityInputSchema.parse(input);
  await assertLessonPublishedForExecution(data.lessonId);

  const block = await prisma.lessonBlock.findUnique({ where: { id: data.blockId } });
  if (!block) throw new NotFoundError(`LessonBlock "${data.blockId}" não encontrado.`);
  if (block.lessonId !== data.lessonId) {
    throw new LessonExecutionError("Este bloco não pertence à lição informada.");
  }

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: actor.userId, lessonId: data.lessonId } },
  });
  if (!progress) {
    throw new LessonExecutionError(
      "Esta lição ainda não foi iniciada — chame startLesson antes de responder atividades.",
    );
  }

  const existingCompletion = await prisma.lessonBlockCompletion.findUnique({
    where: {
      lessonProgressId_lessonBlockId: { lessonProgressId: progress.id, lessonBlockId: block.id },
    },
  });

  let isCorrect: boolean | null = existingCompletion?.isCorrect ?? null;
  let questionAttemptId: string | undefined = existingCompletion?.questionAttemptId ?? undefined;
  let explanation: string | null = null;

  if (!existingCompletion && block.type === BlockType.QUESTION) {
    if (!block.questionId) {
      throw new LessonExecutionError(
        "Bloco QUESTION sem questionId associado — conteúdo inconsistente.",
      );
    }
    if (data.answerData === undefined || data.timeSpentMs === undefined) {
      throw new LessonExecutionError(
        "Este bloco é uma atividade avaliativa — answerData e timeSpentMs são obrigatórios.",
      );
    }
    const result = await recordAttempt(actor, {
      questionId: block.questionId,
      answerData: data.answerData,
      timeSpentMs: data.timeSpentMs,
      context: AttemptContext.LESSON,
    });
    isCorrect = result.isCorrect;
    questionAttemptId = result.attempt.id;
    explanation = result.explanation;
  }

  await prisma.lessonBlockCompletion.upsert({
    where: {
      lessonProgressId_lessonBlockId: { lessonProgressId: progress.id, lessonBlockId: block.id },
    },
    create: {
      lessonProgressId: progress.id,
      lessonBlockId: block.id,
      isCorrect,
      questionAttemptId,
    },
    update: {},
  });

  const summary = await loadLessonProgressSummary(data.lessonId, progress.id);
  const updated = await persistLessonProgressSummary(progress.id, summary, {
    completedAt: progress.completedAt,
    masteredAt: progress.masteredAt,
  });

  return {
    ...toLessonSessionView(data.lessonId, updated, summary),
    block: { id: block.id, type: block.type },
    isCorrect,
    explanation,
  };
}

/**
 * Conclusão explícita da lição (seção 16) — o servidor recalcula tudo a
 * partir dos blocos realmente concluídos; nunca aceita `{ completed: true }`
 * como prova (seção 39). Rejeita se ainda houver bloco pendente. Idempotente:
 * chamar de novo numa lição já concluída só devolve o mesmo estado final.
 */
export async function completeLesson(actor: Actor, lessonId: string) {
  await assertLessonPublishedForExecution(lessonId);

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: actor.userId, lessonId } },
  });
  if (!progress) {
    throw new LessonExecutionError("Esta lição ainda não foi iniciada.");
  }

  const summary = await loadLessonProgressSummary(lessonId, progress.id);
  if (summary.blocksCompleted < summary.blocksTotal) {
    throw new LessonExecutionError(
      `Ainda restam ${summary.blocksTotal - summary.blocksCompleted} bloco(s) pendente(s) — não é possível concluir a lição.`,
    );
  }

  const updated = await persistLessonProgressSummary(progress.id, summary, {
    completedAt: progress.completedAt,
    masteredAt: progress.masteredAt,
  });

  return toLessonSessionView(lessonId, updated, summary);
}

/**
 * Estado atual de execução (seção 12/14) — puramente leitura. Sem
 * `LessonProgress` ainda (lição nunca iniciada por este usuário), devolve o
 * estado inicial (NOT_STARTED, nenhum bloco concluído) sem gravar nada.
 * `targetUserId` só pode ser outro usuário quando `actor` for ADMIN (seção
 * 35/36 — privacidade dos dados de aprendizagem).
 */
export async function getLessonSession(
  actor: Actor,
  lessonId: string,
  targetUserId: string = actor.userId,
) {
  assertOwnLearningDataOrAdmin(actor, targetUserId);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, status: true },
  });
  if (!lesson) throw new NotFoundError(`Lesson "${lessonId}" não encontrada.`);

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: targetUserId, lessonId } },
  });

  if (!progress) {
    const blocks = await prisma.lessonBlock.findMany({
      where: { lessonId },
      select: { id: true, order: true },
    });
    const summary = computeLessonProgressSummary({
      blocks,
      completedBlockIds: new Set(),
      counters: { totalActivities: 0, correctActivities: 0 },
    });
    return {
      lessonId,
      lessonProgressId: null,
      startedAt: null,
      completedAt: null,
      masteredAt: null,
      ...summary,
    };
  }

  const summary = await loadLessonProgressSummary(lessonId, progress.id);
  return toLessonSessionView(lessonId, progress, summary);
}
