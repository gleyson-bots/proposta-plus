import type { User } from "../drizzle/schema";

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "admin";
}

export function canAccessOwnerRecord(
  user: Pick<User, "id" | "role">,
  ownerUserId: number,
): boolean {
  return isAdmin(user) || user.id === ownerUserId;
}

export function assertOwnerAccess(
  user: Pick<User, "id" | "role">,
  ownerUserId: number,
) {
  if (!canAccessOwnerRecord(user, ownerUserId)) {
    throw new Error("Não tem permissão para aceder a este registo.");
  }
}
