import type { User } from "@/generated/prisma/client";
import { getManagedUserIds } from "@/lib/rbac";

export async function getDataScope(actor: User) {
  if (actor.role === "ADMIN" || actor.role === "VP") {
    return { organizationId: actor.organizationId };
  }

  return {
    organizationId: actor.organizationId,
    ownerId: { in: await getManagedUserIds(actor) },
  };
}
