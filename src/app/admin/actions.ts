"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";

const roleSchema = z.enum(["ADMIN", "VP", "DIRECTOR", "SUPERVISOR", "MANAGER", "BROKER"]);

export async function updateUserHierarchy(userId: string, formData: FormData) {
  const actor = await requireUser();
  if (!can(actor.role, "hierarchy:manage")) throw new Error("Apenas VP/Admin podem alterar a estrutura organizacional.");

  const role = roleSchema.parse(formData.get("role"));
  const parentId = String(formData.get("parentId") || "") || null;
  const directorate = String(formData.get("directorate") || "").trim() || null;
  const team = String(formData.get("team") || "").trim() || null;

  const target = await prisma.user.findFirst({ where: { id: userId, organizationId: actor.organizationId } });
  if (!target) throw new Error("Usuário não encontrado.");
  if (target.id === actor.id && parentId) throw new Error("Você não pode definir a si mesmo como subordinado.");

  if (parentId) {
    const parent = await prisma.user.findFirst({ where: { id: parentId, organizationId: actor.organizationId, isActive: true } });
    if (!parent || parent.id === target.id) throw new Error("Superior inválido.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role, parentId, directorate, team },
  });

  revalidatePath("/admin");
  revalidatePath("/equipe");
}
