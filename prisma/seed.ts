import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function upsertUser(organizationId: string, email: string, data: { name: string; role: "ADMIN" | "VP" | "DIRECTOR" | "SUPERVISOR" | "MANAGER" | "BROKER"; parentId?: string | null; directorate?: string | null; team?: string | null }) {
  return prisma.user.upsert({
    where: { organizationId_email: { organizationId, email } },
    update: data,
    create: { organizationId, email, ...data },
  });
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "proposta-plus" },
    update: { name: "Proposta Plus" },
    create: { name: "Proposta Plus", slug: "proposta-plus" },
  });

  await upsertUser(organization.id, "admin@metrocasas.com.br", {
    name: "Admin Metrocasas", role: "ADMIN", directorate: "Corporativo",
  });

  const vp = await upsertUser(organization.id, "vp@metrocasas.com.br", {
    name: "VP Comercial", role: "VP", directorate: "Corporativo",
  });
  const director = await upsertUser(organization.id, "diretor@metrocasas.com.br", {
    name: "Diretor Comercial", role: "DIRECTOR", parentId: vp.id, directorate: "Diretoria Comercial",
  });
  const supervisor = await upsertUser(organization.id, "sup@metrocasas.com.br", {
    name: "Supervisor Comercial", role: "SUPERVISOR", parentId: director.id, directorate: "Diretoria Comercial", team: "Supervisão Alpha",
  });
  const manager = await upsertUser(organization.id, "gerente@metrocasas.com.br", {
    name: "Gerente de Vendas", role: "MANAGER", parentId: supervisor.id, directorate: "Diretoria Comercial", team: "Equipe Norte",
  });
  const broker = await upsertUser(organization.id, "corretor@metrocasas.com.br", {
    name: "Corretor Demonstração", role: "BROKER", parentId: manager.id, directorate: "Diretoria Comercial", team: "Equipe Norte",
  });

  let client = await prisma.client.findFirst({ where: { organizationId: organization.id, email: "contato@exemplo.com" } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        organizationId: organization.id,
        ownerId: broker.id,
        name: "Cliente Demonstração",
        company: "Empresa Exemplo",
        email: "contato@exemplo.com",
        phone: "(11) 99999-9999",
      },
    });
  }

  const existingProposal = await prisma.proposal.findFirst({ where: { organizationId: organization.id, title: "Projeto comercial" } });
  if (!existingProposal) {
    await prisma.proposal.create({
      data: {
        organizationId: organization.id,
        ownerId: broker.id,
        clientId: client.id,
        title: "Projeto comercial",
        status: "SENT",
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        items: {
          create: [
            { description: "Planejamento e implantação", quantity: 1, unitPrice: 4800, sortOrder: 0 },
            { description: "Acompanhamento mensal", quantity: 3, unitPrice: 1200, sortOrder: 1 },
          ],
        },
      },
    });
  }

  const existingTeamChat = await prisma.internalConversation.findFirst({
    where: { organizationId: organization.id, type: "TEAM", title: "Equipe Norte" },
  });
  if (!existingTeamChat) {
    await prisma.internalConversation.create({
      data: {
        organizationId: organization.id,
        type: "TEAM",
        title: "Equipe Norte",
        createdById: manager.id,
        participants: { create: [{ userId: manager.id }, { userId: broker.id }, { userId: supervisor.id }] },
        messages: { create: { senderId: manager.id, body: "Bem-vindos ao chat interno da Equipe Norte." } },
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
