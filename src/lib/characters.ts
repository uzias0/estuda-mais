/**
 * Resolve qual personagem representar para uma `School` (etapa de
 * consolidação, seção 5 do prompt: "a associação deve ser baseada nos
 * dados existentes do domínio... quando não houver personagem apropriado,
 * usar personagem neutro"). Só usa um personagem específico quando existe
 * de fato uma `School` PUBLICADA com aquele slug — nunca infere por
 * similaridade de texto nem inventa associação.
 */
import { prisma } from "@/server/db";
import { CHARACTERS, NEUTRAL_CHARACTER, type CharacterDef } from "@/config/characters";

const SCHOOL_SLUG_TO_CHARACTER = new Map<string, CharacterDef>(
  Object.values(CHARACTERS)
    .filter((c) => c.schoolSlug)
    .map((c) => [c.schoolSlug!, c]),
);

export async function resolveCharacterForSchoolSlug(
  schoolSlug: string | null | undefined,
): Promise<CharacterDef> {
  if (!schoolSlug) return NEUTRAL_CHARACTER;
  const candidate = SCHOOL_SLUG_TO_CHARACTER.get(schoolSlug);
  if (!candidate) return NEUTRAL_CHARACTER;

  const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
  if (!school || school.status !== "PUBLISHED") return NEUTRAL_CHARACTER;
  return candidate;
}

/**
 * Resolve o personagem de uma `Lesson` a partir do conhecimento que ela
 * ensina (fase "povoamento acadêmico real", seção 14: "os personagens devem
 * aparecer organicamente... Freud associado à Psicanálise..."). Percorre
 * `LessonKnowledgeTag` (CONCEPT) → `Concept.theories` → `Theory.schools`
 * (relações N:N já existentes, nenhuma nova) e usa o primeiro `School`
 * encontrado; sem conceito/teoria/escola associado (ou `School` ainda não
 * publicada), cai no personagem neutro — nunca inventa uma associação.
 */
export async function resolveCharacterForLesson(lesson: {
  knowledgeTags: Array<{ entityType: string; entityId: string }>;
}): Promise<CharacterDef> {
  const conceptTag = lesson.knowledgeTags.find((t) => t.entityType === "CONCEPT");
  if (!conceptTag) return NEUTRAL_CHARACTER;

  const concept = await prisma.concept.findUnique({
    where: { id: conceptTag.entityId },
    include: { theories: { include: { schools: true } } },
  });
  const schoolSlug = concept?.theories.flatMap((t) => t.schools)[0]?.slug;
  return resolveCharacterForSchoolSlug(schoolSlug);
}
