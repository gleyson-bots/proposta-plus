import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCompanySettings: vi.fn() }));
vi.mock("./db", () => ({ getCompanySettings: mocks.getCompanySettings }));
vi.mock("./storage", () => ({ storageGetSignedUrl: vi.fn(), storagePut: vi.fn() }));

import { renderProposalPdf } from "./documents";

describe("documento PDF da proposta", () => {
  beforeEach(() => mocks.getCompanySettings.mockResolvedValue({ legalName: "Atelier Dourado", tradingName: "Atelier", taxId: "PT123", email: "geral@example.com", phone: "+351 000", logoStorageKey: null }));

  it("gera um PDF válido com identidade, termos comerciais e anexos partilhados", async () => {
    const buffer = await renderProposalPdf({
      proposal: { proposalNumber: "PP-2026-0001", title: "Proposta de serviço", currency: "EUR", createdAt: new Date(), subtotalCents: 10_000, discountCents: 0, taxCents: 2_300, totalCents: 12_300, clientMessage: "Obrigada pela preferência.", validUntil: null },
      client: { companyName: "Cliente Exemplo", contactName: "Ana", email: "ana@example.com", taxId: "PT999" },
      items: [{ title: "Consultoria", description: "Âmbito estratégico", quantity: "1", lineTotalCents: 10_000 }],
      metadata: { commercialTerms: { paymentTerms: "30 dias", downPayment: "20%", financingTerms: "Sujeito a aprovação", commissionTerms: "Incluída", eligibilityCriteria: "Documentação válida", catalogAttributes: "Serviço premium" } },
      attachments: [{ originalName: "termos.pdf", includeInDocument: true, shareWithClient: true }],
    } as any);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1_000);
  });
});
