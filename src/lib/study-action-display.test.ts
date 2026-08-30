/**
 * Testes de integração reais da resolução de nomes de exibição (Módulo 11)
 * — confirma que usa dados REAIS via os `getX` já existentes, e que nunca
 * quebra quando a referência falta ou não existe (devolve um rótulo
 * genérico em vez de lançar erro para a UI).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { resolveStudyActionDisplay } from "./study-action-display";
import {
  emptyActionRefs,
  type NextStudyAction,
} from "@/modules/study-engine/types/next-study-action";
import {
  createFixtureUser,
  createFixtureConcept,
  createFixturePublishedLesson,
  createFixtureDiscipline,
  cleanupFixtures,
} from "@/test/fixtures";

function action(
  overrides: Partial<NextStudyAction> & Pick<NextStudyAction, "type">,
): NextStudyAction {
  return { ...emptyActionRefs(), reason: "r", priority: 0, ...overrides };
}

describe("resolveStudyActionDisplay", () => {
  const userIds: string[] = [];
  const conceptIds: string[] = [];
  const disciplineIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];

  beforeAll(async () => {
    const user = await createFixtureUser("display-user");
    userIds.push(user.id);
  });

  it("START_DIAGNOSTIC não faz nenhuma consulta e devolve título fixo", async () => {
    const display = await resolveStudyActionDisplay(action({ type: "START_DIAGNOSTIC" }));
    expect(display).toEqual({ title: "Diagnóstico inicial", subtitle: null });
  });

  it("LESSON resolve o título real da lição", async () => {
    const { lesson, source, citation } = await createFixturePublishedLesson("display");
    lessonIds.push(lesson.id);
    sourceIds.push(source.id);
    citationIds.push(citation.id);

    const display = await resolveStudyActionDisplay(
      action({ type: "LESSON", lessonId: lesson.id }),
    );
    expect(display.title).toBe(lesson.title);
  });

  it("LESSON sem lessonId (ou inexistente) devolve um rótulo genérico, nunca lança erro", async () => {
    const display = await resolveStudyActionDisplay(action({ type: "LESSON" }));
    expect(display.title).toBe("Próxima lição");

    const displayMissing = await resolveStudyActionDisplay(
      action({ type: "LESSON", lessonId: "lesson-inexistente" }),
    );
    expect(displayMissing.title).toBe("Próxima lição");
  });

  it("REVIEW resolve o nome real do conceito", async () => {
    const concept = await createFixtureConcept("display");
    conceptIds.push(concept.id);

    const display = await resolveStudyActionDisplay(
      action({ type: "REVIEW", conceptId: concept.id }),
    );
    expect(display.title).toBe(concept.name);
  });

  it("SIMULATION resolve o nome real da disciplina, quando houver", async () => {
    const discipline = await createFixtureDiscipline("display");
    disciplineIds.push(discipline.id);

    const withDiscipline = await resolveStudyActionDisplay(
      action({ type: "SIMULATION", disciplineId: discipline.id }),
    );
    expect(withDiscipline.title).toContain(discipline.name);

    const withoutDiscipline = await resolveStudyActionDisplay(action({ type: "SIMULATION" }));
    expect(withoutDiscipline.title).toBe("Simulado recomendado");
  });

  afterAll(async () => {
    await cleanupFixtures({
      citationIds,
      lessonIds,
      sourceIds,
      conceptIds,
      disciplineIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
