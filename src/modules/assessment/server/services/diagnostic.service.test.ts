/**
 * Testes de integração reais — Diagnóstico inicial (Módulo 3, seção 45):
 * seleção de questões, quantidade configurada, diversidade, registro de
 * respostas, cálculo de score/nível, conceitos fortes/fracos, recomendação,
 * usuário sem/com histórico, não manipulação do resultado pelo cliente.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role, KnowledgeEntityType } from "@/generated/prisma/enums";
import { DiagnosticError } from "./errors";
import {
  startDiagnostic,
  submitDiagnosticAnswer,
  finishDiagnostic,
  getDiagnosticResult,
} from "./diagnostic.service";
import { linkQuestionToKnowledge, publishQuestion } from "./question.service";
import {
  createFixtureUser,
  createFixtureSource,
  createFixtureConcept,
  createFixtureMultipleChoiceQuestion,
  cleanupFixtures,
} from "@/test/fixtures";

/**
 * Monta um `answerData` correto/incorreto para QUALQUER um dos 8
 * `QuestionType` suportados pelo sistema — não só MULTIPLE_CHOICE.
 *
 * Necessário porque `startDiagnostic` seleciona questões do pool GLOBAL de
 * questões publicadas e tagueadas (ver `diagnostic.service.ts`, consulta
 * sem filtro por `type`), não só das fixtures `MULTIPLE_CHOICE` criadas
 * neste arquivo. Com conteúdo acadêmico real de tipos variados agora
 * também publicado e tagueado (fase de expansão —
 * `scripts/seed-academic-content-v2.ts`), o diagnóstico pode legitimamente
 * sortear uma questão MATCHING/FILL_BLANK/SHORT_ANSWER/ORDERING/
 * MULTI_SELECT/TRUE_FALSE/CASE_STUDY — assumir MULTIPLE_CHOICE (como este
 * arquivo assumia antes) quebra de forma intermitente, dependendo do sorteio.
 * Mesmo padrão de correção de causa raiz já usado em
 * `next-learning-step.service.test.ts` (ver `docs/FASE-CONTEUDO-ACADEMICO.md`,
 * seção 14): o teste passa a verificar o contrato real (qualquer tipo válido
 * de questão), em vez de assumir uma condição que só era verdadeira por o
 * banco ainda não ter conteúdo real diverso.
 */
async function buildAnswerData(
  questionId: string,
  opts: { correct: boolean },
): Promise<Record<string, unknown>> {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: { options: true },
  });
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
    case "CASE_STUDY": {
      const option = question.options.find((o) => o.isCorrect === opts.correct);
      if (!option) {
        throw new Error(
          `Questão "${questionId}" (${question.type}) não tem alternativa ${
            opts.correct ? "correta" : "incorreta"
          }.`,
        );
      }
      return { type: question.type, selectedOptionId: option.id };
    }
    case "MULTI_SELECT": {
      const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
      const incorrectIds = question.options.filter((o) => !o.isCorrect).map((o) => o.id);
      return {
        type: "MULTI_SELECT",
        selectedOptionIds: opts.correct ? correctIds : incorrectIds.slice(0, 1),
      };
    }
    case "ORDERING": {
      const correctSequence = [...question.options]
        .sort((a, b) => a.order - b.order)
        .map((o) => o.id);
      return {
        type: "ORDERING",
        orderedOptionIds: opts.correct ? correctSequence : [...correctSequence].reverse(),
      };
    }
    case "MATCHING": {
      const answerKey = question.answerKey as { pairs: Array<{ left: string; right: string }> };
      return {
        type: "MATCHING",
        pairs: opts.correct
          ? answerKey.pairs
          : answerKey.pairs.map((p) => ({ left: p.left, right: "___resposta_incorreta___" })),
      };
    }
    case "FILL_BLANK": {
      const answerKey = question.answerKey as { blanks: Array<{ accepted: string[] }> };
      return {
        type: "FILL_BLANK",
        answers: opts.correct
          ? answerKey.blanks.map((b) => b.accepted[0])
          : answerKey.blanks.map(() => "___resposta_incorreta___"),
      };
    }
    case "SHORT_ANSWER": {
      const answerKey = question.answerKey as { accepted: string[] };
      return {
        type: "SHORT_ANSWER",
        text: opts.correct ? answerKey.accepted[0] : "___resposta_incorreta___",
      };
    }
    default:
      throw new Error(`Tipo de questão não suportado no teste: "${question.type}".`);
  }
}

