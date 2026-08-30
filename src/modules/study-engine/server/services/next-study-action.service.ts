/**
 * Geradores de candidato de ação (Módulo 10, seções 4/7-16/21) — cada
 * função devolve 0+ `NextStudyAction` para UMA camada da hierarquia,
 * sempre delegando o cálculo real ao módulo autoridade correspondente
 * (nunca reimplementa SM-2, diagnóstico, correção, mastery, publicação —
 * seção 35 do prompt). `study-plan.service.ts` compõe estes geradores e
 * aplica a política de prioridade (`policies/priority.ts`).
 */
import { Actor } from "@/server/auth/authorize";
import { KnowledgeEntityType, PublicationStatus } from "@/generated/prisma/enums";
import {
  MAX_REVIEW_OVERDUE_ITEMS_IN_PLAN,
  RECENT_QUESTIONS_SAMPLE_SIZE,
  STUDY_ACTION_PRIORITY,
} from "@/config/study-engine";
import {
  emptyActionRefs,
  type NextStudyAction,
} from "@/modules/study-engine/types/next-study-action";
import { getReviewQueue } from "@/modules/review/server/services/reviewQueue.service";
import { getNextLearningStep } from "@/modules/pedagogy/server/services/next-learning-step.service";
import { listQuestions } from "@/modules/assessment/server/services/questionQuery.service";
import { getNextSimulationRecommendation } from "@/modules/simulation/server/services/simulation-recommendation.service";
import { getComplementaryContentForConcept } from "@/modules/curation/server/services/complementary-content.service";
import { listLibraryByDiscipline } from "@/modules/curation/server/services/library-query.service";
import { getCurrentAffairsByDiscipline } from "@/modules/curation/server/services/current-affairs-query.service";
import { findInterdisciplinaryConnections } from "@/modules/study-engine/server/queries/interdisciplinary";

function action(
  partial: Partial<ReturnType<typeof emptyActionRefs>> &
    Pick<NextStudyAction, "type" | "reason" | "priority"> & { metadata?: Record<string, unknown> },
): NextStudyAction {
  return { ...emptyActionRefs(), ...partial };
}

/** Diagnóstico ainda não concluído (seção 5) — ação única, sem referência a nenhuma entidade. */
export function generateDiagnosticAction(): NextStudyAction {
  return action({
    type: "START_DIAGNOSTIC",
    reason:
      "Você ainda não concluiu o diagnóstico inicial — ele identifica seu nível, conceitos fortes/fracos e o ponto de partida ideal.",
    priority: STUDY_ACTION_PRIORITY.START_DIAGNOSTIC,
  });
}

/**
 * Revisão vencida (seção 4.3/7) — autoridade é `getReviewQueue` (Módulo 5);
 * aqui só se converte cada entrada da fila em `NextStudyAction`, sem
 * recalcular prioridade/estado/intervalo.
 */
export async function generateReviewOverdueActions(
  actor: Actor,
  targetUserId: string,
): Promise<NextStudyAction[]> {
  const overdue = await getReviewQueue(actor, targetUserId, {
    overdueOnly: true,
    limit: MAX_REVIEW_OVERDUE_ITEMS_IN_PLAN,
  });

  return overdue.map((entry) =>
    action({
      type: "REVIEW",
      reason: entry.reason,
      priority: STUDY_ACTION_PRIORITY.REVIEW_OVERDUE,
      conceptId: entry.reviewItem.conceptId,
      questionId: entry.reviewItem.questionId,
      trackId: entry.pedagogy.trackIds[0] ?? null,
      areaId: entry.pedagogy.areaIds[0] ?? null,
      unitId: entry.pedagogy.unitIds[0] ?? null,
      stageId: entry.pedagogy.stageIds[0] ?? null,
      lessonId: entry.pedagogy.lessonIds[0] ?? null,
      metadata: { reviewItemId: entry.reviewItem.id, state: entry.reviewItem.state },
    }),
  );
}

