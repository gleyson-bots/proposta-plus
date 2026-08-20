import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const companySettings = mysqlTable("company_settings", {
  id: int("id").autoincrement().primaryKey(),
  singletonKey: varchar("singletonKey", { length: 32 }).notNull().unique(),
  legalName: varchar("legalName", { length: 255 }).notNull(),
  tradingName: varchar("tradingName", { length: 255 }),
  taxId: varchar("taxId", { length: 64 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  website: varchar("website", { length: 512 }),
  addressLine1: varchar("addressLine1", { length: 255 }),
  addressLine2: varchar("addressLine2", { length: 255 }),
  postalCode: varchar("postalCode", { length: 32 }),
  city: varchar("city", { length: 128 }),
  country: varchar("country", { length: 128 }),
  logoStorageKey: varchar("logoStorageKey", { length: 512 }),
  logoUrl: varchar("logoUrl", { length: 768 }),
  updatedByUserId: int("updatedByUserId").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const clients = mysqlTable(
  "clients",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id),
    contactName: varchar("contactName", { length: 255 }).notNull(),
    companyName: varchar("companyName", { length: 255 }),
    taxId: varchar("taxId", { length: 64 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    jobTitle: varchar("jobTitle", { length: 128 }),
    addressLine1: varchar("addressLine1", { length: 255 }),
    addressLine2: varchar("addressLine2", { length: 255 }),
    postalCode: varchar("postalCode", { length: 32 }),
    city: varchar("city", { length: 128 }),
    country: varchar("country", { length: 128 }),
    notes: text("notes"),
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("clients_owner_idx").on(table.ownerUserId),
    index("clients_archived_idx").on(table.archivedAt),
    index("clients_company_idx").on(table.companyName),
  ],
);

export const catalogItems = mysqlTable(
  "catalog_items",
  {
    id: int("id").autoincrement().primaryKey(),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id),
    type: mysqlEnum("type", ["product", "service"]).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 128 }),
    unitPriceCents: int("unitPriceCents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("catalog_items_archived_idx").on(table.archivedAt),
    index("catalog_items_category_idx").on(table.category),
  ],
);

export const proposals = mysqlTable(
  "proposals",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalNumber: varchar("proposalNumber", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    clientId: int("clientId").notNull().references(() => clients.id),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id),
    state: mysqlEnum("state", ["draft", "sent", "accepted", "rejected", "expired"]).notNull().default("draft"),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    taxRateBps: int("taxRateBps").notNull().default(2300),
    globalDiscountBps: int("globalDiscountBps").notNull().default(0),
    subtotalCents: int("subtotalCents").notNull().default(0),
    discountCents: int("discountCents").notNull().default(0),
    taxCents: int("taxCents").notNull().default(0),
    totalCents: int("totalCents").notNull().default(0),
    validUntil: timestamp("validUntil"),
    publicToken: varchar("publicToken", { length: 128 }).notNull(),
    publicSharingEnabled: boolean("publicSharingEnabled").notNull().default(true),
    clientMessage: text("clientMessage"),
    internalNotes: text("internalNotes"),
    version: int("version").notNull().default(1),
    sentAt: timestamp("sentAt"),
    acceptedAt: timestamp("acceptedAt"),
    rejectedAt: timestamp("rejectedAt"),
    expiredAt: timestamp("expiredAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("proposals_number_unique").on(table.proposalNumber),
    uniqueIndex("proposals_public_token_unique").on(table.publicToken),
    index("proposals_client_idx").on(table.clientId),
    index("proposals_creator_idx").on(table.createdByUserId),
    index("proposals_state_idx").on(table.state),
  ],
);

export const proposalItems = mysqlTable(
  "proposal_items",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    catalogItemId: int("catalogItemId").references(() => catalogItems.id, { onDelete: "set null" }),
    position: int("position").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
    unitPriceCents: int("unitPriceCents").notNull(),
    discountBps: int("discountBps").notNull().default(0),
    lineSubtotalCents: int("lineSubtotalCents").notNull(),
    lineDiscountCents: int("lineDiscountCents").notNull().default(0),
    lineTotalCents: int("lineTotalCents").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("proposal_items_proposal_idx").on(table.proposalId),
    uniqueIndex("proposal_items_position_unique").on(table.proposalId, table.position),
  ],
);

export const proposalMetadata = mysqlTable(
  "proposal_metadata",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    commercialTerms: json("commercialTerms").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("proposal_metadata_proposal_unique").on(table.proposalId)],
);

export const proposalAttachments = mysqlTable(
  "proposal_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    uploadedByUserId: int("uploadedByUserId").notNull().references(() => users.id),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 768 }).notNull(),
    mimeType: varchar("mimeType", { length: 128 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    includeInDocument: boolean("includeInDocument").notNull().default(false),
    shareWithClient: boolean("shareWithClient").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("proposal_attachments_proposal_idx").on(table.proposalId)],
);

export const proposalStatusHistory = mysqlTable(
  "proposal_status_history",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    changedByUserId: int("changedByUserId").references(() => users.id, { onDelete: "set null" }),
    fromState: mysqlEnum("fromState", ["draft", "sent", "accepted", "rejected", "expired"]),
    toState: mysqlEnum("toState", ["draft", "sent", "accepted", "rejected", "expired"]).notNull(),
    comment: text("comment"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("proposal_status_history_proposal_idx").on(table.proposalId)],
);

export const proposalApprovalSteps = mysqlTable(
  "proposal_approval_steps",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    position: int("position").notNull(),
    approverUserId: int("approverUserId").references(() => users.id, { onDelete: "set null" }),
    commercialRoleLabel: varchar("commercialRoleLabel", { length: 128 }),
    decision: mysqlEnum("decision", ["pending", "approved", "rejected", "skipped"]).notNull().default("pending"),
    comment: text("comment"),
    decidedAt: timestamp("decidedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("proposal_approval_steps_proposal_idx").on(table.proposalId),
    uniqueIndex("proposal_approval_position_unique").on(table.proposalId, table.position),
  ],
);

export const storedDocuments = mysqlTable(
  "stored_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    generatedByUserId: int("generatedByUserId").references(() => users.id, { onDelete: "set null" }),
    type: mysqlEnum("type", ["proposal_pdf"]).notNull().default("proposal_pdf"),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 768 }).notNull(),
    checksum: varchar("checksum", { length: 128 }),
    proposalVersion: int("proposalVersion").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("stored_documents_proposal_idx").on(table.proposalId)],
);

export const emailDeliveries = mysqlTable(
  "email_deliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    proposalId: int("proposalId").notNull().references(() => proposals.id, { onDelete: "cascade" }),
    proposalVersion: int("proposalVersion").notNull(),
    recipient: varchar("recipient", { length: 320 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull().default("resend"),
    providerMessageId: varchar("providerMessageId", { length: 128 }),
    idempotencyKey: varchar("idempotencyKey", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["pending", "sent", "failed"]).notNull().default("pending"),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    sentAt: timestamp("sentAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("email_deliveries_proposal_version_unique").on(table.proposalId, table.proposalVersion),
    uniqueIndex("email_deliveries_idempotency_unique").on(table.idempotencyKey),
    index("email_deliveries_status_idx").on(table.status),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Proposal = typeof proposals.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type CatalogItem = typeof catalogItems.$inferSelect;