describe("Diagnostic service", () => {
  let sourceId: string;
  const sourceIds: string[] = [];
  const userIds: string[] = [];
  const conceptIds: string[] = [];
  const questionIds: string[] = [];
  const studySessionIds: string[] = [];

  beforeAll(async () => {
    const source = await createFixtureSource("diagnostic");
    sourceId = source.id;
    sourceIds.push(sourceId);
  });

  afterAll(async () => {
    await cleanupFixtures({ studySessionIds, questionIds, conceptIds, sourceIds, userIds });
    await prisma.$disconnect();
  });

  describe("seleção, diversidade e execução", () => {
    let studentId: string;
    let editorId: string;
    let adminId: string;
    const localConceptIds: string[] = [];
    const localQuestionIds: string[] = [];

    beforeAll(async () => {
      const student = await createFixtureUser("diag-select-student", Role.STUDENT);
      const editor = await createFixtureUser("diag-select-editor", Role.CONTENT_EDITOR);
      const admin = await createFixtureUser("diag-select-admin", Role.ADMIN);
      studentId = student.id;
      editorId = editor.id;
      adminId = admin.id;
      userIds.push(studentId, editorId, adminId);

      const difficulties = ["INICIANTE", "BASICO", "INTERMEDIARIO", "AVANCADO"] as const;
      for (let c = 0; c < 3; c++) {
        const concept = await createFixtureConcept(`diag-select-${c}`);
        localConceptIds.push(concept.id);
        conceptIds.push(concept.id);
        for (let d = 0; d < 4; d++) {
          const question = await createFixtureMultipleChoiceQuestion(
            `diag-select-${c}-${d}`,
            sourceId,
            {
              difficulty: difficulties[d],
              correctIndex: 0,
            },
          );
          localQuestionIds.push(question.id);
          questionIds.push(question.id);
          await linkQuestionToKnowledge(
            { userId: editorId, role: Role.CONTENT_EDITOR },
            question.id,
            {
              entityType: "CONCEPT",
              entityId: concept.id,
            },
          );
          await publishQuestion({ userId: adminId, role: Role.ADMIN }, question.id);
        }
      }
    });

    it("seleciona exatamente a quantidade configurada, respeitando o teto por conceito", async () => {
      // 3 conceitos * teto de 2 = 6 — cabe exatamente sem precisar relaxar o teto.
      const { sessionId, questions } = await startDiagnostic(
        { userId: studentId, role: Role.STUDENT },
        6,
      );
      studySessionIds.push(sessionId);

      expect(questions).toHaveLength(6);

      const tags = await prisma.questionKnowledgeTag.findMany({
        where: {
          questionId: { in: questions.map((q) => q.id) },
          entityType: KnowledgeEntityType.CONCEPT,
        },
      });
      const perConcept = new Map<string, number>();
      for (const t of tags) perConcept.set(t.entityId, (perConcept.get(t.entityId) ?? 0) + 1);
      for (const count of perConcept.values()) {
        expect(count).toBeLessThanOrEqual(2);
      }
    });

    it("a visão pública da questão nunca inclui isCorrect/answerKey", async () => {
      const { sessionId, questions } = await startDiagnostic(
        { userId: studentId, role: Role.STUDENT },
        3,
      );
      studySessionIds.push(sessionId);
      for (const q of questions) {
        expect(q).not.toHaveProperty("answerKey");
        for (const option of q.options) {
          expect(option).not.toHaveProperty("isCorrect");
        }
      }
    });

    it("registra respostas e calcula resultado determinístico (score, nível, fortes/fracas, recomendação)", async () => {
      const { sessionId, questions } = await startDiagnostic(
        { userId: studentId, role: Role.STUDENT },
        4,
      );
      studySessionIds.push(sessionId);

      // responde a 1ª certa, as demais erradas — resultado esperado: 1/4 = 25%.
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const answerData = await buildAnswerData(q.id, { correct: i === 0 });
        await submitDiagnosticAnswer(
          { userId: studentId, role: Role.STUDENT },
          {
            sessionId,
            questionId: q.id,
            answerData: answerData as never,
            timeSpentMs: 1000,
          },
        );
      }

      const result = await finishDiagnostic({ userId: studentId, role: Role.STUDENT }, sessionId);
      expect(result.questionsAnswered).toBe(4);
      expect(result.correctCount).toBe(1);
      expect(result.percentage).toBeCloseTo(25, 5);
      expect(result.level).toBe("BASICO"); // 25% cai na faixa 21–40% (config MASTERY_BANDS)

      // chamar de novo deve devolver exatamente o mesmo resultado (determinístico)
      const again = await getDiagnosticResult({ userId: studentId, role: Role.STUDENT }, sessionId);
      expect(again).toEqual(result);
    });

    it("não permite responder a mesma questão duas vezes na mesma sessão", async () => {
      const { sessionId, questions } = await startDiagnostic(
        { userId: studentId, role: Role.STUDENT },
        2,
      );
      studySessionIds.push(sessionId);
      const q = questions[0];
      const answerData = await buildAnswerData(q.id, { correct: true });

      await submitDiagnosticAnswer(
        { userId: studentId, role: Role.STUDENT },
        {
          sessionId,
          questionId: q.id,
          answerData: answerData as never,
          timeSpentMs: 1,
        },
      );
      await expect(
        submitDiagnosticAnswer(
          { userId: studentId, role: Role.STUDENT },
          {
            sessionId,
            questionId: q.id,
            answerData: answerData as never,
            timeSpentMs: 1,
          },
        ),
      ).rejects.toThrow(DiagnosticError);
    });

    it("não permite responder após o diagnóstico ser finalizado", async () => {
      const { sessionId, questions } = await startDiagnostic(
        { userId: studentId, role: Role.STUDENT },
        2,
      );
      studySessionIds.push(sessionId);
      await finishDiagnostic({ userId: studentId, role: Role.STUDENT }, sessionId);

      const answerData = await buildAnswerData(questions[0].id, { correct: true });
      await expect(
        submitDiagnosticAnswer(
          { userId: studentId, role: Role.STUDENT },
          {
            sessionId,
            questionId: questions[0].id,
            answerData: answerData as never,
            timeSpentMs: 1,
          },
        ),
      ).rejects.toThrow(DiagnosticError);
    });

    it("outro usuário não consegue ver/responder a sessão de diagnóstico alheia (segurança)", async () => {
      const intruder = await createFixtureUser("diag-intruder", Role.STUDENT);
      userIds.push(intruder.id);

      const { sessionId, questions } = await startDiagnostic(
        { userId: studentId, role: Role.STUDENT },
        2,
      );
      studySessionIds.push(sessionId);

      await expect(
        getDiagnosticResult({ userId: intruder.id, role: Role.STUDENT }, sessionId),
      ).rejects.toThrow(DiagnosticError);
      const answerData = await buildAnswerData(questions[0].id, { correct: true });
      await expect(
        submitDiagnosticAnswer(
          { userId: intruder.id, role: Role.STUDENT },
          {
            sessionId,
            questionId: questions[0].id,
            answerData: answerData as never,
            timeSpentMs: 1,
          },
        ),
      ).rejects.toThrow(DiagnosticError);
    });

    it("resultado reflete a correção real do servidor mesmo com resposta deliberadamente errada", async () => {
      const { sessionId, questions } = await startDiagnostic(
        { userId: studentId, role: Role.STUDENT },
        1,
      );
      studySessionIds.push(sessionId);
      const wrongAnswerData = await buildAnswerData(questions[0].id, { correct: false });

      const { isCorrect } = await submitDiagnosticAnswer(
        { userId: studentId, role: Role.STUDENT },
        {
          sessionId,
          questionId: questions[0].id,
          answerData: wrongAnswerData as never,
          timeSpentMs: 1,
        },
      );
      expect(isCorrect).toBe(false);
      const result = await finishDiagnostic({ userId: studentId, role: Role.STUDENT }, sessionId);
      expect(result.correctCount).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  describe("usuário sem histórico vs. com histórico", () => {
    let studentId: string;
    let editorId: string;
    let adminId: string;
    const localQuestionIds: string[] = [];

    beforeAll(async () => {
      const student = await createFixtureUser("diag-history-student", Role.STUDENT);
      const editor = await createFixtureUser("diag-history-editor", Role.CONTENT_EDITOR);
      const admin = await createFixtureUser("diag-history-admin", Role.ADMIN);
      studentId = student.id;
      editorId = editor.id;
      adminId = admin.id;
      userIds.push(studentId, editorId, adminId);

      const concept = await createFixtureConcept("diag-history");
      conceptIds.push(concept.id);

      // 8 questões de um único conceito — teto de diversidade não atrapalha
      // porque cada rodada pede só 4 (bem abaixo do total disponível).
      for (let i = 0; i < 8; i++) {
        const question = await createFixtureMultipleChoiceQuestion(`diag-history-${i}`, sourceId, {
          correctIndex: 0,
        });
        localQuestionIds.push(question.id);
        questionIds.push(question.id);
        await linkQuestionToKnowledge(
          { userId: editorId, role: Role.CONTENT_EDITOR },
          question.id,
          {
            entityType: "CONCEPT",
            entityId: concept.id,
          },
        );
        await publishQuestion({ userId: adminId, role: Role.ADMIN }, question.id);
      }
    });

    it("usuário sem histórico: primeira rodada não exclui nada (pool cheio disponível)", async () => {
      const { sessionId, questions } = await startDiagnostic(
        { userId: studentId, role: Role.STUDENT },
        4,
      );
      studySessionIds.push(sessionId);
      expect(questions).toHaveLength(4);
      expect(new Set(questions.map((q) => q.id)).size).toBe(4);
    });

    it("usuário com histórico: segunda rodada evita repetir as já respondidas na primeira", async () => {
      const first = await startDiagnostic({ userId: studentId, role: Role.STUDENT }, 4);
      studySessionIds.push(first.sessionId);
      for (const q of first.questions) {
        const answerData = await buildAnswerData(q.id, { correct: true });
        await submitDiagnosticAnswer(
          { userId: studentId, role: Role.STUDENT },
          {
            sessionId: first.sessionId,
            questionId: q.id,
            answerData: answerData as never,
            timeSpentMs: 1,
          },
        );
      }
      await finishDiagnostic({ userId: studentId, role: Role.STUDENT }, first.sessionId);

      const second = await startDiagnostic({ userId: studentId, role: Role.STUDENT }, 4);
      studySessionIds.push(second.sessionId);

      const firstIds = new Set(first.questions.map((q) => q.id));
      const overlap = second.questions.filter((q) => firstIds.has(q.id));
      expect(overlap).toHaveLength(0);
    });
  });
});
