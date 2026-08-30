/**
 * Testes de `buildPathItems` (fase de redesign visual, seção 9/38) — função
 * pura, sem I/O nem JSX: dado o MESMO formato de `getFullTrack`/
 * `getTrackLessonAvailability` (Módulos 4/8), confirma que o achatamento em
 * caminho visual não perde nem inventa nenhum dado de negócio.
 */
import { describe, it, expect } from "vitest";
import { buildPathItems, NODE_POSITIONS, type LearningPathData } from "./LearningPath";

function fixtureData(lessonIds: string[]): LearningPathData {
  return {
    areas: [
      {
        area: {
          id: "area-1",
          name: "Área 1",
          units: [
            {
              unit: {
                id: "unit-1",
                name: "Unidade 1",
                stages: [
                  {
                    stage: {
                      id: "stage-1",
                      name: "Etapa 1",
                      lessons: lessonIds.map((id) => ({ lesson: { id, title: `Lição ${id}` } })),
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  };
}

describe("LearningPath — buildPathItems", () => {
  it("gera um item 'lesson' por lição, na mesma ordem estrutural recebida", () => {
    const data = fixtureData(["a", "b", "c"]);
    const status = new Map([
      ["a", { status: "COMPLETED" as const }],
      ["b", { status: "AVAILABLE" as const }],
      ["c", { status: "LOCKED" as const }],
    ]);
    const items = buildPathItems(data, status);
    const lessons = items.filter((i) => i.kind === "lesson");
    expect(lessons.map((l) => l.lessonId)).toEqual(["a", "b", "c"]);
    expect(lessons.map((l) => l.status)).toEqual(["COMPLETED", "AVAILABLE", "LOCKED"]);
  });

  it("lição sem entrada no mapa de disponibilidade cai em LOCKED (nunca assume disponível)", () => {
    const data = fixtureData(["sem-status"]);
    const items = buildPathItems(data, new Map());
    const lesson = items.find((i) => i.kind === "lesson");
    expect(lesson?.kind === "lesson" && lesson.status).toBe("LOCKED");
  });

  it("posição esquerda/centro/direita segue um ciclo contínuo de 3, sem reiniciar por grupo", () => {
    const data = fixtureData(["l0", "l1", "l2", "l3", "l4"]);
    const items = buildPathItems(data, new Map());
    const positions = items.filter((i) => i.kind === "lesson").map((i) => i.position);
    expect(positions).toEqual([
      NODE_POSITIONS[0],
      NODE_POSITIONS[1],
      NODE_POSITIONS[2],
      NODE_POSITIONS[0],
      NODE_POSITIONS[1],
    ]);
  });

  it("inclui um rótulo de área e um de grupo (unidade·etapa) antes das lições correspondentes", () => {
    const data = fixtureData(["x"]);
    const items = buildPathItems(data, new Map());
    expect(items[0]).toMatchObject({ kind: "area-label", label: "Área 1" });
    expect(items[1]).toMatchObject({ kind: "group-label", label: "Unidade 1 · Etapa 1" });
    expect(items[2].kind).toBe("lesson");
  });

  it("marca isCurrent só na PRIMEIRA lição AVAILABLE da sequência (fase de redesign profundo, seção 6)", () => {
    const data = fixtureData(["a", "b", "c", "d"]);
    const status = new Map([
      ["a", { status: "COMPLETED" as const }],
      ["b", { status: "AVAILABLE" as const }],
      ["c", { status: "AVAILABLE" as const }],
      ["d", { status: "LOCKED" as const }],
    ]);
    const lessons = buildPathItems(data, status).filter((i) => i.kind === "lesson");
    expect(lessons.map((l) => l.isCurrent)).toEqual([false, true, false, false]);
  });

  it("nenhuma lição é isCurrent quando não há nenhuma AVAILABLE (trilha totalmente concluída ou bloqueada)", () => {
    const data = fixtureData(["a", "b"]);
    const status = new Map([
      ["a", { status: "COMPLETED" as const }],
      ["b", { status: "MASTERED" as const }],
    ]);
    const lessons = buildPathItems(data, status).filter((i) => i.kind === "lesson");
    expect(lessons.every((l) => !l.isCurrent)).toBe(true);
  });
});
