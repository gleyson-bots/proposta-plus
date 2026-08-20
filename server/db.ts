import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  catalogItems,
  clients,
  companySettings,
  emailDeliveries,
  InsertUser,
  proposalApprovalSteps,
  proposalAttachments,
  proposalItems,
  proposalMetadata,
  proposals,
  proposalStatusHistory,
  storedDocuments,
  type User,
  users,
} from "../drizzle/schema";
import { calculateProposalTotals, type ProposalState } from "./proposalMath";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export type SessionUser = Pick<User, "id" | "role">;

export type ClientInput = {
  contactName: string; companyName?: string | null; taxId?: string | null; email?: string | null;
  phone?: string | null; jobTitle?: string | null; addressLine1?: string | null;
  addressLine2?: string | null; postalCode?: string | null; city?: string | null;
  country?: string | null; notes?: string | null;
};

export type CatalogItemInput = {
  type: "product" | "service"; name: string; description?: string | null;
  category?: string | null; unitPriceCents: number; currency: string;
};

export type ProposalItemInput = {
  catalogItemId?: number | null; title: string; description?: string | null;
  quantity: number; unitPriceCents: number; discountBps: number;
};

export type ProposalInput = {
  title: string; clientId: number; currency: string; taxRateBps: number;
  globalDiscountBps: number; validUntil?: Date | null; publicSharingEnabled: boolean;
  clientMessage?: string | null; internalNotes?: string | null;
  commercialTerms: Record<string, unknown>; items: ProposalItemInput[];
};

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("A base de dados não está disponível.");
  return db;
}

function accessCondition(user: SessionUser, ownerColumn: typeof clients.ownerUserId | typeof proposals.createdByUserId) {
  return user.role === "admin" ? undefined : eq(ownerColumn, user.id);
}

