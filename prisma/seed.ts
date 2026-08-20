import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "proposta-plus" },
    update: {},
    create: { name: "Proposta Plus", slug: "proposta-plus" },
  });

  const client = await prisma.client.create({
    data: {
      organizationId: organization.id,
      name: "Cliente Demonstração",
      company: "Empresa Exemplo",
      email: "contato@exemplo.com",
      phone: "(11) 99999-9999",
    },
  });

  await prisma.proposal.create({
    data: {
      organizationId: organization.id,
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

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