/**
 * Próxima lição (seção 4.2/4.5/9) — autoridade é `getNextLearningStep`
 * (Módulo 8). Quando `preferredTrackId` (trilha do conceito fraco) resolve
 * uma lição de verdade, a razão é enriquecida para explicar o motivo
 * "seção 4.5: lição relacionada ao conceito fraco"; senão cai no caso
 * genérico "seção 4.2: próxima lição desbloqueada".
 */
export async function generateLessonAction(
  actor: Actor,
  targetUserId: string,
  options?: { preferredTrackId?: string; relatedToWeakConceptId?: string },
): Promise<NextStudyAction | null> {
  let usedPreferredTrack = false;
  let resolved = options?.preferredTrackId
    ? await getNextLearningStep(actor, targetUserId, { trackId: options.preferredTrackId })
    : null;
  if (resolved) {
    usedPreferredTrack = true;
  } else {
    resolved = await getNextLearningStep(actor, targetUserId);
  }
  if (!resolved) return null;

  const reason =
    usedPreferredTrack && options?.relatedToWeakConceptId
      ? `Relacionada ao conceito com desempenho mais baixo — ${resolved.reason}`
      : resolved.reason;

  return action({
    type: "LESSON",
    reason,
    priority: STUDY_ACTION_PRIORITY.LESSON,
    conceptId: usedPreferredTrack ? (options?.relatedToWeakConceptId ?? null) : null,
    trackId: resolved.track.id,
    areaId: resolved.area.id,
    unitId: resolved.unit.id,
    stageId: resolved.stage.id,
    lessonId: resolved.lesson.id,
  });
}

/**
 * Questões recentes relacionadas a um conceito (seção 4.6/10/11/12) —
 * autoridade é `listQuestions` (Módulo 3/6), já ordenada por
 * `examEdition.year desc` (mais recente primeiro). Só publicadas
 * (`reviewStatus: PUBLISHED`) — nunca rascunho (seção 30), e toda `Question`
 * tem `sourceId` obrigatório desde o Módulo 1 (nunca sem procedência).
 */
export async function generateRecentQuestionAction(
  conceptId: string,
): Promise<NextStudyAction | null> {
  const questions = await listQuestions({
    conceptId,
    reviewStatus: PublicationStatus.PUBLISHED,
    take: RECENT_QUESTIONS_SAMPLE_SIZE,
  });
  if (questions.length === 0) return null;

  const mostRecent = questions[0];
  const reason = mostRecent.examEdition
    ? `Existem questões recentes (${mostRecent.examEdition.year}) relacionadas a este conceito.`
    : "Existem questões relacionadas a este conceito.";

  return action({
    type: "QUESTION",
    reason,
    priority: STUDY_ACTION_PRIORITY.QUESTION_RECENT,
    conceptId,
    questionId: mostRecent.id,
    metadata: { sampleSize: questions.length, relatedQuestionIds: questions.map((q) => q.id) },
  });
}

/**
 * Simulado recomendado (seção 4.7/13) — autoridade é
 * `getNextSimulationRecommendation` (Módulo 6), que sempre devolve algo
 * (nunca `null` — tem um fallback neutro). `simulationId` fica `null`: a
 * recomendação descreve CONFIGURAÇÃO para um simulado a montar, não uma
 * `Simulation` já existente (o Módulo 6 não cria conteúdo novo por conta
 * própria, seção 20 do prompt dele).
 */
export async function generateSimulationAction(
  actor: Actor,
  targetUserId: string,
): Promise<NextStudyAction> {
  const rec = await getNextSimulationRecommendation(actor, targetUserId);
  return action({
    type: "SIMULATION",
    reason: rec.reason,
    priority: STUDY_ACTION_PRIORITY.SIMULATION,
    disciplineId: rec.primaryDisciplineId,
    metadata: {
      count: rec.count,
      difficulty: rec.difficulty,
      primaryShare: rec.primaryShare,
      secondaryShare: rec.secondaryShare,
    },
  });
}

