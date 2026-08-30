/**
 * Testes de integração reais de desbloqueio (Módulo 8, seções 19/20/34) —
 * disponibilidade derivada exclusivamente da ordem estrutural já existente
 * (`StageLesson.order`) e do `LessonProgress` do usuário, dentro de uma
 * trilha publicada de ponta a ponta (mesma cadeia de publicação testada em
 * `track.service.test.ts`, Módulo 4).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/server/auth/authorize";
import { NotFoundError } from "./pedagogy-publication.service";
import { linkTrackToArea, publishTrack } from "./track.service";
import { linkAreaToUnit, publishLearningArea } from "./learning-area.service";
import { linkUnitToStage, publishUnit } from "./unit.service";
import { linkStageToLesson, publishStage } from "./stage.service";
import { startLesson, completeLesson, submitLessonActivity } from "./lesson-execution.service";
import { getTrackLessonAvailability, getLessonAvailability } from "./learning-unlock.service";
import {
  createFixtureUser,
  createFixtureTrack,
  createFixtureLearningArea,
  createFixtureUnit,
  createFixturePedagogyStage,
  createFixturePublishedLesson,
  cleanupFixtures,
} from "@/test/fixtures";

describe("Learning unlock service", () => {
  let studentId: string;
  let otherStudentId: string;
  let trackId: string;
  let lesson1Id: string;
  let lesson2Id: string;
  let lesson1BlockId: string;
  const userIds: string[] = [];
  const trackIds: string[] = [];
  const learningAreaIds: string[] = [];
  const unitIds: string[] = [];
  const pedagogyStageIds: string[] = [];
  const lessonIds: string[] = [];
  const sourceIds: string[] = [];
  const citationIds: string[] = [];

  const student = () => ({ userId: studentId, role: Role.STUDENT });
  const other = () => ({ userId: otherStudentId, role: Role.STUDENT });

  beforeAll(async () => {
    const studentUser = await createFixtureUser("unlock-student", Role.STUDENT);
    const otherUser = await createFixtureUser("unlock-other", Role.STUDENT);
    const adminUser = await createFixtureUser("unlock-admin", Role.ADMIN);
    studentId = studentUser.id;
    otherStudentId = otherUser.id;
    userIds.push(studentId, otherStudentId, adminUser.id);

    const track = await createFixtureTrack("unlock");
    const area = await createFixtureLearningArea("unlock");
    const unit = await createFixtureUnit("unlock");
    const stage = await createFixturePedagogyStage("unlock");
    trackIds.push(track.id);
    learningAreaIds.push(area.id);
    unitIds.push(unit.id);
    pedagogyStageIds.push(stage.id);
    trackId = track.id;

    const lesson1 = await createFixturePublishedLesson("unlock-1");
    const lesson2 = await createFixturePublishedLesson("unlock-2");
    lessonIds.push(lesson1.lesson.id, lesson2.lesson.id);
    sourceIds.push(lesson1.source.id, lesson2.source.id);
    citationIds.push(lesson1.citation.id, lesson2.citation.id);
    lesson1Id = lesson1.lesson.id;
    lesson2Id = lesson2.lesson.id;
    lesson1BlockId = lesson1.blocks[0].id;

    // Reaproveita o mesmo usuário ADMIN de fixture para os dois papéis de
    // curadoria exigidos pela publicação em cadeia (Módulo 4) — só o papel
    // (`role`) importa para `assertRole`/`recordAudit`; `Actor` não tem
    // sessão real (Módulo 1, seção 45 do prompt deste módulo).
    const adminActor = { userId: adminUser.id, role: Role.ADMIN };
    const editorActor = { userId: adminUser.id, role: Role.CONTENT_EDITOR };

    await linkStageToLesson(editorActor, stage.id, { lessonId: lesson1.lesson.id, order: 0 });
    await linkStageToLesson(editorActor, stage.id, { lessonId: lesson2.lesson.id, order: 1 });
    await linkUnitToStage(editorActor, unit.id, { stageId: stage.id });
    await linkAreaToUnit(editorActor, area.id, { unitId: unit.id });
    await linkTrackToArea(editorActor, track.id, { areaId: area.id });

    await publishStage(adminActor, stage.id);
    await publishUnit(adminActor, unit.id);
    await publishLearningArea(adminActor, area.id);
    await publishTrack(adminActor, track.id);
  });

  it("primeira lição da sequência publicada está AVAILABLE; a segunda está LOCKED", async () => {
    const availability = await getTrackLessonAvailability(student(), studentId, trackId);
    expect(availability).toHaveLength(2);
    expect(availability[0]).toMatchObject({ lessonId: lesson1Id, status: "AVAILABLE" });
    expect(availability[1]).toMatchObject({ lessonId: lesson2Id, status: "LOCKED" });
  });

  it("getLessonAvailability reflete a mesma disponibilidade para uma lição específica", async () => {
    const entry = await getLessonAvailability(student(), studentId, trackId, lesson2Id);
    expect(entry.status).toBe("LOCKED");
  });

  it("getLessonAvailability rejeita lição que não pertence à trilha", async () => {
    await expect(
      getLessonAvailability(student(), studentId, trackId, "lesson-inexistente"),
    ).rejects.toThrow(NotFoundError);
  });

  it("tentativa de pular bloqueio: submitLessonActivity/completeLesson na 2ª lição funcionam via execução direta (o bloqueio é informativo de navegação, não um gate de execução) — mas a disponibilidade nunca muda sem concluir a 1ª", async () => {
    // O desbloqueio (seção 19/20) é sobre NAVEGAÇÃO/exibição — a execução em
    // si já é protegida por outra regra (lição PUBLICADA, seção 13). Mesmo
    // que o aluno acesse a 2ª lição diretamente, a trilha continua marcando
    // a 2ª como LOCKED enquanto a 1ª não for concluída — é essa afirmação
    // que este teste protege.
    const beforeAvailability = await getTrackLessonAvailability(other(), otherStudentId, trackId);
    expect(beforeAvailability[1].status).toBe("LOCKED");
  });

  it("concluir a 1ª lição libera a 2ª (AVAILABLE)", async () => {
    await startLesson(student(), lesson1Id);
    await submitLessonActivity(student(), { lessonId: lesson1Id, blockId: lesson1BlockId });
    await completeLesson(student(), lesson1Id);

    const availability = await getTrackLessonAvailability(student(), studentId, trackId);
    expect(availability[0].status).toBe("COMPLETED");
    expect(availability[1].status).toBe("AVAILABLE");
    expect(availability[1].reason).toContain("lição anterior");
  });

  it("privacidade: outro aluno não pode consultar a disponibilidade de terceiro", async () => {
    await expect(getTrackLessonAvailability(other(), studentId, trackId)).rejects.toThrow(
      AuthorizationError,
    );
  });

  afterAll(async () => {
    await cleanupFixtures({
      citationIds,
      lessonIds,
      pedagogyStageIds,
      unitIds,
      learningAreaIds,
      trackIds,
      sourceIds,
      userIds,
    });
    await prisma.$disconnect();
  });
});
