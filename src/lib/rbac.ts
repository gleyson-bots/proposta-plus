import type { User, UserRole } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

export type Permission =
  | "dashboard:view"
  | "clients:view"
  | "clients:create"
  | "clients:update"
  | "proposals:view"
  | "proposals:create"
  | "proposals:update"
  | "team:view"
  | "team:assign"
  | "hierarchy:manage"
  | "chat:view"
  | "chat:create"
  | "assignments:create"
  | "assignments:update"
  | "admin:view";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  VP: "VP",
  DIRECTOR: "Diretor",
  SUPERVISOR: "Supervisor",
  MANAGER: "Gerente",
  BROKER: "Corretor",
};

const permissions: Record<UserRole, Permission[] | "*"> = {
  ADMIN: "*",
  VP: "*",
  DIRECTOR: [
    "dashboard:view", "clients:view", "clients:create", "clients:update",
    "proposals:view", "proposals:create", "proposals:update",
    "team:view", "team:assign", "chat:view", "chat:create",
    "assignments:create", "assignments:update",
  ],
  SUPERVISOR: [
    "dashboard:view", "clients:view", "clients:create", "clients:update",
    "proposals:view", "proposals:create", "proposals:update",
    "team:view", "team:assign", "chat:view", "chat:create",
    "assignments:create", "assignments:update",
  ],
  MANAGER: [
    "dashboard:view", "clients:view", "clients:create", "clients:update",
    "proposals:view", "proposals:create", "proposals:update",
    "team:view", "team:assign", "chat:view", "chat:create",
    "assignments:create", "assignments:update",
  ],
  BROKER: [
    "dashboard:view", "clients:view", "clients:create", "clients:update",
    "proposals:view", "proposals:create", "proposals:update",
    "chat:view", "chat:create", "assignments:create", "assignments:update",
  ],
};

export function can(role: UserRole, permission: Permission) {
  const allowed = permissions[role];
  return allowed === "*" || allowed.includes(permission);
}

function descendantsOf(rootId: string, users: Array<Pick<User, "id" | "parentId">>) {
  const result = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const user of users) {
      if (user.parentId && result.has(user.parentId) && !result.has(user.id)) {
        result.add(user.id);
        changed = true;
      }
    }
  }
  return [...result];
}

function ancestorsOf(user: Pick<User, "id" | "parentId">, users: Array<Pick<User, "id" | "parentId">>) {
  const byId = new Map(users.map((item) => [item.id, item]));
  const result = new Set<string>();
  let current = user.parentId ? byId.get(user.parentId) : undefined;
  while (current) {
    result.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return [...result];
}

export async function getManagedUserIds(actor: User) {
  const users = await prisma.user.findMany({
    where: { organizationId: actor.organizationId, isActive: true },
    select: { id: true, parentId: true },
  });
  if (actor.role === "ADMIN" || actor.role === "VP") return users.map((user) => user.id);
  return descendantsOf(actor.id, users);
}

export async function getChatReachableUsers(actor: User) {
  const users = await prisma.user.findMany({
    where: { organizationId: actor.organizationId, isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  if (actor.role === "ADMIN" || actor.role === "VP") return users;

  const managed = new Set(descendantsOf(actor.id, users));
  const ancestors = new Set(ancestorsOf(actor, users));

  return users.filter((candidate) => {
    if (candidate.id === actor.id || managed.has(candidate.id) || ancestors.has(candidate.id)) return true;
    if (actor.team && candidate.team === actor.team) return true;
    if (actor.role === "DIRECTOR" && actor.directorate && candidate.directorate === actor.directorate) return true;
    return false;
  });
}

export async function canManageUser(actor: User, targetId: string) {
  return (await getManagedUserIds(actor)).includes(targetId);
}