/**
 * Conteúdo complementar do próprio conceito (seção 4.8-10/14/16) —
 * autoridade é `getComplementaryContentForConcept` (Módulo 7), que já só
 * devolve `LibraryItem`/`CurrentAffair` PUBLICADOS. Livro gratuito
 * preferido sobre pago (seção 14: "priorizar... gratuitos, com acesso
 * legal"); atualidade mais recente primeiro (`eventDate desc`, já é o
 * padrão do Módulo 7 — nunca `createdAt`, seção 16).
 */
export async function generateComplementaryActions(conceptId: string): Promise<NextStudyAction[]> {
  const bundle = await getComplementaryContentForConcept(conceptId, { take: 5 });
  const actions: NextStudyAction[] = [];

  const libraryItem = bundle.libraryItems.find((item) => item.isFree) ?? bundle.libraryItems[0];
  if (libraryItem) {
    actions.push(
      action({
        type: "LIBRARY",
        reason: libraryItem.isFree
          ? "Material gratuito relacionado a este conceito, com acesso legal."
          : "Material da biblioteca relacionado a este conceito.",
        priority: STUDY_ACTION_PRIORITY.LIBRARY,
        conceptId,
        libraryItemId: libraryItem.id,
      }),
    );
  }

  const currentAffair = bundle.currentAffairs[0];
  if (currentAffair) {
    actions.push(
      action({
        type: "CURRENT_AFFAIR",
        reason: "Atualidade recente relacionada a este conceito.",
        priority: STUDY_ACTION_PRIORITY.CURRENT_AFFAIR,
        conceptId,
        currentAffairId: currentAffair.id,
        metadata: { eventDate: currentAffair.eventDate },
      }),
    );
  }

  return actions;
}

/**
 * Conteúdo interdisciplinar (seção 15) — só entra em jogo quando existe uma
 * `AcademicRelation` PUBLICADA real ligando o conceito a outra disciplina
 * (`findInterdisciplinaryConnections`); nunca inventa uma associação porque
 * dois assuntos "parecem relacionados". Escopo desta versão: relações cujo
 * outro lado é `DISCIPLINE` (o exemplo do prompt — Psicologia Social ↔
 * Sociologia/Filosofia/Antropologia — é sempre entre disciplinas
 * inteiras); relações concept↔concept dentro da MESMA árvore pedagógica já
 * são cobertas por `getPedagogicalContextForConcepts` em outros geradores.
 */
export async function generateInterdisciplinaryActions(
  conceptId: string,
): Promise<NextStudyAction[]> {
  const connections = await findInterdisciplinaryConnections(conceptId);
  const disciplineConnections = connections.filter(
    (c) => c.entityType === KnowledgeEntityType.DISCIPLINE,
  );

  const actions: NextStudyAction[] = [];
  for (const connection of disciplineConnections) {
    const [libraryItems, currentAffairs] = await Promise.all([
      listLibraryByDiscipline(connection.entityId, { take: 1 }),
      getCurrentAffairsByDiscipline(connection.entityId, { take: 1 }),
    ]);

    if (libraryItems[0]) {
      actions.push(
        action({
          type: "LIBRARY",
          reason: `Conteúdo interdisciplinar (relação "${connection.relationType}" com outra disciplina) relacionado a este conceito.`,
          priority: STUDY_ACTION_PRIORITY.LIBRARY,
          conceptId,
          disciplineId: connection.entityId,
          libraryItemId: libraryItems[0].id,
        }),
      );
    }
    if (currentAffairs[0]) {
      actions.push(
        action({
          type: "CURRENT_AFFAIR",
          reason: `Atualidade interdisciplinar (relação "${connection.relationType}" com outra disciplina) relacionada a este conceito.`,
          priority: STUDY_ACTION_PRIORITY.CURRENT_AFFAIR,
          conceptId,
          disciplineId: connection.entityId,
          currentAffairId: currentAffairs[0].id,
        }),
      );
    }
  }
  return actions;
}
