import { describe, expect, it } from "vitest";
import {
  assertProposalTransition,
  calculateProposalTotals,
  canTransitionProposal,
} from "./proposalMath";

describe("cálculo de propostas", () => {
  it("calcula itens, descontos globais, imposto e total em cêntimos", () => {
    const totals = calculateProposalTotals(
      [
        { quantity: 2, unitPriceCents: 12_500, discountBps: 1_000 },
        { quantity: 1.5, unitPriceCents: 8_000, discountBps: 0 },
      ],
      2_300,
      500,
    );

    expect(totals.lines[0]).toMatchObject({
      lineSubtotalCents: 25_000,
      lineDiscountCents: 2_500,
      lineTotalCents: 22_500,
    });
    expect(totals).toMatchObject({
      subtotalCents: 34_500,
      discountCents: 1_725,
      taxCents: 7_538,
      totalCents: 40_313,
    });
  });

  it("rejeita valores monetários e percentagens inválidos", () => {
    expect(() => calculateProposalTotals([{ quantity: 0, unitPriceCents: 100 }], 0, 0)).toThrow();
    expect(() => calculateProposalTotals([{ quantity: 1, unitPriceCents: 100 }], 10_001, 0)).toThrow();
  });

  it("mantém precisão em quantidades fracionadas e arredonda ao cêntimo", () => {
    const result = calculateProposalTotals([{ quantity: 2.75, unitPriceCents: 1_999, discountBps: 333 }], 2_300, 0);
    expect(result.lines[0]?.lineSubtotalCents).toBe(5_497);
    expect(result.lines[0]?.lineDiscountCents).toBe(183);
    expect(result.totalCents).toBe(6_536);
  });
});

describe("transições de estado", () => {
  it("aceita apenas o fluxo de ciclo de vida definido", () => {
    expect(canTransitionProposal("draft", "sent")).toBe(true);
    expect(canTransitionProposal("sent", "accepted")).toBe(true);
    expect(canTransitionProposal("accepted", "draft")).toBe(false);
    expect(() => assertProposalTransition("draft", "accepted")).toThrow();
  });

  it("não permite reabrir ou alterar uma decisão final", () => {
    expect(canTransitionProposal("rejected", "sent")).toBe(false);
    expect(canTransitionProposal("expired", "accepted")).toBe(false);
    expect(canTransitionProposal("sent", "expired")).toBe(true);
  });
});
