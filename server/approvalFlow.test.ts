import { describe, expect, it } from "vitest";
import { isApprovalChainReady, nextPendingApproval } from "./approvalFlow";

describe("cadeia de aprovação", () => {
  it("liberta apenas a primeira etapa pendente pela ordem definida", () => {
    const steps = [{ id: 3, position: 2, decision: "pending" as const }, { id: 1, position: 0, decision: "approved" as const }, { id: 2, position: 1, decision: "pending" as const }];
    expect(nextPendingApproval(steps)?.id).toBe(2);
    expect(isApprovalChainReady(steps)).toBe(false);
  });

  it("bloqueia a progressão após uma recusa e exige etapas concluídas para envio", () => {
    const rejected = [{ id: 1, position: 0, decision: "rejected" as const }, { id: 2, position: 1, decision: "pending" as const }];
    expect(nextPendingApproval(rejected)).toBeUndefined();
    expect(isApprovalChainReady(rejected)).toBe(false);
    expect(isApprovalChainReady([{ id: 1, position: 0, decision: "approved" as const }, { id: 2, position: 1, decision: "skipped" as const }])).toBe(true);
  });
});
