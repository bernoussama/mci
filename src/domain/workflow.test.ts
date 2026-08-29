import { describe, expect, it } from "vitest";
import { executeExpenseWorkflow, expenseWorkflow } from "./workflow";

describe("executeExpenseWorkflow", () => {
  it("routes a small expense directly to accounting", () => {
    const trace = executeExpenseWorkflow(expenseWorkflow, { employee: "Oussama", merchant: "Cafe", amount: 42 });
    expect(trace.at(-1)).toMatchObject({ stepId: "accounting", status: "completed" });
  });

  it("pauses a large expense for manager approval", () => {
    const trace = executeExpenseWorkflow(expenseWorkflow, { employee: "Oussama", merchant: "Hotel", amount: 640 });
    expect(trace.at(-1)).toMatchObject({ stepId: "approve", status: "waiting" });
  });
});
