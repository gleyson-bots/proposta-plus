import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { generateAndStoreProposalPdf } from "./documents";
import { storeCompanyLogo, storeProposalAttachment } from "./files";
import { canAccessOwnerRecord } from "./permissions";
import { isApprovalChainReady, nextPendingApproval } from "./approvalFlow";
import { assertProposalTransition, proposalStates } from "./proposalMath";
import { sendProposalEmail } from "./resend";

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const clientInput = z.object({
  contactName: z.string().trim().min(2).max(255), companyName: nullableText(255), taxId: nullableText(64),
  email: z.string().trim().email().max(320).nullable().optional(), phone: nullableText(64), jobTitle: nullableText(128),
  addressLine1: nullableText(255), addressLine2: nullableText(255), postalCode: nullableText(32),
  city: nullableText(128), country: nullableText(128), notes: nullableText(10_000),
});
const catalogInput = z.object({
  type: z.enum(["product", "service"]), name: z.string().trim().min(2).max(255), description: nullableText(10_000),
  category: nullableText(128), unitPriceCents: z.number().int().min(0).max(2_000_000_000), currency: z.string().length(3).transform(value => value.toUpperCase()),
});
const commercialTermsInput = z.object({
  paymentTerms: z.string().trim().max(4_000).optional(),
  downPayment: z.string().trim().max(500).optional(),
  financingTerms: z.string().trim().max(2_000).optional(),
  commissionTerms: z.string().trim().max(2_000).optional(),
  eligibilityCriteria: z.string().trim().max(4_000).optional(),
  catalogAttributes: z.string().trim().max(4_000).optional(),
});
const proposalInput = z.object({
  title: z.string().trim().min(2).max(255), clientId: z.number().int().positive(), currency: z.string().length(3).transform(value => value.toUpperCase()),
  taxRateBps: z.number().int().min(0).max(10_000), globalDiscountBps: z.number().int().min(0).max(10_000),
  validUntil: z.date().nullable().optional(), publicSharingEnabled: z.boolean(), clientMessage: nullableText(10_000), internalNotes: nullableText(10_000),
  commercialTerms: commercialTermsInput.default({}),
  items: z.array(z.object({
    catalogItemId: z.number().int().positive().nullable().optional(), title: z.string().trim().min(1).max(255),
    description: nullableText(10_000), quantity: z.number().positive().max(1_000_000),
    unitPriceCents: z.number().int().min(0).max(2_000_000_000), discountBps: z.number().int().min(0).max(10_000).default(0),
  })).max(200),
});

function forbid(message: string): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

async function assertClientAccess(user: db.SessionUser, clientId: number) {
  const client = await db.getClient(clientId);
  if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
  if (!canAccessOwnerRecord(user, client.ownerUserId)) forbid("Não tem acesso a este cliente.");
  return client;
}

