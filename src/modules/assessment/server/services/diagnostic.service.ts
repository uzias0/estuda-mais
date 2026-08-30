/**
 * Diagnóstico inicial (Módulo 3, seção 21-31) — a mini prova que descobre
 * aproximadamente onde o aluno deve começar. Reaproveita integralmente
 * `Question`/`QuestionAttempt` (seção 22: "não duplicar Question"); a única
 * peça nova de schema foi `AttemptContext.DIAGNOSTIC`. O "resultado
 * diagnóstico" NÃO é uma entidade persistida — é computado determinística e
 * repetidamente a partir dos `QuestionAttempt` gravados para a
 * `StudySession` que representa a rodada (seção 27: "determinístico a
 * partir dos dados armazenados").
 */
import { prisma } from "@/server/db";
import { Actor } from "@/server/auth/authorize";
import {
  AttemptContext,
  KnowledgeEntityType,
  PublicationStatus,
  StudyMode,
} from "@/generated/prisma/enums";
import {
  DIAGNOSTIC_QUESTION_COUNT,
  DIAGNOSTIC_DIFFICULTY_WEIGHTS,
  DIAGNOSTIC_MAX_QUESTIONS_PER_CONCEPT,
  percentageToMasteryLevel,
  WEAK_CONCEPT_THRESHOLD,
  STRONG_CONCEPT_THRESHOLD,
} from "@/config/diagnostic";
import { recordAttempt } from "./questionAttempt.service";
import { toPublicQuestionView } from "./questionQuery.service";
import { NotFoundError } from "@/modules/curation/server/services/publicationPolicy";
import { DiagnosticError } from "./errors";
import type { AttemptAnswerData } from "@/modules/assessment/types/question-attempt.schema";

type CandidateQuestion = Awaited<ReturnType<typeof fetchCandidateQuestions>>[number];

