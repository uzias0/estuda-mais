export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getFullTrack } from "@/modules/pedagogy/server/services/pedagogy-query.service";
import { listLearningAreas } from "@/modules/pedagogy/server/services/learning-area.service";
import { listUnits } from "@/modules/pedagogy/server/services/unit.service";
import { listStages } from "@/modules/pedagogy/server/services/stage.service";
import { listLessons } from "@/modules/pedagogy/server/services/lesson.service";
import {
  updateTrackAction,
  publishTrackAction,
  archiveTrackAction,
  linkTrackToAreaAction,
  unlinkTrackFromAreaAction,
  reorderTrackAreasAction,
  linkAreaToUnitAction,
  unlinkAreaFromUnitAction,
  reorderAreaUnitsAction,
  linkUnitToStageAction,
  unlinkUnitFromStageAction,
  reorderUnitStagesAction,
  linkStageToLessonAction,
  unlinkStageFromLessonAction,
  reorderStageLessonsAction,
} from "@/server/actions/admin/pedagogy-actions";
import { Badge } from "@/components/Badge";
import { publicationStatusLabel } from "@/lib/format";

/**
 * Árvore completa Track→Area→Unit→Stage→Lesson (Módulo 12, seção 8) —
 * `getFullTrack` (Módulo 4) já devolve tudo aninhado e ordenado; esta
 * página só apresenta + formulários de link/unlink/reorder que chamam os
 * serviços reais de cada nível. Reordenação é "digite a ordem desejada,
 * separada por vírgula" (sem drag-and-drop/JS novo) — o serviço
 * (`assertValidReorder`) recusa qualquer conjunto de ids que não bata
 * exatamente com o que já está vinculado.
 */
