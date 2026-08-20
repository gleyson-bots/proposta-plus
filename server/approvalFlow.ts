export type ApprovalDecision = "pending" | "approved" | "rejected" | "skipped";
export type ApprovalStepState = { id: number; position: number; decision: ApprovalDecision };

export function nextPendingApproval(steps: ApprovalStepState[]) {
  if (steps.some(step => step.decision === "rejected")) return undefined;
  return [...steps].sort((left, right) => left.position - right.position).find(step => step.decision === "pending");
}

export function isApprovalChainReady(steps: ApprovalStepState[]) {
  return steps.every(step => step.decision === "approved" || step.decision === "skipped");
}
