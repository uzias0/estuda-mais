/**
 * Progresso acadêmico consolidado (Módulo 9, seções 21-26) — NÃO duplica
 * nenhuma lógica de progresso por Track/Area/Unit/Stage nem de mastery: já
 * existem no Módulo 8 (`learning-progress.service.ts`), aqui só
 * re-exportados. `getStudentProgress` é a única peça genuinamente nova —
 * compõe três "overviews" que já existiam (pedagogia/revisão/simulados) num
 * único retorno, sem recalcular nenhuma das três.
 */
import { Actor } from "@/server/auth/authorize";
import { getStudentLearningOverview } from "@/modules/pedagogy/server/services/learning-performance.service";
import { getReviewPerformance } from "@/modules/review/server/services/reviewPerformance.service";
import { getSimulationEvolution } from "@/modules/simulation/server/services/simulation-performance.service";

export {
  getTrackProgress,
  getLearningAreaProgress,
  getUnitProgress,
  getStageProgress,
} from "@/modules/pedagogy/server/services/learning-progress.service";

/**
 * "Quanto o aluno estudou? Qual foi sua evolução?" (seção 3/21) — composição
 * pura de leituras já existentes: lições (Módulo 8), revisão (Módulo 5),
 * simulados (Módulo 6). Cada uma já reforça sua própria privacidade
 * (`assertOwn...OrAdmin`); esta função não adiciona uma segunda checagem
 * redundante de negócio, só agrega os três resultados.
 */
export async function getStudentProgress(actor: Actor, targetUserId: string = actor.userId) {
  const [lessons, review, simulation] = await Promise.all([
    getStudentLearningOverview(actor, targetUserId),
    getReviewPerformance(actor, targetUserId),
    getSimulationEvolution(actor, targetUserId),
  ]);
  return { lessons, review, simulation };
}
