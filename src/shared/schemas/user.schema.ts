import { z } from "zod";
import { Role, StudyMode } from "@/generated/prisma/enums";
import { zodEnumFromPrisma } from "./zod-enum";

export const RoleSchema = zodEnumFromPrisma(Role);
export const StudyModeSchema = zodEnumFromPrisma(StudyMode);

/** Entrada para criar um `User` — campos gerados (id, createdAt) ficam de fora. */
export const UserCreateInputSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(1).optional(),
  role: RoleSchema.default(Role.STUDENT),
});
// z.input, não z.infer/z.output: `role` tem `.default(...)` — opcional para
// quem chama, mesmo aparecendo como obrigatório no tipo de saída do Zod.
export type UserCreateInput = z.input<typeof UserCreateInputSchema>;

/** Entrada para criar um `Profile` — 1:1 com User via `userId`. */
export const ProfileCreateInputSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(160),
  avatarUrl: z.string().url().optional(),
  preferredMode: StudyModeSchema.default(StudyMode.FORMACAO),
});
// idem — `preferredMode` tem `.default(...)`.
export type ProfileCreateInput = z.input<typeof ProfileCreateInputSchema>;
