import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProposalDetail: vi.fn(),
  getEmailDeliveryByKey: vi.fn(),
  registerEmailPending: vi.fn(),
  markEmailDelivered: vi.fn(),
  markEmailFailed: vi.fn(),
  generateAndStoreProposalPdf: vi.fn(),
}));

vi.mock("./db", () => ({
  getProposalDetail: mocks.getProposalDetail,
  getEmailDeliveryByKey: mocks.getEmailDeliveryByKey,
  registerEmailPending: mocks.registerEmailPending,
  markEmailDelivered: mocks.markEmailDelivered,
  markEmailFailed: mocks.markEmailFailed,
}));
vi.mock("./documents", () => ({ generateAndStoreProposalPdf: mocks.generateAndStoreProposalPdf }));

import { sendProposalEmail } from "./resend";

const detail = {
  client: { email: "cliente@example.com", contactName: "Ana & Filhos" },
  proposal: { id: 8, version: 3, publicToken: "token-seguro", proposalNumber: "PP-2026-0008", title: "Plano <Premium>" },
};

describe("envio transacional de proposta", () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProposalDetail.mockResolvedValue(detail);
    mocks.getEmailDeliveryByKey.mockResolvedValue(undefined);
    mocks.registerEmailPending.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalKey;
    process.env.RESEND_FROM_EMAIL = originalFrom;
    vi.unstubAllGlobals();
  });

  it("não repete uma entrega já confirmada", async () => {
    mocks.getEmailDeliveryByKey.mockResolvedValue({ id: 91, status: "sent" });
    const result = await sendProposalEmail({ proposalId: 8, actorUserId: 2, origin: "https://proposta.example" });
    expect(result).toEqual({ status: "already_sent", deliveryId: 91 });
    expect(mocks.registerEmailPending).not.toHaveBeenCalled();
    expect(mocks.generateAndStoreProposalPdf).not.toHaveBeenCalled();
  });

  it("regista falha quando a integração não tem credenciais", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    const result = await sendProposalEmail({ proposalId: 8, actorUserId: 2, origin: "https://proposta.example" });
    expect(result).toEqual({ status: "failed", error: "Integração Resend não configurada." });
    expect(mocks.markEmailFailed).toHaveBeenCalledWith("proposal-8-v3-sent", "Integração Resend não configurada.");
  });

  it("envia o link, o PDF e a chave de idempotência", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "Proposta+ <propostas@example.com>";
    mocks.generateAndStoreProposalPdf.mockResolvedValue({ filename: "PP-2026-0008.pdf", buffer: Buffer.from("PDF"), url: "https://storage.example/pdf" });
    mocks.getEmailDeliveryByKey.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ id: 17, status: "sent" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email_123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendProposalEmail({ proposalId: 8, actorUserId: 2, origin: "https://proposta.example/" });

    expect(result).toEqual({ status: "sent", deliveryId: 17, documentUrl: "https://storage.example/pdf" });
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.headers).toMatchObject({ "Idempotency-Key": "proposal-8-v3-sent" });
    const body = JSON.parse(String(request.body));
    expect(body.attachments[0]).toEqual({ filename: "PP-2026-0008.pdf", content: Buffer.from("PDF").toString("base64") });
    expect(body.html).toContain("Ana &amp; Filhos");
    expect(body.html).toContain("/p/token-seguro");
    expect(mocks.markEmailDelivered).toHaveBeenCalledWith("proposal-8-v3-sent", "email_123");
  });
});
