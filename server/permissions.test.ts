import { describe, expect, it } from "vitest";
import { assertOwnerAccess, canAccessOwnerRecord, isAdmin } from "./permissions";

describe("permissões de registos comerciais", () => {
  const owner = { id: 10, role: "user" as const };
  const otherUser = { id: 11, role: "user" as const };
  const administrator = { id: 12, role: "admin" as const };

  it("reconhece administradores", () => {
    expect(isAdmin(administrator)).toBe(true);
    expect(isAdmin(owner)).toBe(false);
  });

  it("autoriza o proprietário e o administrador, mas não outro utilizador", () => {
    expect(canAccessOwnerRecord(owner, 10)).toBe(true);
    expect(canAccessOwnerRecord(administrator, 10)).toBe(true);
    expect(canAccessOwnerRecord(otherUser, 10)).toBe(false);
  });

  it("interrompe o acesso não autorizado", () => {
    expect(() => assertOwnerAccess(otherUser, 10)).toThrow("Não tem permissão");
  });
});
