/**
 * Fase "Biblioteca de Pessoas" — pedido do usuário: "eu vou fazer, pra
 * você, uma imagem de cada um pra você usar, porque ficou muito ruim".
 * O usuário mandou uma ilustração real por pessoa (extraída do chat,
 * recortada e com fundo removido — ver `docs/FASE-BIBLIOTECA-PESSOAS.md`)
 * — este módulo só grava o caminho de cada arquivo em
 * `AcademicPerson.imageUrl`, via `updateAcademicPerson` (Módulo 2,
 * nenhuma escrita direta no Prisma).
 *
 * Módulo compartilhado (não um script) — mesmo padrão de
 * `answer-length-bias-fix.service.ts`: usado tanto pelo CLI
 * (`scripts/fix-person-portraits.ts`) quanto pela Server Action
 * administrativa (`/admin/manutencao`, para quem não tem acesso a
 * terminal contra produção). Idempotente: rodar de novo só reaplica o
 * mesmo valor.
 */
import { prisma } from "@/server/db";
import type { Actor } from "@/server/auth/authorize";
import { updateAcademicPerson } from "@/modules/knowledge/server/services/academicPerson.service";

/**
 * slug (`AcademicPerson.slug`) -> caminho do arquivo em `public/people/`.
 * Todas as 20 pessoas da Base de Conhecimento têm arte agora, exceto
 * Lev Vygotsky — só recebeu a versão "mascote" (`public/characters/`,
 * fase "Arte Própria dos Personagens"), nunca uma folha no estilo
 * "Biblioteca de Pessoas"; os dois contextos usam arquivos distintos de
 * propósito, então o mascote não é reaproveitado aqui.
 */
export const PERSON_PORTRAITS: Record<string, string> = {
  "aaron-beck": "/people/aaron-beck.png",
  "abraham-maslow": "/people/abraham-maslow.png",
  "albert-bandura": "/people/albert-bandura.png",
  "anna-freud": "/people/anna-freud.png",
  "b-f-skinner": "/people/b-f-skinner.png",
  "carl-gustav-jung": "/people/carl-gustav-jung.png",
  "carl-rogers": "/people/carl-rogers.png",
  "donald-winnicott": "/people/donald-winnicott.png",
  "erik-erikson": "/people/erik-erikson.png",
  "ivan-pavlov": "/people/ivan-pavlov.png",
  "jean-piaget": "/people/jean-piaget.png",
  "john-b-watson": "/people/john-b-watson.png",
  "karen-horney": "/people/karen-horney.png",
  "kurt-lewin": "/people/kurt-lewin.png",
  "mary-ainsworth": "/people/mary-ainsworth.png",
  "melanie-klein": "/people/melanie-klein.png",
  "sigmund-freud": "/people/sigmund-freud.png",
  "wilhelm-wundt": "/people/wilhelm-wundt.png",
  "william-james": "/people/william-james.png",
};

export interface PersonPortraitFixResult {
  slug: string;
  name: string;
  status: "set" | "already-up-to-date" | "not-found";
}

export async function applyPersonPortraits(
  actor: Actor,
): Promise<{ updated: number; results: PersonPortraitFixResult[] }> {
  const results: PersonPortraitFixResult[] = [];
  let updated = 0;

  for (const [slug, imageUrl] of Object.entries(PERSON_PORTRAITS)) {
    const person = await prisma.academicPerson.findUnique({ where: { slug } });
    if (!person) {
      results.push({ slug, name: slug, status: "not-found" });
      continue;
    }
    if (person.imageUrl === imageUrl) {
      results.push({ slug, name: person.name, status: "already-up-to-date" });
      continue;
    }
    await updateAcademicPerson(actor, person.id, { imageUrl });
    results.push({ slug, name: person.name, status: "set" });
    updated++;
  }

  return { updated, results };
}
