/** Testes puros (sem banco) de resolução de rota/rótulo de uma NextStudyAction (Módulo 11). */
import { describe, it, expect } from "vitest";
import { resolveStudyActionHref, studyActionButtonLabel } from "./study-action-links";
import {
  emptyActionRefs,
  type NextStudyAction,
} from "@/modules/study-engine/types/next-study-action";

function action(
  overrides: Partial<NextStudyAction> & Pick<NextStudyAction, "type">,
): NextStudyAction {
  return { ...emptyActionRefs(), reason: "r", priority: 0, ...overrides };
}

describe("study-action-links (puro)", () => {
  it("START_DIAGNOSTIC leva ao diagnóstico", () => {
    expect(resolveStudyActionHref(action({ type: "START_DIAGNOSTIC" }))).toBe(
      "/dashboard/diagnostico",
    );
  });

  it("LESSON leva à lição específica, ou ao plano se faltar o id", () => {
    expect(resolveStudyActionHref(action({ type: "LESSON", lessonId: "l1" }))).toBe(
      "/dashboard/licoes/l1",
    );
    expect(resolveStudyActionHref(action({ type: "LESSON" }))).toBe("/dashboard/estudar");
  });

  it("QUESTION inclui o conceptId como filtro quando disponível", () => {
    expect(resolveStudyActionHref(action({ type: "QUESTION", conceptId: "c1" }))).toBe(
      "/dashboard/questoes?conceptId=c1",
    );
    expect(resolveStudyActionHref(action({ type: "QUESTION" }))).toBe("/dashboard/questoes");
  });

  it("LIBRARY e CURRENT_AFFAIR levam ao detalhe do item", () => {
    expect(resolveStudyActionHref(action({ type: "LIBRARY", libraryItemId: "b1" }))).toBe(
      "/dashboard/biblioteca/b1",
    );
    expect(resolveStudyActionHref(action({ type: "CURRENT_AFFAIR", currentAffairId: "a1" }))).toBe(
      "/dashboard/atualidades/a1",
    );
  });

  it("cada tipo tem um rótulo de botão não vazio", () => {
    for (const type of [
      "START_DIAGNOSTIC",
      "LESSON",
      "REVIEW",
      "QUESTION",
      "SIMULATION",
      "LIBRARY",
      "CURRENT_AFFAIR",
    ] as const) {
      expect(studyActionButtonLabel(action({ type })).length).toBeGreaterThan(0);
    }
  });
});
