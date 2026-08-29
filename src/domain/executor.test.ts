import { describe, expect, it } from "vitest";
import { expenseWorkflow } from "../../shared/workflow-schema";
import { decideRun, startRun } from "./executor";

const baseInput = { employee: "Oussama", receipt: "receipt.pdf", merchant: "Cafe" };

describe("workflow executor", () => {
  it("completes an expense at the approval threshold", () => {
    const run = startRun(expenseWorkflow, { ...baseInput, amount: 500 });
    expect(run.status).toBe("completed");
    expect(run.events.at(-1)?.stepId).toBe("accounting");
  });

  it("waits above the threshold and resumes after approval", () => {
    const waiting = startRun(expenseWorkflow, { ...baseInput, amount: 500.01 });
    const approved = decideRun(expenseWorkflow, waiting, "approve");
    expect(waiting.status).toBe("waiting");
    expect(approved.status).toBe("completed");
    expect(approved.events.at(-1)?.stepId).toBe("accounting");
  });

  it("rejects without sending to accounting", () => {
    const waiting = startRun(expenseWorkflow, { ...baseInput, amount: 640 });
    const rejected = decideRun(expenseWorkflow, waiting, "reject");
    expect(rejected.status).toBe("rejected");
    expect(rejected.events.some((item) => item.stepId === "accounting")).toBe(false);
    expect(decideRun(expenseWorkflow, rejected, "approve")).toBe(rejected);
  });
});
