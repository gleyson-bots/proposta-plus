import prisma from "@/lib/prisma";

const globalForDb = globalThis as unknown as { ppDbReady?: Promise<void> };

async function bootstrap() {
  const statements = [
    `PRAGMA foreign_keys = ON`,
    `CREATE TABLE IF NOT EXISTS "Organization" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug")`,

    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "parentId" TEXT,
      "directorate" TEXT,
      "team" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "User_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_organizationId_email_key" ON "User"("organizationId", "email")`,
    `CREATE INDEX IF NOT EXISTS "User_organizationId_role_idx" ON "User"("organizationId", "role")`,
    `CREATE INDEX IF NOT EXISTS "User_parentId_idx" ON "User"("parentId")`,
    `CREATE INDEX IF NOT EXISTS "User_organizationId_directorate_idx" ON "User"("organizationId", "directorate")`,
    `CREATE INDEX IF NOT EXISTS "User_organizationId_team_idx" ON "User"("organizationId", "team")`,

    `CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "token" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "expiresAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token")`,
    `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`,
    `CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt")`,

    `CREATE TABLE IF NOT EXISTS "Client" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "ownerId" TEXT,
      "name" TEXT NOT NULL,
      "company" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "document" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Client_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "Client_organizationId_name_idx" ON "Client"("organizationId", "name")`,
    `CREATE INDEX IF NOT EXISTS "Client_ownerId_idx" ON "Client"("ownerId")`,

    `CREATE TABLE IF NOT EXISTS "Proposal" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "number" INTEGER NOT NULL,
      "organizationId" TEXT NOT NULL,
      "ownerId" TEXT,
      "clientId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "validUntil" DATETIME,
      "discount" DECIMAL NOT NULL DEFAULT 0,
      "notes" TEXT,
      "sentAt" DATETIME,
      "viewedAt" DATETIME,
      "acceptedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Proposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Proposal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Proposal_number_key" ON "Proposal"("number")`,
    `CREATE INDEX IF NOT EXISTS "Proposal_organizationId_status_idx" ON "Proposal"("organizationId", "status")`,
    `CREATE INDEX IF NOT EXISTS "Proposal_clientId_idx" ON "Proposal"("clientId")`,
    `CREATE INDEX IF NOT EXISTS "Proposal_ownerId_idx" ON "Proposal"("ownerId")`,
    `CREATE INDEX IF NOT EXISTS "Proposal_createdAt_idx" ON "Proposal"("createdAt")`,

    `CREATE TABLE IF NOT EXISTS "ProposalItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "proposalId" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "quantity" DECIMAL NOT NULL DEFAULT 1,
      "unitPrice" DECIMAL NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "ProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "ProposalItem_proposalId_sortOrder_idx" ON "ProposalItem"("proposalId", "sortOrder")`,

    `CREATE TABLE IF NOT EXISTS "InternalConversation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "title" TEXT,
      "createdById" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "InternalConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "InternalConversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "InternalConversation_organizationId_updatedAt_idx" ON "InternalConversation"("organizationId", "updatedAt")`,

    `CREATE TABLE IF NOT EXISTS "ChatParticipant" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "lastReadAt" DATETIME,
      "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ChatParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InternalConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ChatParticipant_conversationId_userId_key" ON "ChatParticipant"("conversationId", "userId")`,
    `CREATE INDEX IF NOT EXISTS "ChatParticipant_userId_idx" ON "ChatParticipant"("userId")`,

    `CREATE TABLE IF NOT EXISTS "InternalMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "senderId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "editedAt" DATETIME,
      CONSTRAINT "InternalMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InternalConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "InternalMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "InternalMessage_conversationId_createdAt_idx" ON "InternalMessage"("conversationId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "InternalMessage_senderId_idx" ON "InternalMessage"("senderId")`,

    `CREATE TABLE IF NOT EXISTS "ChatAssignment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "messageId" TEXT NOT NULL,
      "assigneeId" TEXT NOT NULL,
      "assignedById" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "dueAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "ChatAssignment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "InternalMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ChatAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "ChatAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ChatAssignment_messageId_key" ON "ChatAssignment"("messageId")`,
    `CREATE INDEX IF NOT EXISTS "ChatAssignment_assigneeId_status_idx" ON "ChatAssignment"("assigneeId", "status")`,
    `CREATE INDEX IF NOT EXISTS "ChatAssignment_assignedById_idx" ON "ChatAssignment"("assignedById")`,
  ];

  for (const sql of statements) await prisma.$executeRawUnsafe(sql);

  const organization = await prisma.organization.upsert({
    where: { slug: "proposta-plus" },
    update: { name: "Proposta Plus" },
    create: { name: "Proposta Plus", slug: "proposta-plus" },
  });

  const upsertUser = (email: string, data: { name: string; role: "ADMIN" | "VP" | "DIRECTOR" | "SUPERVISOR" | "MANAGER" | "BROKER"; parentId?: string | null; directorate?: string | null; team?: string | null }) =>
    prisma.user.upsert({
      where: { organizationId_email: { organizationId: organization.id, email } },
      update: data,
      create: { organizationId: organization.id, email, ...data },
    });

  await upsertUser("admin@metrocasas.com.br", { name: "Admin Metrocasas", role: "ADMIN", directorate: "Corporativo" });
  const vp = await upsertUser("vp@metrocasas.com.br", { name: "VP Comercial", role: "VP", directorate: "Corporativo" });
  const director = await upsertUser("diretor@metrocasas.com.br", { name: "Diretor Comercial", role: "DIRECTOR", parentId: vp.id, directorate: "Diretoria Comercial" });
  const supervisor = await upsertUser("sup@metrocasas.com.br", { name: "Supervisor Comercial", role: "SUPERVISOR", parentId: director.id, directorate: "Diretoria Comercial", team: "Supervisão Alpha" });
  const manager = await upsertUser("gerente@metrocasas.com.br", { name: "Gerente de Vendas", role: "MANAGER", parentId: supervisor.id, directorate: "Diretoria Comercial", team: "Equipe Norte" });
  await upsertUser("corretor@metrocasas.com.br", { name: "Corretor Demonstração", role: "BROKER", parentId: manager.id, directorate: "Diretoria Comercial", team: "Equipe Norte" });
}

export function ensureDatabaseReady() {
  globalForDb.ppDbReady ??= bootstrap().catch((error) => {
    globalForDb.ppDbReady = undefined;
    throw error;
  });
  return globalForDb.ppDbReady;
}
