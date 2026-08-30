/**
 * Teste de integração real da Server Action administrativa de questões
 * (Módulo 12) — confirma que o formulário genérico de alternativas
 * (`option_text_N`/`option_correct_N`) monta corretamente o `options` que
 * `question.service.ts` espera, e que a visão pública derivada
 * (`toPublicQuestionView`, Módulo 3) continua sem `isCorrect`/`answerKey`
 * mesmo para uma questão criada pela UI administrativa — mesmo contrato de
 * segurança do Módulo 11, agora também exercitado a partir do caminho de
 * curadoria.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import {
  createQuestionAction,
  publishQuestionAction,
  archiveQuestionAction,
} from "./questions-actions";
import { toPublicQuestionView } from "@/modules/assessment/server/services/questionQuery.service";
import { getCurrentAdminActor } from "@/server/auth/devActor";
import { loginAsUserId } from "@/test/authTestHelpers";
import { createFixtureSource, cleanupFixtures } from "@/test/fixtures";

/**
 * Captura o PATH do redirect (`NEXT_REDIRECT;<tipo>;<path>;<status>;`) em vez
 * de buscar a questão criada por texto do enunciado — mais robusto: não
 * depende do `prompt` ser único entre execuções (evita colisão com
 * eventuais linhas remanescentes de execuções anteriores da suíte).
 */
async function expectRedirectAndGetId(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    throw new Error("esperava um redirect (NEXT_REDIRECT)");
  } catch (e) {
    const digest = (e as { digest?: string })?.digest;
    if (typeof digest !== "string" || !digest.startsWith("NEXT_REDIRECT")) throw e;
    const path = digest.split(";")[2];
    const id = path.split("/").pop();
    if (!id) throw new Error(`não foi possível extrair o id do redirect: ${digest}`);
    return id;
  }
}

describe("questions-actions (Módulo 12)", () => {
  const questionIds: string[] = [];
  const sourceIds: string[] = [];

  it("cria uma questão MULTIPLE_CHOICE via FormData e a visão pública nunca inclui isCorrect/answerKey", async () => {
    await loginAsUserId((await getCurrentAdminActor()).userId);

    const source = await createFixtureSource("admin-question-action");
    sourceIds.push(source.id);

    const form = new FormData();
    form.set("type", "MULTIPLE_CHOICE");
    form.set("prompt", "TEST_FIXTURE: qual destas é a alternativa correta?");
    form.set("difficulty", "BASICO");
    form.set("sourceId", source.id);
    form.set("option_text_0", "Alternativa errada");
    form.set("option_text_1", "Alternativa certa");
    form.set("option_correct_1", "on");
    form.set("isCorrect", "true"); // campo forjado, não existe no payload real — deve ser ignorado

    const createdId = await expectRedirectAndGetId(() => createQuestionAction(form));
    questionIds.push(createdId);

    const created = await prisma.question.findUnique({
      where: { id: createdId },
      include: { options: true },
    });
    expect(created).not.toBeNull();
    expect(created!.reviewStatus).toBe("DRAFT");
    expect(created!.options).toHaveLength(2);
    const correctOption = created!.options.find((o) => o.isCorrect);
    expect(correctOption?.text).toBe("Alternativa certa");

    const publicView = toPublicQuestionView(created!);
    expect(publicView).not.toHaveProperty("answerKey");
    for (const opt of publicView.options) {
      expect(opt).not.toHaveProperty("isCorrect");
    }

    await publishQuestionAction(created!.id);
    const published = await prisma.question.findUnique({ where: { id: created!.id } });
    expect(published!.reviewStatus).toBe("PUBLISHED");

    await archiveQuestionAction(created!.id);
    const archived = await prisma.question.findUnique({ where: { id: created!.id } });
    expect(archived!.reviewStatus).toBe("ARCHIVED");
  });

  afterAll(async () => {
    await cleanupFixtures({ questionIds, sourceIds });
    await prisma.$disconnect();
  });
});
