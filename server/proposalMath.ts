export const proposalStates = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export type ProposalState = (typeof proposalStates)[number];

export type ProposalLineInput = {
  quantity: number;
  unitPriceCents: number;
  discountBps?: number;
};

export type CalculatedProposalLine = ProposalLineInput & {
  lineSubtotalCents: number;
  lineDiscountCents: number;
  lineTotalCents: number;
};

export type ProposalTotals = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  lines: CalculatedProposalLine[];
};

function assertBasisPoints(value: number, field: string) {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error(`${field} tem de estar entre 0 e 10.000 pontos-base.`);
  }
}

export function calculateProposalLine(input: ProposalLineInput): CalculatedProposalLine {
  const discountBps = input.discountBps ?? 0;
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("A quantidade tem de ser superior a zero.");
  }
  if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 0) {
    throw new Error("O preço unitário tem de ser um valor monetário válido.");
  }
  assertBasisPoints(discountBps, "O desconto do item");

  const lineSubtotalCents = Math.round(input.quantity * input.unitPriceCents);
  const lineDiscountCents = Math.round((lineSubtotalCents * discountBps) / 10_000);

  return {
    quantity: input.quantity,
    unitPriceCents: input.unitPriceCents,
    discountBps,
    lineSubtotalCents,
    lineDiscountCents,
    lineTotalCents: lineSubtotalCents - lineDiscountCents,
  };
}

export function calculateProposalTotals(
  lines: ProposalLineInput[],
  taxRateBps: number,
  globalDiscountBps: number,
): ProposalTotals {
  assertBasisPoints(taxRateBps, "A taxa de imposto");
  assertBasisPoints(globalDiscountBps, "O desconto global");

  const calculatedLines = lines.map(calculateProposalLine);
  const subtotalCents = calculatedLines.reduce(
    (sum, line) => sum + line.lineTotalCents,
    0,
  );
  const discountCents = Math.round((subtotalCents * globalDiscountBps) / 10_000);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round((taxableCents * taxRateBps) / 10_000);

  return {
    lines: calculatedLines,
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: taxableCents + taxCents,
  };
}

const transitionMap: Record<ProposalState, ProposalState[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export function canTransitionProposal(
  fromState: ProposalState,
  toState: ProposalState,
): boolean {
  return transitionMap[fromState].includes(toState);
}

export function assertProposalTransition(
  fromState: ProposalState,
  toState: ProposalState,
) {
  if (!canTransitionProposal(fromState, toState)) {
    throw new Error(`Não é permitido mudar uma proposta de ${fromState} para ${toState}.`);
  }
}