export default async function TrackTreePage({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  const track = await getFullTrack(trackId);
  if (!track) notFound();

  const [allAreas, allUnits, allStages, allLessons] = await Promise.all([
    listLearningAreas({ take: 200 }),
    listUnits({ take: 200 }),
    listStages({ take: 200 }),
    listLessons({ take: 200 }),
  ]);

  const linkedAreaIds = new Set(track.areas.map((a) => a.areaId));
  const trackAreaOrder = track.areas.map((a) => a.areaId).join(",");

  return (
    <div className="page-container stack">
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{track.name}</h1>
        <Badge
          tone={
            track.status === "PUBLISHED"
              ? "success"
              : track.status === "ARCHIVED"
                ? "muted"
                : "warning"
          }
        >
          {publicationStatusLabel(track.status)}
        </Badge>
      </div>

      <div className="card stack">
        <form
          action={updateTrackAction.bind(null, trackId)}
          className="row-wrap"
          style={{ alignItems: "end" }}
        >
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" className="text-input" defaultValue={track.name} />
          </div>
          <button type="submit" className="btn btn-secondary">
            Salvar
          </button>
        </form>
        <div className="admin-actions-row">
          {track.status !== "PUBLISHED" ? (
            <form action={publishTrackAction.bind(null, trackId)}>
              <button type="submit" className="btn btn-primary">
                Publicar trilha
              </button>
            </form>
          ) : null}
          {track.status !== "ARCHIVED" ? (
            <form action={archiveTrackAction.bind(null, trackId)}>
              <button type="submit" className="btn btn-secondary">
                Arquivar trilha
              </button>
            </form>
          ) : null}
        </div>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
          Publicar exige ao menos uma área vinculada já publicada (gate estrutural, Módulo 4).
        </p>
      </div>

      <div className="card stack">
        <p className="card-title">Áreas vinculadas</p>
        <form
          action={linkTrackToAreaAction.bind(null, trackId)}
          className="row-wrap"
          style={{ alignItems: "end" }}
        >
          <select name="areaId" className="text-input" required>
            <option value="">— vincular área existente —</option>
            {allAreas
              .filter((a) => !linkedAreaIds.has(a.id))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
          <button type="submit" className="btn btn-secondary">
            Vincular
          </button>
        </form>
        {trackAreaOrder ? (
          <form
            action={reorderTrackAreasAction.bind(null, trackId)}
            className="row-wrap"
            style={{ alignItems: "end" }}
          >
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="orderedIds">Ordem (ids separados por vírgula)</label>
              <input
                id="orderedIds"
                name="orderedIds"
                className="text-input"
                defaultValue={trackAreaOrder}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Reordenar
            </button>
          </form>
        ) : null}

        <div className="stack">
          {track.areas.map(({ area }) => {
            const linkedUnitIds = new Set(area.units.map((u) => u.unitId));
            const areaUnitOrder = area.units.map((u) => u.unitId).join(",");
            return (
              <div key={area.id} className="card card--tight stack">
                <div className="row-wrap" style={{ justifyContent: "space-between" }}>
                  <p style={{ fontWeight: 700 }}>{area.name}</p>
                  <form action={unlinkTrackFromAreaAction.bind(null, trackId, area.id)}>
                    <button type="submit" className="btn btn-secondary">
                      Desvincular
                    </button>
                  </form>
                </div>

                <form
                  action={linkAreaToUnitAction.bind(null, trackId, area.id)}
                  className="row-wrap"
                  style={{ alignItems: "end" }}
                >
                  <select name="unitId" className="text-input" required>
                    <option value="">— vincular unidade —</option>
                    {allUnits
                      .filter((u) => !linkedUnitIds.has(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                  <button type="submit" className="btn btn-secondary">
                    Vincular
                  </button>
                </form>
                {areaUnitOrder ? (
                  <form
                    action={reorderAreaUnitsAction.bind(null, trackId, area.id)}
                    className="row-wrap"
                    style={{ alignItems: "end" }}
                  >
                    <input
                      name="orderedIds"
                      className="text-input"
                      defaultValue={areaUnitOrder}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-secondary">
                      Reordenar unidades
                    </button>
                  </form>
                ) : null}

                {area.units.map(({ unit }) => {
                  const linkedStageIds = new Set(unit.stages.map((s) => s.stageId));
                  const unitStageOrder = unit.stages.map((s) => s.stageId).join(",");
                  return (
                    <div
                      key={unit.id}
                      style={{ marginLeft: "var(--space-4)" }}
                      className="card card--tight stack"
                    >
                      <div className="row-wrap" style={{ justifyContent: "space-between" }}>
                        <p style={{ fontWeight: 600 }}>{unit.name}</p>
                        <form
                          action={unlinkAreaFromUnitAction.bind(null, trackId, area.id, unit.id)}
                        >
                          <button type="submit" className="btn btn-secondary">
                            Desvincular
                          </button>
                        </form>
                      </div>
                      <form
                        action={linkUnitToStageAction.bind(null, trackId, unit.id)}
                        className="row-wrap"
                        style={{ alignItems: "end" }}
                      >
                        <select name="stageId" className="text-input" required>
                          <option value="">— vincular etapa —</option>
                          {allStages
                            .filter((s) => !linkedStageIds.has(s.id))
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-secondary">
                          Vincular
                        </button>
                      </form>
                      {unitStageOrder ? (
                        <form
                          action={reorderUnitStagesAction.bind(null, trackId, unit.id)}
                          className="row-wrap"
                          style={{ alignItems: "end" }}
                        >
                          <input
                            name="orderedIds"
                            className="text-input"
                            defaultValue={unitStageOrder}
                            style={{ flex: 1 }}
                          />
                          <button type="submit" className="btn btn-secondary">
                            Reordenar etapas
                          </button>
                        </form>
                      ) : null}

                      {unit.stages.map(({ stage }) => {
                        const linkedLessonIds = new Set(stage.lessons.map((l) => l.lessonId));
                        const stageLessonOrder = stage.lessons.map((l) => l.lessonId).join(",");
                        return (
                          <div
                            key={stage.id}
                            style={{ marginLeft: "var(--space-4)" }}
                            className="card card--tight stack"
                          >
                            <div className="row-wrap" style={{ justifyContent: "space-between" }}>
                              <p>{stage.name}</p>
                              <form
                                action={unlinkUnitFromStageAction.bind(
                                  null,
                                  trackId,
                                  unit.id,
                                  stage.id,
                                )}
                              >
                                <button type="submit" className="btn btn-secondary">
                                  Desvincular
                                </button>
                              </form>
                            </div>
                            <form
                              action={linkStageToLessonAction.bind(null, trackId, stage.id)}
                              className="row-wrap"
                              style={{ alignItems: "end" }}
                            >
                              <select name="lessonId" className="text-input" required>
                                <option value="">— vincular lição —</option>
                                {allLessons
                                  .filter((l) => !linkedLessonIds.has(l.id))
                                  .map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.title}
                                    </option>
                                  ))}
                              </select>
                              <button type="submit" className="btn btn-secondary">
                                Vincular
                              </button>
                            </form>
                            {stageLessonOrder ? (
                              <form
                                action={reorderStageLessonsAction.bind(null, trackId, stage.id)}
                                className="row-wrap"
                                style={{ alignItems: "end" }}
                              >
                                <input
                                  name="orderedIds"
                                  className="text-input"
                                  defaultValue={stageLessonOrder}
                                  style={{ flex: 1 }}
                                />
                                <button type="submit" className="btn btn-secondary">
                                  Reordenar lições
                                </button>
                              </form>
                            ) : null}
                            <ul className="stack">
                              {stage.lessons.map(({ lesson }) => (
                                <li
                                  key={lesson.id}
                                  className="row-wrap"
                                  style={{ justifyContent: "space-between" }}
                                >
                                  <Link href={`/admin/pedagogy/lessons/${lesson.id}`}>
                                    {lesson.title}
                                  </Link>
                                  <form
                                    action={unlinkStageFromLessonAction.bind(
                                      null,
                                      trackId,
                                      stage.id,
                                      lesson.id,
                                    )}
                                  >
                                    <button type="submit" className="btn btn-secondary">
                                      Desvincular
                                    </button>
                                  </form>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