function makeProposalNumber() {
  return `PP-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function makePublicToken() {
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function createClient(user: SessionUser, input: ClientInput) {
  const db = await requireDb();
  const result = await db.insert(clients).values({ ownerUserId: user.id, ...input });
  return Number(result[0].insertId);
}

export async function listClients(user: SessionUser, includeArchived = false, query?: string) {
  const db = await requireDb();
  const conditions = [accessCondition(user, clients.ownerUserId)];
  if (!includeArchived) conditions.push(isNull(clients.archivedAt));
  const term = query?.trim();
  if (term) {
    const pattern = `%${term}%`;
    conditions.push(or(like(clients.contactName, pattern), like(clients.companyName, pattern), like(clients.email, pattern), like(clients.taxId, pattern)));
  }
  return db.select().from(clients).where(and(...conditions)).orderBy(desc(clients.updatedAt));
}

export async function getClient(id: number) {
  const db = await requireDb();
  return (await db.select().from(clients).where(eq(clients.id, id)).limit(1))[0];
}

export async function updateClient(id: number, input: ClientInput) {
  const db = await requireDb();
  await db.update(clients).set(input).where(eq(clients.id, id));
}

export async function archiveClient(id: number, archived: boolean) {
  const db = await requireDb();
  await db.update(clients).set({ archivedAt: archived ? new Date() : null }).where(eq(clients.id, id));
}

export async function createCatalogItem(user: SessionUser, input: CatalogItemInput) {
  const db = await requireDb();
  const result = await db.insert(catalogItems).values({ createdByUserId: user.id, ...input });
  return Number(result[0].insertId);
}

export async function listCatalogItems(includeArchived = false, query?: string) {
  const db = await requireDb();
  const conditions = [includeArchived ? undefined : isNull(catalogItems.archivedAt)];
  const term = query?.trim();
  if (term) {
    const pattern = `%${term}%`;
    conditions.push(or(like(catalogItems.name, pattern), like(catalogItems.category, pattern), like(catalogItems.description, pattern)));
  }
  return db.select().from(catalogItems).where(and(...conditions)).orderBy(desc(catalogItems.updatedAt));
}

export async function getCatalogItem(id: number) {
  const db = await requireDb();
  return (await db.select().from(catalogItems).where(eq(catalogItems.id, id)).limit(1))[0];
}

export async function updateCatalogItem(id: number, input: CatalogItemInput) {
  const db = await requireDb();
  await db.update(catalogItems).set(input).where(eq(catalogItems.id, id));
}

export async function archiveCatalogItem(id: number, archived: boolean) {
  const db = await requireDb();
  await db.update(catalogItems).set({ archivedAt: archived ? new Date() : null }).where(eq(catalogItems.id, id));
}

function proposalItemRows(proposalId: number, input: ProposalInput, totals: ReturnType<typeof calculateProposalTotals>) {
  return totals.lines.map((line, position) => ({
    proposalId, catalogItemId: input.items[position]?.catalogItemId ?? null, position,
    title: input.items[position]!.title, description: input.items[position]!.description ?? null,
    quantity: line.quantity.toFixed(3), unitPriceCents: line.unitPriceCents,
    discountBps: line.discountBps ?? 0, lineSubtotalCents: line.lineSubtotalCents,
    lineDiscountCents: line.lineDiscountCents, lineTotalCents: line.lineTotalCents,
  }));
}

export async function createProposal(user: SessionUser, input: ProposalInput) {
  const db = await requireDb();
  const totals = calculateProposalTotals(input.items, input.taxRateBps, input.globalDiscountBps);
  return db.transaction(async tx => {
    const inserted = await tx.insert(proposals).values({
      proposalNumber: makeProposalNumber(), publicToken: makePublicToken(), title: input.title,
      clientId: input.clientId, createdByUserId: user.id, currency: input.currency,
      taxRateBps: input.taxRateBps, globalDiscountBps: input.globalDiscountBps,
      subtotalCents: totals.subtotalCents, discountCents: totals.discountCents,
      taxCents: totals.taxCents, totalCents: totals.totalCents, validUntil: input.validUntil ?? null,
      publicSharingEnabled: input.publicSharingEnabled, clientMessage: input.clientMessage ?? null,
      internalNotes: input.internalNotes ?? null,
    });
    const proposalId = Number(inserted[0].insertId);
    if (input.items.length) await tx.insert(proposalItems).values(proposalItemRows(proposalId, input, totals));
    await tx.insert(proposalMetadata).values({ proposalId, commercialTerms: input.commercialTerms });
    await tx.insert(proposalStatusHistory).values({ proposalId, changedByUserId: user.id, fromState: null, toState: "draft", comment: "Proposta criada." });
    return proposalId;
  });
}

export async function updateProposal(id: number, input: ProposalInput) {
  const db = await requireDb();
  const totals = calculateProposalTotals(input.items, input.taxRateBps, input.globalDiscountBps);
  await db.transaction(async tx => {
    await tx.update(proposals).set({
      title: input.title, clientId: input.clientId, currency: input.currency,
      taxRateBps: input.taxRateBps, globalDiscountBps: input.globalDiscountBps,
      subtotalCents: totals.subtotalCents, discountCents: totals.discountCents,
      taxCents: totals.taxCents, totalCents: totals.totalCents, validUntil: input.validUntil ?? null,
      publicSharingEnabled: input.publicSharingEnabled, clientMessage: input.clientMessage ?? null,
      internalNotes: input.internalNotes ?? null, version: sql`${proposals.version} + 1`,
    }).where(eq(proposals.id, id));
    await tx.delete(proposalItems).where(eq(proposalItems.proposalId, id));
    if (input.items.length) await tx.insert(proposalItems).values(proposalItemRows(id, input, totals));
    await tx.insert(proposalMetadata).values({ proposalId: id, commercialTerms: input.commercialTerms })
      .onDuplicateKeyUpdate({ set: { commercialTerms: input.commercialTerms } });
  });
}

export async function getProposal(id: number) {
  const db = await requireDb();
  return (await db.select().from(proposals).where(eq(proposals.id, id)).limit(1))[0];
}

export async function listProposals(user: SessionUser) {
  const db = await requireDb();
  return db.select({ proposal: proposals, client: clients }).from(proposals)
    .innerJoin(clients, eq(proposals.clientId, clients.id))
    .where(accessCondition(user, proposals.createdByUserId)).orderBy(desc(proposals.updatedAt));
}

export async function getProposalDetail(id: number) {
  const db = await requireDb();
  const root = (await db.select({ proposal: proposals, client: clients }).from(proposals)
    .innerJoin(clients, eq(proposals.clientId, clients.id)).where(eq(proposals.id, id)).limit(1))[0];
  if (!root) return undefined;
  const [items, metadata, history, attachments, approvals, documents, deliveries] = await Promise.all([
    db.select().from(proposalItems).where(eq(proposalItems.proposalId, id)).orderBy(proposalItems.position),
    db.select().from(proposalMetadata).where(eq(proposalMetadata.proposalId, id)).limit(1),
    db.select().from(proposalStatusHistory).where(eq(proposalStatusHistory.proposalId, id)).orderBy(desc(proposalStatusHistory.createdAt)),
    db.select().from(proposalAttachments).where(eq(proposalAttachments.proposalId, id)).orderBy(desc(proposalAttachments.createdAt)),
    db.select().from(proposalApprovalSteps).where(eq(proposalApprovalSteps.proposalId, id)).orderBy(proposalApprovalSteps.position),
    db.select().from(storedDocuments).where(eq(storedDocuments.proposalId, id)).orderBy(desc(storedDocuments.createdAt)),
    db.select().from(emailDeliveries).where(eq(emailDeliveries.proposalId, id)).orderBy(desc(emailDeliveries.createdAt)),
  ]);
  return { ...root, items, metadata: metadata[0], history, attachments, approvals, documents, deliveries };
}

export async function getPublicProposal(token: string) {
  const db = await requireDb();
  const root = (await db.select({ proposal: proposals, client: clients }).from(proposals)
    .innerJoin(clients, eq(proposals.clientId, clients.id))
    .where(and(eq(proposals.publicToken, token), eq(proposals.publicSharingEnabled, true))).limit(1))[0];
  if (!root) return undefined;
  const [items, metadata, attachments, company] = await Promise.all([
    db.select().from(proposalItems).where(eq(proposalItems.proposalId, root.proposal.id)).orderBy(proposalItems.position),
    db.select().from(proposalMetadata).where(eq(proposalMetadata.proposalId, root.proposal.id)).limit(1),
    db.select().from(proposalAttachments).where(and(eq(proposalAttachments.proposalId, root.proposal.id), eq(proposalAttachments.shareWithClient, true))),
    db.select().from(companySettings).where(eq(companySettings.singletonKey, "primary")).limit(1),
  ]);
  return { ...root, items, metadata: metadata[0], attachments, company: company[0] };
}

export async function transitionProposalState(id: number, user: SessionUser, fromState: ProposalState, toState: ProposalState, comment?: string | null) {
  const db = await requireDb();
  const now = new Date();
  const stamp = toState === "sent" ? { sentAt: now } : toState === "accepted" ? { acceptedAt: now } : toState === "rejected" ? { rejectedAt: now } : toState === "expired" ? { expiredAt: now } : {};
  await db.transaction(async tx => {
    await tx.update(proposals).set({ state: toState, ...stamp }).where(and(eq(proposals.id, id), eq(proposals.state, fromState)));
    await tx.insert(proposalStatusHistory).values({ proposalId: id, changedByUserId: user.id, fromState, toState, comment: comment ?? null });
  });
}

export async function getCompanySettings() {
  const db = await requireDb();
  return (await db.select().from(companySettings).where(eq(companySettings.singletonKey, "primary")).limit(1))[0];
}

export async function saveCompanySettings(user: SessionUser, input: Omit<typeof companySettings.$inferInsert, "id" | "singletonKey" | "updatedByUserId" | "createdAt" | "updatedAt">) {
  const db = await requireDb();
  await db.insert(companySettings).values({ singletonKey: "primary", updatedByUserId: user.id, ...input })
    .onDuplicateKeyUpdate({ set: { ...input, updatedByUserId: user.id } });
}

export async function updateCompanyLogo(user: SessionUser, logoStorageKey: string, logoUrl: string) {
  const db = await requireDb();
  const company = await getCompanySettings();
  if (!company) throw new Error("Guarde primeiro as informações da empresa antes de carregar o logótipo.");
  await db.update(companySettings).set({ logoStorageKey, logoUrl, updatedByUserId: user.id }).where(eq(companySettings.singletonKey, "primary"));
}

export async function getDashboardMetrics(user: SessionUser) {
  const rows = await listProposals(user);
  const proposalsOnly = rows.map(row => row.proposal);
  const open = proposalsOnly.filter(proposal => proposal.state === "sent");
  const decisions = proposalsOnly.filter(proposal => proposal.state === "accepted" || proposal.state === "rejected");
  const accepted = decisions.filter(proposal => proposal.state === "accepted");
  return {
    totalProposals: proposalsOnly.length,
    conversionRate: decisions.length ? Math.round((accepted.length / decisions.length) * 10_000) / 100 : 0,
    openValueCents: open.reduce((sum, proposal) => sum + proposal.totalCents, 0),
    recent: rows.slice(0, 6),
  };
}

export async function deleteDraftProposal(id: number) {
  const db = await requireDb();
  await db.delete(proposals).where(and(eq(proposals.id, id), eq(proposals.state, "draft")));
}

export async function recordGeneratedDocument(input: Omit<typeof storedDocuments.$inferInsert, "id" | "createdAt">) {
  const db = await requireDb();
  const result = await db.insert(storedDocuments).values(input);
  return Number(result[0].insertId);
}

export async function getLatestPdfDocument(proposalId: number) {
  const db = await requireDb();
  return (await db.select().from(storedDocuments)
    .where(and(eq(storedDocuments.proposalId, proposalId), eq(storedDocuments.type, "proposal_pdf")))
    .orderBy(desc(storedDocuments.createdAt)).limit(1))[0];
}

export async function createProposalAttachment(input: Omit<typeof proposalAttachments.$inferInsert, "id" | "createdAt">) {
  const db = await requireDb();
  const result = await db.insert(proposalAttachments).values(input);
  return Number(result[0].insertId);
}

export async function getProposalAttachment(id: number) {
  const db = await requireDb();
  return (await db.select().from(proposalAttachments).where(eq(proposalAttachments.id, id)).limit(1))[0];
}

export async function deleteProposalAttachment(id: number) {
  const db = await requireDb();
  await db.delete(proposalAttachments).where(eq(proposalAttachments.id, id));
}

export async function getEmailDeliveryByKey(idempotencyKey: string) {
  const db = await requireDb();
  return (await db.select().from(emailDeliveries).where(eq(emailDeliveries.idempotencyKey, idempotencyKey)).limit(1))[0];
}

export async function registerEmailPending(input: Omit<typeof emailDeliveries.$inferInsert, "id" | "createdAt" | "updatedAt" | "status" | "sentAt" | "lastError">) {
  const db = await requireDb();
  await db.insert(emailDeliveries).values({ ...input, status: "pending" })
    .onDuplicateKeyUpdate({ set: { status: "pending", errorMessage: null } });
  return getEmailDeliveryByKey(input.idempotencyKey);
}

export async function markEmailDelivered(idempotencyKey: string, resendMessageId: string | null) {
  const db = await requireDb();
  await db.update(emailDeliveries).set({ status: "sent", providerMessageId: resendMessageId, sentAt: new Date(), errorMessage: null })
    .where(eq(emailDeliveries.idempotencyKey, idempotencyKey));
}

export async function markEmailFailed(idempotencyKey: string, error: string) {
  const db = await requireDb();
  await db.update(emailDeliveries).set({ status: "failed", errorMessage: error.slice(0, 2_000) })
    .where(eq(emailDeliveries.idempotencyKey, idempotencyKey));
}

export type ApprovalStepInput = {
  approverUserId?: number | null;
  commercialRoleLabel?: string | null;
};

export async function replaceApprovalSteps(proposalId: number, steps: ApprovalStepInput[]) {
  const db = await requireDb();
  await db.transaction(async tx => {
    await tx.delete(proposalApprovalSteps).where(eq(proposalApprovalSteps.proposalId, proposalId));
    if (steps.length) {
      await tx.insert(proposalApprovalSteps).values(
        steps.map((step, position) => ({
          proposalId,
          position,
          approverUserId: step.approverUserId ?? null,
          commercialRoleLabel: step.commercialRoleLabel ?? null,
        })),
      );
    }
  });
}

export async function getApprovalStep(id: number) {
  const db = await requireDb();
  return (await db.select().from(proposalApprovalSteps).where(eq(proposalApprovalSteps.id, id)).limit(1))[0];
}

export async function getApprovalSteps(proposalId: number) {
  const db = await requireDb();
  return db.select().from(proposalApprovalSteps).where(eq(proposalApprovalSteps.proposalId, proposalId)).orderBy(proposalApprovalSteps.position);
}

export async function decideApprovalStep(id: number, decision: "approved" | "rejected", comment?: string | null) {
  const db = await requireDb();
  await db.update(proposalApprovalSteps).set({ decision, comment: comment ?? null, decidedAt: new Date() })
    .where(and(eq(proposalApprovalSteps.id, id), eq(proposalApprovalSteps.decision, "pending")));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
