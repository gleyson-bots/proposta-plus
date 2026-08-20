"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";

const clientSchema = z.object({
  name: z.string().trim().min(2),
  company: z.string().trim().optional(),
  email: z.string().trim().email().or(z.literal("")).optional(),
  phone: z.string().trim().optional(),
});

async function organizationId() {
  const org = await prisma.organization.upsert({
    where: { slug: "proposta-plus" },
    update: {},
    create: { name: "Proposta Plus", slug: "proposta-plus" },
  });
  return org.id;
}

export async function createClient(formData: FormData) {
  const parsed = clientSchema.parse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  await prisma.client.create({
    data: {
      organizationId: await organizationId(),
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
  const parsed = proposalSchema.parse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
  });

  const proposal = await prisma.proposal.create({
    data: {
      organizationId: await organizationId(),
      clientId: parsed.clientId,
      title: parsed.title,
      validUntil: parsed.validUntil ? new Date(`${parsed.validUntil}T12:00:00`) : null,
      notes: parsed.notes || null,
      items: {
        create: {
          description: parsed.description,
          quantity: parsed.quantity,
          unitPrice: parsed.unitPrice,
        },
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/propostas");
  redirect(`/propostas/${proposal.id}`);
}

export async function updateProposalStatus(id: string, status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED") {
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
