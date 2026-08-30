/**
 * Prisma 7 (provider "prisma-client") gera enums como objeto `const` + tipo
 * união (`{ FOO: "FOO" } as const`), não como `enum` clássico do TypeScript —
 * ver src/generated/prisma/enums.ts. Este helper converte esse formato para
 * o array de literais que `z.enum` espera, num único lugar.
 */
import { z } from "zod";

export function zodEnumFromPrisma<T extends Record<string, string>>(prismaEnum: T) {
  const values = Object.values(prismaEnum) as [T[keyof T], ...T[keyof T][]];
  return z.enum(values);
}
