"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can, ROLE_RANK } from "@/lib/rbac";

const roleSchema = z.enum(["ADMIN", "VP", "DIRECTOR", "SUPERVISOR", "MANAGER", "BROKER"]);

export async function updateUserHierarchy(userId: string, formData: FormData) {
  const actor = await requireUser();
  if (!can(actor.role, "hierarchy:manage")) throw new Error("Apenas VP/Admin podem alterar a estrutura organizacional.");

  const role = roleSchema.parse(formData.get("role"));
  let parentId = String(formData.get("parentId") || "") || null;
  const requestedDirectorate = String(formData.get("directorate") || "").trim() || null;
  const team = String(formData.get("team") || "").trim() || null;

  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: actor.organizationId },
    include: { children: { select: { id: true, role: true } } },
  });
  if (!target) throw new Error("Usuário não encontrado.");

  if (role === "ADMIN" || role === "VP") parentId = null;
  if (target.id === actor.id && parentId) throw new Error("Você não pode definir a si mesmo como subordinado.");

  let parent = null;
  if (parentId) {
    parent = await prisma.user.findFirst({
      where: { id: parentId, organizationId: actor.organizationId, isActive: true },
    });
    if (!parent || parent.id === target.id) throw new Error("Superior inválido.");
    if (ROLE_RANK[parent.role] <= ROLE_RANK[role]) throw new Error("O superior precisa ter um cargo acima do subordinado.");

    const visited = new Set<string>();
    let cursor = parent;
    while (cursor.parentId) {
      if (cursor.parentId === target.id) throw new Error("Esta alteração criaria um ciclo na hierarquia.");
      if (visited.has(cursor.id)) throw new Error("A estrutura atual contém um ciclo e precisa ser corrigida.");
      visited.add(cursor.id);
      const next = await prisma.user.findFirst({ where: { id: cursor.parentId, organizationId: actor.organizationId } });
      if (!next) break;
      cursor = next;
    }
  }

  if (target.children.some((child) => ROLE_RANK[child.role] >= ROLE_RANK[role])) {
    throw new Error("O novo cargo ficaria igual ou abaixo de um subordinado direto existente.");
  }

  let directorate = requestedDirectorate;
  if (role === "DIRECTOR" && !directorate) throw new Error("Diretores precisam estar vinculados a uma diretoria.");
  if (["SUPERVISOR", "MANAGER", "BROKER"].includes(role) && parent?.directorate) directorate = parent.directorate;

  await prisma.user.update({
    where: { id: userId },
    data: { role, parentId, directorate, team },
  });

  revalidatePath("/admin");
  revalidatePath("/equipe");
  revalidatePath("/");
}
