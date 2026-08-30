import { describe, it, expect } from "vitest";
import { assertRole, AuthorizationError, CURATOR_ROLES, PUBLISHER_ROLES } from "./authorize";
import { Role } from "@/generated/prisma/enums";

describe("assertRole", () => {
  it("permite quando o papel do actor está na lista permitida", () => {
    expect(() =>
      assertRole({ userId: "u1", role: Role.CONTENT_EDITOR }, CURATOR_ROLES),
    ).not.toThrow();
    expect(() => assertRole({ userId: "u1", role: Role.ADMIN }, PUBLISHER_ROLES)).not.toThrow();
  });

  it("rejeita STUDENT para operações de curadoria", () => {
    expect(() => assertRole({ userId: "u1", role: Role.STUDENT }, CURATOR_ROLES)).toThrow(
      AuthorizationError,
    );
  });

  it("rejeita CONTENT_EDITOR para operações restritas a ADMIN (ex.: publicação)", () => {
    expect(() => assertRole({ userId: "u1", role: Role.CONTENT_EDITOR }, PUBLISHER_ROLES)).toThrow(
      AuthorizationError,
    );
  });
});
