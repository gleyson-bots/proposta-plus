"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser, SESSION_COOKIE } from "@/lib/auth";
import { can, canManageUser, getChatReachableUsers, getManagedUserIds } from "@/lib/rbac";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.parse({ email: formData.get("email"), password: formData.get("password") });
  const user = await prisma.user.findFirst({ where: { email: parsed.email, isActive: true } });
  if (!user) throw new Error("Perfil de teste não encontrado.");

  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  redirect("/");
}

export async function logout() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

const clientSchema = z.object({
  name: z.string().trim().min(2),
  company: z.string().trim().optional(),
  email: z.string().trim().email().or(z.literal("")).optional(),
  phone: z.string().trim().optional(),
});

export async function createClient(formData: FormData) {
  const actor = await requireUser();
  if (!can(actor.role, "clients:create")) throw new Error("Sem permissão para criar clientes.");

  const parsed = clientSchema.parse({
    name: formData.get("name"), company: formData.get("company"),
    email: formData.get("email"), phone: formData.get("phone"),
  });

  await prisma.client.create({
    data: {
      organizationId: actor.organizationId,
      ownerId: actor.id,
      name: parsed.name,
      company: parsed.company || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
    },
  });
  revalidatePath("/clientes");
  redirect("/clientes");
}

const proposalSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(3),
  description: z.string().trim().min(2),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  validUntil: z.string().optional(),
  notes: z.string().trim().optional(),
});

export async function createProposal(formData: FormData) {
  const actor = await requireUser();
  if (!can(actor.role, "proposals:create")) throw new Error("Sem permissão para criar propostas.");

  const parsed = proposalSchema.parse({
    clientId: formData.get("clientId"), title: formData.get("title"),
    description: formData.get("description"), quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"), validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
  });

  const managedIds = await getManagedUserIds(actor);
  const client = await prisma.client.findFirst({
    where: {
      id: parsed.clientId,
      organizationId: actor.organizationId,
      OR: [{ ownerId: null }, { ownerId: { in: managedIds } }],
    },
  });
  if (!client) throw new Error("Cliente fora do seu escopo.");

  const proposal = await prisma.proposal.create({
    data: {
      organizationId: actor.organizationId,
      ownerId: actor.id,
      clientId: client.id,
      title: parsed.title,
      validUntil: parsed.validUntil ? new Date(`${parsed.validUntil}T12:00:00`) : null,
      notes: parsed.notes || null,
      items: { create: { description: parsed.description, quantity: parsed.quantity, unitPrice: parsed.unitPrice } },
    },
  });

  revalidatePath("/");
  revalidatePath("/propostas");
  redirect(`/propostas/${proposal.id}`);
}

export async function updateProposalStatus(id: string, status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED") {
  const actor = await requireUser();
  if (!can(actor.role, "proposals:update")) throw new Error("Sem permissão para alterar propostas.");
  const managedIds = await getManagedUserIds(actor);
  const proposal = await prisma.proposal.findFirst({
    where: { id, organizationId: actor.organizationId, OR: [{ ownerId: null }, { ownerId: { in: managedIds } }] },
  });
  if (!proposal) throw new Error("Proposta fora do seu escopo.");

  await prisma.proposal.update({
    where: { id },
    data: {
      status,
      sentAt: status === "SENT" ? new Date() : undefined,
      viewedAt: status === "VIEWED" ? new Date() : undefined,
      acceptedAt: status === "ACCEPTED" ? new Date() : undefined,
    },
  });
  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
  revalidatePath("/");
}

export async function openDirectConversation(formData: FormData) {
  const actor = await requireUser();
  if (!can(actor.role, "chat:create")) throw new Error("Sem permissão para iniciar conversas.");
  const targetId = z.string().min(1).parse(formData.get("targetId"));
  const reachable = await getChatReachableUsers(actor);
  if (!reachable.some((user) => user.id === targetId) || targetId === actor.id) throw new Error("Usuário fora do seu alcance de chat.");

  let conversation = await prisma.internalConversation.findFirst({
    where: {
      organizationId: actor.organizationId,
      type: "DIRECT",
      AND: [
        { participants: { some: { userId: actor.id } } },
        { participants: { some: { userId: targetId } } },
      ],
    },
  });

  if (!conversation) {
    conversation = await prisma.internalConversation.create({
      data: {
        organizationId: actor.organizationId,
        type: "DIRECT",
        createdById: actor.id,
        participants: { create: [{ userId: actor.id }, { userId: targetId }] },
      },
    });
  }
  redirect(`/chat?c=${conversation.id}`);
}

export async function createTeamConversation(formData: FormData) {
  const actor = await requireUser();
  if (!can(actor.role, "team:assign")) throw new Error("Seu cargo não pode criar salas de equipe.");
  const title = z.string().trim().min(2).max(80).parse(formData.get("title"));
  const requested = formData.getAll("participantId").map(String);
  const managed = new Set(await getManagedUserIds(actor));
  const participantIds = [...new Set([actor.id, ...requested.filter((id) => managed.has(id))])];
  if (participantIds.length < 2) throw new Error("Selecione pelo menos um membro da sua equipe.");

  const conversation = await prisma.internalConversation.create({
    data: {
      organizationId: actor.organizationId,
      type: "TEAM",
      title,
      createdById: actor.id,
      participants: { create: participantIds.map((userId) => ({ userId })) },
    },
  });
  redirect(`/chat?c=${conversation.id}`);
}

export async function sendInternalMessage(conversationId: string, formData: FormData) {
  const actor = await requireUser();
  if (!can(actor.role, "chat:view")) throw new Error("Sem acesso ao chat.");
  const body = z.string().trim().min(1).max(4000).parse(formData.get("body"));
  const assigneeId = String(formData.get("assigneeId") || "");

  const conversation = await prisma.internalConversation.findFirst({
    where: { id: conversationId, organizationId: actor.organizationId, participants: { some: { userId: actor.id } } },
    include: { participants: { select: { userId: true } } },
  });
  if (!conversation) throw new Error("Conversa não encontrada ou sem acesso.");

  const participantIds = new Set(conversation.participants.map((item) => item.userId));
  if (assigneeId && (!can(actor.role, "assignments:create") || !participantIds.has(assigneeId))) {
    throw new Error("Designação inválida para esta conversa.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.internalMessage.create({
      data: {
        conversationId,
        senderId: actor.id,
        body,
        assignment: assigneeId ? { create: { assigneeId, assignedById: actor.id } } : undefined,
      },
    });
    await tx.internalConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  });
  revalidatePath("/chat");
}

export async function updateAssignmentStatus(assignmentId: string, status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELED") {
  const actor = await requireUser();
  if (!can(actor.role, "assignments:update")) throw new Error("Sem permissão para atualizar designações.");
  const assignment = await prisma.chatAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new Error("Designação não encontrada.");

  const allowed = assignment.assigneeId === actor.id || assignment.assignedById === actor.id || await canManageUser(actor, assignment.assigneeId);
  if (!allowed) throw new Error("Designação fora do seu escopo.");

  await prisma.chatAssignment.update({ where: { id: assignmentId }, data: { status } });
  revalidatePath("/chat");
}
