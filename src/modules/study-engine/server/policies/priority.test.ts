/** Testes puros (sem banco) da política de ordenação/corte (Módulo 10, seções 4/19/21/40). */
import { describe, it, expect } from "vitest";
import { buildStudyPlan, pickTopAction } from "./priority";
import {
  emptyActionRefs,
  type NextStudyAction,
} from "@/modules/study-engine/types/next-study-action";

function fakeAction(type: NextStudyAction["type"], priority: number): NextStudyAction {
  return { ...emptyActionRefs(), type, reason: `reason-${type}-${priority}`, priority };
}

describe("study-engine priority policy (puro)", () => {
  it("buildStudyPlan ordena por prioridade decrescente", () => {
    const candidates = [
      fakeAction("LIBRARY", 400),
      fakeAction("REVIEW", 900),
      fakeAction("LESSON", 700),
    ];
    const plan = buildStudyPlan(candidates, 10);
    expect(plan.map((a) => a.priority)).toEqual([900, 700, 400]);
  });

  it("buildStudyPlan corta no tamanho máximo (nunca lista infinita)", () => {
    const candidates = Array.from({ length: 20 }, (_, i) => fakeAction("QUESTION", i));
    const plan = buildStudyPlan(candidates, 5);
    expect(plan).toHaveLength(5);
  });

  it("buildStudyPlan é determinístico/reprodutível: mesma entrada, mesma saída", () => {
    const candidates = [
      fakeAction("LESSON", 700),
      fakeAction("REVIEW", 900),
      fakeAction("SIMULATION", 500),
    ];
    const first = buildStudyPlan(candidates);
    const second = buildStudyPlan(candidates);
    expect(first).toEqual(second);
  });

  it("conflito de prioridades iguais mantém a ordem de geração (estável)", () => {
    const a = fakeAction("LESSON", 700);
    const b = { ...fakeAction("LESSON", 700), reason: "outra lição" };
    const plan = buildStudyPlan([a, b]);
    expect(plan[0].reason).toBe(a.reason);
    expect(plan[1].reason).toBe(b.reason);
  });

  it("pickTopAction devolve null para lista vazia, e o de maior prioridade caso contrário", () => {
    expect(pickTopAction([])).toBeNull();
    const top = pickTopAction([fakeAction("LIBRARY", 400), fakeAction("REVIEW", 900)]);
    expect(top?.priority).toBe(900);
  });
});