async function assertProposalAccess(user: db.SessionUser, proposalId: number) {
  const proposal = await db.getProposal(proposalId);
  if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada." });
  if (!canAccessOwnerRecord(user, proposal.createdByUserId)) forbid("Não tem acesso a esta proposta.");
  return proposal;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  dashboard: router({
    metrics: protectedProcedure.query(({ ctx }) => db.getDashboardMetrics(ctx.user)),
  }),
  clients: router({
    list: protectedProcedure.input(z.object({ includeArchived: z.boolean().default(false), query: z.string().trim().max(120).optional() }).optional()).query(({ ctx, input }) => db.listClients(ctx.user, input?.includeArchived ?? false, input?.query)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertClientAccess(ctx.user, input.id); return db.getClient(input.id);
    }),
    create: protectedProcedure.input(clientInput).mutation(({ ctx, input }) => db.createClient(ctx.user, input)),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: clientInput })).mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx.user, input.id); await db.updateClient(input.id, input.data); return { success: true };
    }),
    archive: protectedProcedure.input(z.object({ id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => {
      await assertClientAccess(ctx.user, input.id); await db.archiveClient(input.id, input.archived); return { success: true };
    }),
  }),
  catalog: router({
    list: protectedProcedure.input(z.object({ includeArchived: z.boolean().default(false), query: z.string().trim().max(120).optional() }).optional()).query(({ input }) => db.listCatalogItems(input?.includeArchived ?? false, input?.query)),
    create: adminProcedure.input(catalogInput).mutation(({ ctx, input }) => db.createCatalogItem(ctx.user, input)),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: catalogInput })).mutation(async ({ input }) => {
      if (!await db.getCatalogItem(input.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Item de catálogo não encontrado." });
      await db.updateCatalogItem(input.id, input.data); return { success: true };
    }),
    archive: adminProcedure.input(z.object({ id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ input }) => {
      if (!await db.getCatalogItem(input.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Item de catálogo não encontrado." });
      await db.archiveCatalogItem(input.id, input.archived); return { success: true };
    }),
  }),
  proposals: router({
    list: protectedProcedure.query(({ ctx }) => db.listProposals(ctx.user)),
    detail: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertProposalAccess(ctx.user, input.id); return db.getProposalDetail(input.id);
    }),
    create: protectedProcedure.input(proposalInput).mutation(async ({ ctx, input }) => {
      const client = await assertClientAccess(ctx.user, input.clientId);
      if (client.archivedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode criar propostas para um cliente arquivado." });
      return db.createProposal(ctx.user, input);
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: proposalInput })).mutation(async ({ ctx, input }) => {
      const proposal = await assertProposalAccess(ctx.user, input.id);
      if (proposal.state !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Só é possível editar propostas em rascunho." });
      const client = await assertClientAccess(ctx.user, input.data.clientId);
      if (client.archivedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode usar um cliente arquivado." });
      await db.updateProposal(input.id, input.data); return { success: true };
    }),
    duplicate: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertProposalAccess(ctx.user, input.id);
      const detail = await db.getProposalDetail(input.id);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada." });
      return db.createProposal(ctx.user, {
        title: `${detail.proposal.title} — cópia`, clientId: detail.proposal.clientId, currency: detail.proposal.currency,
        taxRateBps: detail.proposal.taxRateBps, globalDiscountBps: detail.proposal.globalDiscountBps,
        validUntil: null, publicSharingEnabled: detail.proposal.publicSharingEnabled, clientMessage: detail.proposal.clientMessage,
        internalNotes: detail.proposal.internalNotes, commercialTerms: (detail.metadata?.commercialTerms ?? {}) as Record<string, unknown>,
        items: detail.items.map(item => ({ catalogItemId: item.catalogItemId, title: item.title, description: item.description, quantity: Number(item.quantity), unitPriceCents: item.unitPriceCents, discountBps: item.discountBps })),
      });
    }),
    deleteDraft: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const proposal = await assertProposalAccess(ctx.user, input.id);
      if (proposal.state !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas rascunhos podem ser eliminados." });
      await db.deleteDraftProposal(input.id); return { success: true };
    }),
    configureApprovals: protectedProcedure.input(z.object({ id: z.number().int().positive(), steps: z.array(z.object({ commercialRoleLabel: z.string().trim().min(2).max(128) })).max(8) })).mutation(async ({ ctx, input }) => {
      const proposal = await assertProposalAccess(ctx.user, input.id);
      if (proposal.state !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "A cadeia de aprovação só pode ser configurada em rascunho." });
      await db.replaceApprovalSteps(input.id, input.steps);
      return { success: true };
    }),
    decideApproval: protectedProcedure.input(z.object({ proposalId: z.number().int().positive(), stepId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), comment: nullableText(2_000) })).mutation(async ({ ctx, input }) => {
      const proposal = await db.getProposal(input.proposalId);
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Proposta não encontrada." });
      const step = await db.getApprovalStep(input.stepId);
      if (!step || step.proposalId !== proposal.id) throw new TRPCError({ code: "NOT_FOUND", message: "Etapa de aprovação não encontrada." });
      const isOwner = canAccessOwnerRecord(ctx.user, proposal.createdByUserId);
      if (!isOwner && step.approverUserId !== ctx.user.id) forbid("Não tem acesso a esta etapa de aprovação.");
      if (step.decision !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta etapa já foi decidida." });
      const steps = await db.getApprovalSteps(proposal.id);
      if (steps.some(candidate => candidate.decision === "rejected")) throw new TRPCError({ code: "BAD_REQUEST", message: "A cadeia foi recusada; reconfigure as etapas antes de continuar." });
      const firstPending = nextPendingApproval(steps);
      if (!firstPending || firstPending.id !== step.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Conclua as etapas anteriores antes de decidir esta aprovação." });
      await db.decideApprovalStep(step.id, input.decision, input.comment);
      return { success: true };
    }),
    transition: protectedProcedure.input(z.object({ id: z.number().int().positive(), toState: z.enum(proposalStates), comment: nullableText(2_000) })).mutation(async ({ ctx, input }) => {
      const proposal = await assertProposalAccess(ctx.user, input.id);
      try { assertProposalTransition(proposal.state, input.toState); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Transição inválida." }); }
      if (input.toState === "sent") {
        const detail = await db.getProposalDetail(input.id);
        const company = await db.getCompanySettings();
        if (!detail?.items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Adicione pelo menos um item antes de enviar." });
        if (!detail.client.email) throw new TRPCError({ code: "BAD_REQUEST", message: "O cliente precisa de um email antes do envio." });
        if (!company) throw new TRPCError({ code: "BAD_REQUEST", message: "Preencha as definições da empresa antes de enviar." });
        if (!detail.proposal.publicSharingEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "Ative a visualização por ligação segura antes de enviar ao cliente." });
        if (detail.approvals.length && !isApprovalChainReady(detail.approvals)) throw new TRPCError({ code: "BAD_REQUEST", message: "Conclua todas as etapas de aprovação antes de enviar a proposta." });
      }
      await db.transitionProposalState(input.id, ctx.user, proposal.state, input.toState, input.comment);
      if (input.toState !== "sent") return { success: true, email: null };
      const host = ctx.req.get("host");
      const origin = `${ctx.req.protocol}://${host}`;
      const email = await sendProposalEmail({ proposalId: input.id, actorUserId: ctx.user.id, origin });
      return { success: true, email };
    }),
  }),
  company: router({
    get: protectedProcedure.query(() => db.getCompanySettings()),
    save: adminProcedure.input(z.object({
      legalName: z.string().trim().min(2).max(255), tradingName: nullableText(255), taxId: nullableText(64),
      email: z.string().trim().email().max(320).nullable().optional(), phone: nullableText(64), website: nullableText(512),
      addressLine1: nullableText(255), addressLine2: nullableText(255), postalCode: nullableText(32), city: nullableText(128), country: nullableText(128),
      logoStorageKey: nullableText(512), logoUrl: nullableText(768),
    })).mutation(async ({ ctx, input }) => { await db.saveCompanySettings(ctx.user, input); return { success: true }; }),
    uploadLogo: adminProcedure.input(z.object({ filename: z.string().trim().min(1).max(255), dataUrl: z.string().min(32).max(7_000_000) })).mutation(async ({ ctx, input }) => {
      const file = await storeCompanyLogo(input.dataUrl, input.filename);
      await db.updateCompanyLogo(ctx.user, file.key, file.url);
      return file;
    }),
  }),
  documents: router({
    generatePdf: protectedProcedure.input(z.object({ proposalId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertProposalAccess(ctx.user, input.proposalId);
      const document = await generateAndStoreProposalPdf(input.proposalId, ctx.user.id);
      return { id: document.id, filename: document.filename, url: document.url };
    }),
  }),
  attachments: router({
    upload: protectedProcedure.input(z.object({ proposalId: z.number().int().positive(), filename: z.string().trim().min(1).max(255), dataUrl: z.string().min(32).max(14_000_000), shareWithClient: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const proposal = await assertProposalAccess(ctx.user, input.proposalId);
      if (proposal.state !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Os anexos só podem ser alterados enquanto a proposta é um rascunho." });
      return storeProposalAttachment({ ...input, uploadedByUserId: ctx.user.id });
    }),
    remove: protectedProcedure.input(z.object({ proposalId: z.number().int().positive(), attachmentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertProposalAccess(ctx.user, input.proposalId);
      const attachment = await db.getProposalAttachment(input.attachmentId);
      if (!attachment || attachment.proposalId !== input.proposalId) throw new TRPCError({ code: "NOT_FOUND", message: "Anexo não encontrado." });
      await db.deleteProposalAttachment(input.attachmentId);
      return { success: true };
    }),
  }),
  publicProposal: router({
    get: publicProcedure.input(z.object({ token: z.string().min(32).max(128) })).query(async ({ input }) => {
      const proposal = await db.getPublicProposal(input.token);
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "A proposta não está disponível." });
      return proposal;
    }),
  }),
});

export type AppRouter = typeof appRouter;
