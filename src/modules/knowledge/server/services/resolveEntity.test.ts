import { describe, it, expect, afterAll } from "vitest";
import { resolveEntity, entityExists, SUPPORTED_KNOWLEDGE_ENTITY_TYPES } from "./resolveEntity";
import { createFixtureDiscipline, cleanupFixtures } from "@/test/fixtures";
import { prisma } from "@/server/db";

describe("resolveEntity", () => {
  const disciplineIds: string[] = [];

  it("reconhece todos os KnowledgeEntityType suportados", () => {
    expect(SUPPORTED_KNOWLEDGE_ENTITY_TYPES).toEqual(
      expect.arrayContaining([
        "PERSON",
        "WORK",
        "THEORY",
        "CONCEPT",
        "SCHOOL",
        "DISCIPLINE",
        "PERIOD",
        "DEVELOPMENTAL_STAGE",
      ]),
    );
  });

  it("retorna null para um type desconhecido, sem tocar o banco", async () => {
    const result = await resolveEntity("NAO_EXISTE", "qualquer-id");
    expect(result).toBeNull();
  });

  it("retorna null para um id inexistente de um type suportado", async () => {
    const result = await resolveEntity("DISCIPLINE", "id-que-nao-existe-jamais");
    expect(result).toBeNull();
  });

  it("resolve uma entidade real quando type+id existem", async () => {
    const discipline = await createFixtureDiscipline("resolve-ok");
    disciplineIds.push(discipline.id);

    const resolved = await resolveEntity("DISCIPLINE", discipline.id);
    expect(resolved).not.toBeNull();
    expect(resolved?.id).toBe(discipline.id);

    expect(await entityExists("DISCIPLINE", discipline.id)).toBe(true);
  });

  afterAll(async () => {
    await cleanupFixtures({ disciplineIds });
    await prisma.$disconnect();
  });
});
