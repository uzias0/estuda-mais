/**
 * Teste de integração real do mock de desenvolvimento (Módulo 11/12) —
 * confirma que é idempotente (mesma linha reaproveitada) e que devolve
 * sempre o papel esperado — `Role.STUDENT` para `getCurrentActor`,
 * `Role.ADMIN` para `getCurrentAdminActor` — nunca um do outro.
 */
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/db";
import { Role } from "@/generated/prisma/enums";
import { getCurrentActor, getCurrentAdminActor } from "./devActor";

describe("getCurrentActor (mock de desenvolvimento)", () => {
  it("cria o usuário de desenvolvimento na primeira chamada e reaproveita nas seguintes", async () => {
    const first = await getCurrentActor();
    const second = await getCurrentActor();

    expect(first.userId).toBe(second.userId);
    expect(first.role).toBe(Role.STUDENT);

    const rows = await prisma.user.count({ where: { email: "dev.student@estuda.local" } });
    expect(rows).toBe(1); // nunca duplica a linha.
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});

describe("getCurrentAdminActor (mock de desenvolvimento — Módulo 12)", () => {
  it("cria o curador de desenvolvimento na primeira chamada, reaproveita nas seguintes, sempre ADMIN", async () => {
    const first = await getCurrentAdminActor();
    const second = await getCurrentAdminActor();

    expect(first.userId).toBe(second.userId);
    expect(first.role).toBe(Role.ADMIN);

    const rows = await prisma.user.count({ where: { email: "dev.curator@estuda.local" } });
    expect(rows).toBe(1);
  });

  it("é um usuário distinto do ator de desenvolvimento do aluno", async () => {
    const student = await getCurrentActor();
    const admin = await getCurrentAdminActor();
    expect(student.userId).not.toBe(admin.userId);
  });
});