function fetchCandidateQuestions() {
  return prisma.question.findMany({
    where: { reviewStatus: PublicationStatus.PUBLISHED, knowledgeTags: { some: {} } },
    include: { options: true, knowledgeTags: true },
  });
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function primaryConceptId(question: CandidateQuestion): string | undefined {
  return question.knowledgeTags.find((t) => t.entityType === KnowledgeEntityType.CONCEPT)?.entityId;
}

/**
 * Seleciona até `count` questões, distribuídas por dificuldade
 * (`DIAGNOSTIC_DIFFICULTY_WEIGHTS`) e limitando quantas vêm do mesmo
 * conceito (`DIAGNOSTIC_MAX_QUESTIONS_PER_CONCEPT`) — seções 25/26/30.
 * Evita repetir questões que este usuário já viu em diagnósticos anteriores,
 * quando o banco tiver alternativas suficientes; caso contrário, permite
 * repetição (documentado — banco pequeno é esperado neste módulo, sem
 * conteúdo real).
 */
async function selectDiagnosticQuestions(
  actor: Actor,
  count: number,
): Promise<CandidateQuestion[]> {
  const candidates = await fetchCandidateQuestions();
  if (candidates.length === 0) {
    throw new DiagnosticError(
      "Não há questões publicadas e associadas a conhecimento suficientes para montar o diagnóstico.",
    );
  }

  const previouslyAttempted = new Set(
    (
      await prisma.questionAttempt.findMany({
        where: { userId: actor.userId, context: AttemptContext.DIAGNOSTIC },
        select: { questionId: true },
      })
    ).map((a) => a.questionId),
  );
  const freshPool = candidates.filter((q) => !previouslyAttempted.has(q.id));
  const pool = freshPool.length >= Math.min(count, candidates.length) ? freshPool : candidates;

  const byDifficulty = new Map<string, CandidateQuestion[]>();
  for (const q of pool) {
    const bucket = byDifficulty.get(q.difficulty) ?? [];
    bucket.push(q);
    byDifficulty.set(q.difficulty, bucket);
  }

  const selected: CandidateQuestion[] = [];
  const selectedIds = new Set<string>();
  const conceptCounts = new Map<string, number>();

  function tryAdd(q: CandidateQuestion): boolean {
    if (selectedIds.has(q.id)) return false;
    const conceptId = primaryConceptId(q);
    if (conceptId && (conceptCounts.get(conceptId) ?? 0) >= DIAGNOSTIC_MAX_QUESTIONS_PER_CONCEPT) {
      return false;
    }
    selected.push(q);
    selectedIds.add(q.id);
    if (conceptId) conceptCounts.set(conceptId, (conceptCounts.get(conceptId) ?? 0) + 1);
    return true;
  }

  for (const [level, weight] of Object.entries(DIAGNOSTIC_DIFFICULTY_WEIGHTS)) {
    const target = Math.round(count * weight);
    let added = 0;
    for (const q of shuffle(byDifficulty.get(level) ?? [])) {
      if (added >= target || selected.length >= count) break;
      if (tryAdd(q)) added++;
    }
  }
  // completa o restante respeitando a diversidade de conceito quando possível
  if (selected.length < count) {
    for (const q of shuffle(pool)) {
      if (selected.length >= count) break;
      tryAdd(q);
    }
  }
  // banco pequeno demais para respeitar o teto de diversidade — relaxa e completa
  if (selected.length < count) {
    for (const q of shuffle(pool)) {
      if (selected.length >= count) break;
      if (!selectedIds.has(q.id)) {
        selected.push(q);
        selectedIds.add(q.id);
      }
    }
  }

  return selected;
}

// `toPublicQuestionView` foi extraída para `questionQuery.service.ts` no
// Módulo 6 (era duplicada aqui e em `review/reviewSession.service.ts`).

/** Inicia uma rodada de diagnóstico: seleciona questões e abre uma `StudySession` para agrupá-las. */
export async function startDiagnostic(
  actor: Actor,
  questionCount: number = DIAGNOSTIC_QUESTION_COUNT,
) {
  const questions = await selectDiagnosticQuestions(actor, questionCount);
  const session = await prisma.studySession.create({
    data: { userId: actor.userId, mode: StudyMode.FORMACAO },
  });
  return {
    sessionId: session.id,
    questions: questions.map(toPublicQuestionView),
  };
}

async function assertOwnOpenDiagnosticSession(actor: Actor, sessionId: string) {
  const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError(`StudySession "${sessionId}" não encontrada.`);
  if (session.userId !== actor.userId) {
    throw new DiagnosticError("Esta sessão de diagnóstico pertence a outro usuário.");
  }
  return session;
}

/**
 * Registra a resposta de uma questão do diagnóstico. `isCorrect` é sempre
 * calculado pelo servidor (delegado a `questionAttempt.service.recordAttempt`)
 * — o cliente só envia a resposta escolhida (seção 31).
 */
export async function submitDiagnosticAnswer(
  actor: Actor,
  params: {
    sessionId: string;
    questionId: string;
    answerData: AttemptAnswerData;
    timeSpentMs: number;
  },
) {
  const session = await assertOwnOpenDiagnosticSession(actor, params.sessionId);
  if (session.endedAt) {
    throw new DiagnosticError(
      "Este diagnóstico já foi finalizado — não é possível responder mais questões.",
    );
  }

  const already = await prisma.questionAttempt.findFirst({
    where: { sessionId: params.sessionId, questionId: params.questionId },
  });
  if (already) {
    throw new DiagnosticError("Esta questão já foi respondida nesta rodada de diagnóstico.");
  }

  return recordAttempt(actor, {
    questionId: params.questionId,
    answerData: params.answerData,
    timeSpentMs: params.timeSpentMs,
    context: AttemptContext.DIAGNOSTIC,
    sessionId: params.sessionId,
  });
}

/**
 * Calcula o resultado do diagnóstico — puramente a partir dos
 * `QuestionAttempt` gravados para `sessionId`. Determinístico: chamar de
 * novo com os mesmos dados sempre devolve o mesmo resultado (seção 27).
 */
export async function getDiagnosticResult(actor: Actor, sessionId: string) {
  await assertOwnOpenDiagnosticSession(actor, sessionId);

  const attempts = await prisma.questionAttempt.findMany({
    where: { sessionId, context: AttemptContext.DIAGNOSTIC },
    include: { question: { include: { knowledgeTags: true } } },
  });

  const questionsAnswered = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const percentage = questionsAnswered === 0 ? 0 : (correctCount / questionsAnswered) * 100;
  const level = percentageToMasteryLevel(percentage);

  const conceptStats = new Map<string, { correct: number; total: number }>();
  for (const attempt of attempts) {
    const conceptIds = attempt.question.knowledgeTags
      .filter((t) => t.entityType === KnowledgeEntityType.CONCEPT)
      .map((t) => t.entityId);
    for (const conceptId of conceptIds) {
      const stats = conceptStats.get(conceptId) ?? { correct: 0, total: 0 };
      stats.total += 1;
      if (attempt.isCorrect) stats.correct += 1;
      conceptStats.set(conceptId, stats);
    }
  }

  const strongConceptIds: string[] = [];
  const weakConceptIds: string[] = [];
  for (const [conceptId, stats] of conceptStats) {
    const conceptPercentage = (stats.correct / stats.total) * 100;
    if (conceptPercentage >= STRONG_CONCEPT_THRESHOLD) strongConceptIds.push(conceptId);
    else if (conceptPercentage <= WEAK_CONCEPT_THRESHOLD) weakConceptIds.push(conceptId);
  }

  // Recomendação de ponto de partida — só um resultado de domínio (seção 28):
  // NÃO gera trilha/Stage/Unit, apenas aponta os conceitos mais indicados
  // para começar. A construção da trilha em si é do Módulo 4.
  const recommendation = {
    level,
    startingConceptIds: weakConceptIds.length > 0 ? weakConceptIds : [],
    note:
      questionsAnswered === 0
        ? "Nenhuma questão respondida ainda."
        : weakConceptIds.length > 0
          ? "Recomenda-se iniciar revisando os conceitos identificados como lacuna antes de avançar."
          : "Bom domínio geral na amostra respondida — pode iniciar em conteúdo mais avançado.",
  };

  return {
    sessionId,
    questionsAnswered,
    correctCount,
    percentage: Math.round(percentage * 100) / 100,
    level,
    strongConceptIds,
    weakConceptIds,
    recommendation,
  };
}

/** Marca a `StudySession` do diagnóstico como encerrada e devolve o resultado final. */
export async function finishDiagnostic(actor: Actor, sessionId: string) {
  const session = await assertOwnOpenDiagnosticSession(actor, sessionId);
  if (!session.endedAt) {
    await prisma.studySession.update({ where: { id: sessionId }, data: { endedAt: new Date() } });
  }
  return getDiagnosticResult(actor, sessionId);
}
