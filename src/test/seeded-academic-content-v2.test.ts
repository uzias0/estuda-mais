/**
 * Testes de integração do povoamento acadêmico real — FASE DE EXPANSÃO
 * (`scripts/seed-academic-content-v2.ts`, complementa
 * `src/test/seeded-academic-content.test.ts`). Mesmo padrão: roda
 * `seedAcademicContentV2` contra o Postgres real de dev/CI e valida
 * propriedades do conteúdo REAL e PERMANENTE da plataforma — não apaga esse
 * conteúdo no `afterAll` (só os alunos-fixture usados para exercitar a
 * jornada). Requer que `seedAcademicContent` (v1) já tenha rodado — mesma
 * dependência do próprio script (ver seu comentário de topo).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { getCurrentAdminActor } from "@/server/auth/devActor";
import { getStudyPlan } from "@/modules/study-engine/server/services/study-plan.service";
import {
  startLesson,
  submitLessonActivity,
  completeLesson,
  getLessonSession,
} from "@/modules/pedagogy/server/services/lesson-execution.service";
import { resolveCharacterForLesson } from "@/lib/characters";
import { createFixtureUser, cleanupFixtures } from "@/test/fixtures";
import { seedAcademicContent } from "../../scripts/seed-academic-content";
import { seedAcademicContentV2 } from "../../scripts/seed-academic-content-v2";

const NEW_PERSON_SLUGS = [
  "wilhelm-wundt",
  "william-james",
  "john-b-watson",
  "ivan-pavlov",
  "kurt-lewin",
  "lev-vygotsky",
  "erik-erikson",
  "mary-ainsworth",
  "melanie-klein",
  "anna-freud",
  "donald-winnicott",
  "karen-horney",
  "aaron-beck",
  "abraham-maslow",
];

const NEW_LESSON_TITLES: Record<string, string> = {
  "wilhelm-wundt": "Wundt e a Fundação da Psicologia Experimental",
  "william-james": "William James e o Funcionalismo",
  "john-b-watson": "Watson e o Nascimento do Behaviorismo",
  "ivan-pavlov": "Pavlov e o Condicionamento Clássico",
  "kurt-lewin": "Lewin e a Teoria de Campo",
  "lev-vygotsky": "Vygotsky e a Zona de Desenvolvimento Proximal",
  "erik-erikson": "Erikson e os Estágios Psicossociais",
  "mary-ainsworth": "Ainsworth e a Situação Estranha",
  "melanie-klein": "Klein e a Teoria das Relações Objetais",
  "anna-freud": "Anna Freud e os Mecanismos de Defesa",
  "donald-winnicott": "Winnicott e o Objeto Transicional",
  "karen-horney": "Karen Horney e a Psicologia Feminina",
  "aaron-beck": "Beck e as Distorções Cognitivas",
  "abraham-maslow": "Maslow e a Hierarquia das Necessidades",
};

describe("Povoamento acadêmico real — expansão (seedAcademicContentV2)", () => {
  const fixtureUserIds: string[] = [];

  beforeAll(async () => {
    const admin = await getCurrentAdminActor();
    // v1 é pré-requisito real do v2 (ver comentário de topo do script) —
    // rodar aqui garante que o teste não dependa de ordem de execução de
    // outros arquivos de teste.
    await seedAcademicContent(admin);
    await seedAcademicContentV2(admin);
  }, 120_000);

  afterAll(async () => {
    if (fixtureUserIds.length) {
      await prisma.questionAttempt.deleteMany({ where: { userId: { in: fixtureUserIds } } });
      await prisma.studySession.deleteMany({ where: { userId: { in: fixtureUserIds } } });
      await cleanupFixtures({ userIds: fixtureUserIds });
    }
    await prisma.$disconnect();
  });

  it("é idempotente: rodar de novo não duplica nenhuma entidade real", async () => {
    const admin = await getCurrentAdminActor();
    const before = await prisma.academicPerson.count({ where: { slug: { in: NEW_PERSON_SLUGS } } });
    const beforeRelations = await prisma.academicRelation.count();
    const beforeTags = await prisma.tag.count();
    await seedAcademicContentV2(admin);
    const after = await prisma.academicPerson.count({ where: { slug: { in: NEW_PERSON_SLUGS } } });
    const afterRelations = await prisma.academicRelation.count();
    const afterTags = await prisma.tag.count();
    expect(after).toBe(before);
    expect(after).toBe(NEW_PERSON_SLUGS.length);
    expect(afterRelations).toBe(beforeRelations);
    expect(afterTags).toBe(beforeTags);
  });

  it("os 14 novos AcademicPerson estão publicados e têm procedência real (Citation)", async () => {
    const people = await prisma.academicPerson.findMany({
      where: { slug: { in: NEW_PERSON_SLUGS } },
    });
    expect(people.length).toBe(NEW_PERSON_SLUGS.length);
    for (const person of people) {
      expect(person.status).toBe("PUBLISHED");
      const citationCount = await prisma.citation.count({
        where: { entityType: "PERSON", entityId: person.id },
      });
      expect(citationCount, `${person.name} está PUBLISHED sem Citation`).toBeGreaterThan(0);
    }
  });

  it("toda Lesson/Concept/Theory/School novos publicados têm procedência real (Citation)", async () => {
    const lessons = await prisma.lesson.findMany({
      where: { title: { in: Object.values(NEW_LESSON_TITLES) } },
    });
    expect(lessons.length).toBe(14);
    for (const lesson of lessons) {
      expect(lesson.status).toBe("PUBLISHED");
      const citationCount = await prisma.citation.count({
        where: { entityType: "LESSON", entityId: lesson.id },
      });
      expect(citationCount, `Lesson "${lesson.title}" está PUBLISHED sem Citation`).toBeGreaterThan(
        0,
      );
    }
  });

  it("as 4 disciplinas interdisciplinares estão publicadas, citadas, e relacionadas à Psicologia", async () => {
    const slugs = ["filosofia", "sociologia", "historia", "educacao"];
    const disciplines = await prisma.discipline.findMany({ where: { slug: { in: slugs } } });
    expect(disciplines.length).toBe(4);
    const psicologia = await prisma.discipline.findUniqueOrThrow({
      where: { slug: "psicologia" },
    });
    for (const d of disciplines) {
      expect(d.status).toBe("PUBLISHED");
      const citationCount = await prisma.citation.count({
        where: { entityType: "DISCIPLINE", entityId: d.id },
      });
      expect(citationCount).toBeGreaterThan(0);
      const relations = await prisma.academicRelation.findMany({
        where: {
          sourceType: "DISCIPLINE",
          sourceId: psicologia.id,
          targetType: "DISCIPLINE",
          targetId: d.id,
        },
      });
      expect(relations.length).toBeGreaterThan(0);
      expect(relations[0].status).toBe("PUBLISHED");
    }
  });

  it("os 9 períodos históricos existem com faixas de ano coerentes (endYear >= startYear)", async () => {
    const periods = await prisma.historicalPeriod.findMany({
      where: {
        slug: {
          in: [
            "antecedentes-filosoficos",
            "fundacao-psicologia-cientifica",
            "gestalt",
            "behaviorismo-periodo",
            "psicanalise-periodo",
            "humanismo-periodo",
            "revolucao-cognitiva",
            "psicologia-contemporanea",
            "psicologia-no-brasil-regulamentacao",
          ],
        },
      },
    });
    expect(periods.length).toBe(9);
    for (const p of periods) {
      if (p.startYear !== null && p.endYear !== null) {
        expect(p.endYear).toBeGreaterThanOrEqual(p.startYear!);
      }
    }
  });

  it("nenhuma das 14 novas questões finge ser oficial: todas são autorais, sem examEditionId", async () => {
    const lessons = await prisma.lesson.findMany({
      where: { title: { in: Object.values(NEW_LESSON_TITLES) } },
      include: { blocks: { include: { question: { include: { source: true } } } } },
    });
    expect(lessons.length).toBe(14);
    for (const lesson of lessons) {
      const questionBlock = lesson.blocks.find((b) => b.type === "QUESTION");
      expect(questionBlock?.question).toBeTruthy();
      expect(questionBlock!.question!.examEditionId).toBeNull();
      expect(questionBlock!.question!.source.sourceType).toBe("AUTORAL");
      expect(questionBlock!.question!.reviewStatus).toBe("PUBLISHED");
    }
  });

  it("as 14 novas questões cobrem os 8 QuestionType suportados pelo sistema", async () => {
    const lessons = await prisma.lesson.findMany({
      where: { title: { in: Object.values(NEW_LESSON_TITLES) } },
      include: { blocks: { include: { question: true } } },
    });
    const types = new Set(
      lessons.map((l) => l.blocks.find((b) => b.type === "QUESTION")!.question!.type),
    );
    expect(types).toEqual(
      new Set([
        "MULTIPLE_CHOICE",
        "TRUE_FALSE",
        "MULTI_SELECT",
        "ORDERING",
        "MATCHING",
        "FILL_BLANK",
        "SHORT_ANSWER",
        "CASE_STUDY",
      ]),
    );
  });

  it("os 2 itens de biblioteca novos são gratuitos com procedência real de domínio público", async () => {
    const items = await prisma.libraryItem.findMany({
      where: {
        title: {
          in: [
            "The Principles of Psychology, Volume 1",
            "Conditioned Reflexes: An Investigation of the Physiological Activity of the Cerebral Cortex",
          ],
        },
      },
      include: { source: true },
    });
    expect(items.length).toBe(2);
    for (const item of items) {
      expect(item.isFree).toBe(true);
      expect(item.freeAccessReason).toBe("PUBLIC_DOMAIN");
      expect(item.status).toBe("PUBLISHED");
      expect(item.source.url).toMatch(/^https:\/\/(www\.gutenberg\.org|archive\.org)\//);
    }
  });

  it("as 2 atualidades novas têm eventDate real (não createdAt), fonte oficial e vínculo com a Base de Conhecimento", async () => {
    const affairs = await prisma.currentAffair.findMany({
      where: {
        title: {
          in: [
            "OMS retira a incongruência de gênero do capítulo de transtornos mentais na CID-11",
            "CFP publica nova resolução sobre atendimento psicológico mediado por tecnologia",
          ],
        },
      },
      include: { source: true, knowledgeTags: true, tags: true },
    });
    expect(affairs.length).toBe(2);
    for (const affair of affairs) {
      expect(affair.status).toBe("PUBLISHED");
      expect(affair.source.sourceType).toBe("OFICIAL");
      expect(affair.knowledgeTags.length).toBeGreaterThan(0);
      expect(affair.tags.length).toBeGreaterThan(0);
      // eventDate real e datado, bem anterior a createdAt (que é de hoje) —
      // nunca confundidos (regra "eventDate != createdAt").
      expect(affair.eventDate.getFullYear()).toBeLessThan(2023);
    }
  });

  it("as 17 tags existem e ao menos as tags 'mulher'/'genero' têm pessoas vinculadas", async () => {
    const tags = await prisma.tag.findMany({
      where: {
        slug: {
          in: [
            "vestibular",
            "enem",
            "historia-da-psicologia",
            "psicanalise",
            "behaviorismo",
            "desenvolvimento",
            "aprendizagem",
            "psicologia-social-tag",
            "genero",
            "mulher",
            "clinica",
            "saude",
            "personalidade",
            "cognicao",
            "neuropsicologia",
            "psicologia-brasileira",
            "gestalt",
          ],
        },
      },
      include: { people: true },
    });
    expect(tags.length).toBe(17);
    const mulherTag = tags.find((t) => t.slug === "mulher")!;
    expect(mulherTag.people.length).toBeGreaterThanOrEqual(4);
  });

  it("as 8 novas trilhas estão publicadas e descobrem lições reais (novas e reaproveitadas de v1)", async () => {
    const slugs = [
      "historia-da-psicologia",
      "psicanalise",
      "psicologia-do-desenvolvimento",
      "psicologia-social",
      "psicologia-cognitiva",
      "behaviorismo-e-aprendizagem",
      "psicologia-humanista",
      "psicologia-genero-e-sociedade",
    ];
    const tracks = await prisma.track.findMany({
      where: { slug: { in: slugs } },
      include: {
        areas: { include: { area: { include: { units: { include: { unit: true } } } } } },
      },
    });
    expect(tracks.length).toBe(8);
    for (const track of tracks) {
      expect(track.status).toBe("PUBLISHED");
      expect(track.areas.length).toBeGreaterThan(0);
    }
  });

  it("a trilha 'psicanalise' reaproveita as Lessons de Freud e Jung (v1) sem duplicá-las", async () => {
    const track = await prisma.track.findUniqueOrThrow({
      where: { slug: "psicanalise" },
      include: {
        areas: {
          include: {
            area: {
              include: {
                units: {
                  include: { unit: { include: { stages: { include: { stage: true } } } } },
                },
              },
            },
          },
        },
      },
    });
    const stageIds = track.areas.flatMap((ta) =>
      ta.area.units.flatMap((au) => au.unit.stages.map((us) => us.stage.id)),
    );
    const stages = await prisma.stage.findMany({ where: { id: { in: stageIds } } });
    const stageNames = stages.map((s) => s.name);
    expect(stageNames).toContain("Freud e o Inconsciente");
    expect(stageNames).toContain("Jung e os Arquétipos");
    expect(stageNames).toContain("Klein e a Teoria das Relações Objetais");
    // Confirma que não há Stage duplicado com o mesmo nome (reaproveitamento
    // real via join N:N, não uma cópia da Lesson/Stage original).
    const freudStages = await prisma.stage.findMany({ where: { name: "Freud e o Inconsciente" } });
    expect(freudStages.length).toBe(1);
  });

  it("a Lesson de Vygotsky (nova) é descoberta pelo Study Engine para um aluno novo", async () => {
    const newStudent = await createFixtureUser("seed-v2-discovery", Role.STUDENT);
    fixtureUserIds.push(newStudent.id);
    const plan = await getStudyPlan({ userId: newStudent.id, role: Role.STUDENT }, newStudent.id);
    expect(plan.length).toBeGreaterThan(0);
  });

  it("resolveCharacterForLesson resolve o personagem correto para uma lição reaproveitada (Freud, na trilha nova)", async () => {
    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { title: "Freud e o Inconsciente" },
      include: { knowledgeTags: true },
    });
    const character = await resolveCharacterForLesson(lesson);
    expect(character.id).toBe("freud");
  });

  // ==========================================================================
  // Execução de ponta a ponta — um representante de cada tipo de questão
  // NOVO introduzido nesta fase (TRUE_FALSE, MULTI_SELECT, ORDERING, MATCHING,
  // FILL_BLANK, SHORT_ANSWER, CASE_STUDY), provando que a jornada real de
  // estudo funciona para os 8 tipos suportados, não só MULTIPLE_CHOICE
  // (já coberto pelo teste equivalente da fase anterior).
  // ==========================================================================

  async function runLessonToCompletion(
    lessonTitle: string,
    answerFor: (question: {
      id: string;
      type: string;
      options: Array<{ id: string; text: string; isCorrect: boolean; order: number }>;
      answerKey: unknown;
    }) => Record<string, unknown>,
  ) {
    const student = await createFixtureUser(
      `seed-v2-lesson-${lessonTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      Role.STUDENT,
    );
    fixtureUserIds.push(student.id);
    const actor = { userId: student.id, role: Role.STUDENT };

    const lesson = await prisma.lesson.findFirstOrThrow({
      where: { title: lessonTitle },
      include: { blocks: { include: { question: { include: { options: true } } } } },
    });

    const session = await startLesson(actor, lesson.id);
    expect(session.blocksTotal).toBe(5);

    let current = session;
    for (const block of lesson.blocks.sort((a, b) => a.order - b.order)) {
      if (block.type === "QUESTION" && block.question) {
        current = await submitLessonActivity(actor, {
          lessonId: lesson.id,
          blockId: block.id,
          answerData: answerFor(block.question) as never,
          timeSpentMs: 500,
        });
      } else {
        current = await submitLessonActivity(actor, {
          lessonId: lesson.id,
          blockId: block.id,
          timeSpentMs: 500,
        });
      }
    }
    expect(current.blocksCompleted).toBe(5);

    const completed = await completeLesson(actor, lesson.id);
    expect(completed.status).toBe("MASTERED");
    const finalSession = await getLessonSession(actor, lesson.id);
    expect(finalSession.status).toBe("MASTERED");
  }

  it("executa a lição de Watson (TRUE_FALSE) de ponta a ponta", async () => {
    await runLessonToCompletion("Watson e o Nascimento do Behaviorismo", (q) => ({
      type: "TRUE_FALSE",
      selectedOptionId: q.options.find((o) => o.isCorrect)!.id,
    }));
  });

  it("executa a lição de Anna Freud (MULTI_SELECT) de ponta a ponta", async () => {
    await runLessonToCompletion("Anna Freud e os Mecanismos de Defesa", (q) => ({
      type: "MULTI_SELECT",
      selectedOptionIds: q.options.filter((o) => o.isCorrect).map((o) => o.id),
    }));
  });

  it("executa a lição de Erikson (ORDERING) de ponta a ponta", async () => {
    await runLessonToCompletion("Erikson e os Estágios Psicossociais", (q) => ({
      type: "ORDERING",
      orderedOptionIds: [...q.options].sort((a, b) => a.order - b.order).map((o) => o.id),
    }));
  });

  it("executa a lição de Ainsworth (MATCHING) de ponta a ponta", async () => {
    await runLessonToCompletion("Ainsworth e a Situação Estranha", (q) => {
      const answerKey = q.answerKey as { pairs: Array<{ left: string; right: string }> };
      return { type: "MATCHING", pairs: answerKey.pairs };
    });
  });

  it("executa a lição de Beck (FILL_BLANK) de ponta a ponta", async () => {
    await runLessonToCompletion("Beck e as Distorções Cognitivas", (q) => {
      const answerKey = q.answerKey as { blanks: Array<{ accepted: string[] }> };
      return { type: "FILL_BLANK", answers: answerKey.blanks.map((b) => b.accepted[0]) };
    });
  });

  it("executa a lição de Karen Horney (SHORT_ANSWER) de ponta a ponta", async () => {
    await runLessonToCompletion("Karen Horney e a Psicologia Feminina", (q) => {
      const answerKey = q.answerKey as { accepted: string[] };
      return { type: "SHORT_ANSWER", text: answerKey.accepted[0] };
    });
  });

  it("executa a lição de Klein (CASE_STUDY) de ponta a ponta", async () => {
    await runLessonToCompletion("Klein e a Teoria das Relações Objetais", (q) => ({
      type: "CASE_STUDY",
      selectedOptionId: q.options.find((o) => o.isCorrect)!.id,
    }));
  });
});
