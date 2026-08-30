/**
 * Orquestração do plano de estudo (Módulo 10, seções 3/5/6/18/21) — compõe
 * os geradores de candidato (`next-study-action.service.ts`) e a política
 * de prioridade (`policies/priority.ts`). Consulta pura: nenhuma escrita,
 * nenhum estado criado só porque o aluno abriu o plano (seção 28).
 */
import { Actor } from "@/server/auth/authorize";
import { DEFAULT_STUDY_PLAN_SIZE } from "@/config/study-engine";
import type { NextStudyAction } from "@/modules/study-engine/types/next-study-action";
import { getPedagogicalContextForConcepts } from "@/modules/pedagogy/server/services/pedagogy-query.service";
import { findLatestFinishedDiagnosticSessionId } from "@/modules/study-engine/server/queries/diagnostic-lookup";
import { getCurrentWeakConcepts } from "@/modules/study-engine/server/queries/weak-concepts";
import { buildStudyPlan } from "@/modules/study-engine/server/policies/priority";
import { assertOwnStudyPlanDataOrAdmin } from "./privacy";
import {
  generateDiagnosticAction,
  generateReviewOverdueActions,
  generateLessonAction,
  generateRecentQuestionAction,
  generateSimulationAction,
  generateComplementaryActions,
  generateInterdisciplinaryActions,
} from "./next-study-action.service";

export interface StudyPlanOptions {
  size?: number;
}

/**
 * Plano de estudo completo (seção 18) — hierarquia determinística (seção
 * 4/21, ver `src/config/study-engine.ts`):
 *
 * 1. Diagnóstico ainda não concluído → plano de UM item só (`START_DIAGNOSTIC`),
 *    nenhuma outra camada é avaliada (seção 5).
 * 2. Diagnóstico concluído (nunca recalculado — só delegado a
 *    `getDiagnosticResult` via `findLatestFinishedDiagnosticSessionId`,
 *    seção 5/11) → combina revisão vencida (Módulo 5), próxima lição
 *    (Módulo 8, com preferência pela trilha do conceito com pior
 *    desempenho, seção 8), questões recentes daquele conceito (Módulo 3/6),
 *    recomendação de simulado (Módulo 6), e conteúdo complementar —
 *    biblioteca/atualidade, incluindo interdisciplinar quando existir
 *    relação acadêmica real (Módulo 7/seção 15).
 * 3. Corte final: `buildStudyPlan` ordena por prioridade e limita a
 *    `options.size ?? DEFAULT_STUDY_PLAN_SIZE` (seção 19).
 */
export async function getStudyPlan(
  actor: Actor,
  targetUserId: string = actor.userId,
  options: StudyPlanOptions = {},
): Promise<NextStudyAction[]> {
  assertOwnStudyPlanDataOrAdmin(actor, targetUserId);

  const diagnosticSessionId = await findLatestFinishedDiagnosticSessionId(targetUserId);
  if (!diagnosticSessionId) {
    return [generateDiagnosticAction()];
  }

  const candidates: NextStudyAction[] = [];
  candidates.push(...(await generateReviewOverdueActions(actor, targetUserId)));

  const weakConcepts = await getCurrentWeakConcepts(targetUserId);
  const topWeakConceptId = weakConcepts[0]?.conceptId;

  let preferredTrackId: string | undefined;
  if (topWeakConceptId) {
    const context = await getPedagogicalContextForConcepts([topWeakConceptId]);
    preferredTrackId = context.trackIds[0];
  }

  const lessonAction = await generateLessonAction(actor, targetUserId, {
    preferredTrackId,
    relatedToWeakConceptId: topWeakConceptId,
  });
  if (lessonAction) candidates.push(lessonAction);

  if (topWeakConceptId) {
    const questionAction = await generateRecentQuestionAction(topWeakConceptId);
    if (questionAction) candidates.push(questionAction);
  }

  candidates.push(await generateSimulationAction(actor, targetUserId));

  if (topWeakConceptId) {
    candidates.push(...(await generateComplementaryActions(topWeakConceptId)));
    candidates.push(...(await generateInterdisciplinaryActions(topWeakConceptId)));
  }

  return buildStudyPlan(candidates, options.size ?? DEFAULT_STUDY_PLAN_SIZE);
}

/** "O que o aluno deve estudar AGORA?" (seção 3) — só o topo do plano. */
export async function getNextStudyAction(
  actor: Actor,
  targetUserId: string = actor.userId,
): Promise<NextStudyAction | null> {
  const plan = await getStudyPlan(actor, targetUserId, { size: 1 });
  return plan[0] ?? null;
}

/**
 * Primeiro acesso (seção 5) — o prompt do módulo pede um nome próprio para
 * este caso, mas a lógica é IDÊNTICA a `getStudyPlan` (o gate do
 * diagnóstico já é a primeira coisa avaliada ali, seja a primeira visita
 * do aluno ou a centésima sem nunca ter concluído o diagnóstico) — reusar
 * em vez de duplicar a mesma hierarquia sob outro nome.
 */
export const getInitialStudyPlan = getStudyPlan;
