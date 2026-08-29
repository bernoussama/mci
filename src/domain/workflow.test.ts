import { describe, expect, it } from "vitest";
import { decideRun, expenseWorkflow, startRun } from "./workflow";

const submission = (amount: number) => ({
  employee: "Oussama",
  receipt: "receipt.jpg",
  merchant: "Hotel",
  amount,
});

describe("expense workflow executor", () => {
  it("routes an expense at the threshold directly to accounting", () => {
    const run = startRun(expenseWorkflow, submission(500));
    expect(run).toMatchObject({ status: "completed" });
    expect(run.events.at(-1)).toMatchObject({ stepId: "accounting", status: "completed" });
  });

  it("pauses a large expense for manager approval", () => {
    const run = startRun(expenseWorkflow, submission(500.01));
    expect(run).toMatchObject({ status: "waiting" });
    expect(run.events.at(-1)).toMatchObject({ stepId: "approve", status: "waiting" });
  });

  it("continues an approved expense once and records accounting", () => {
    const pending = startRun(expenseWorkflow, submission(640));
    const approved = decideRun(expenseWorkflow, pending, "approve");

    expect(approved).toMatchObject({ status: "completed" });
    expect(approved.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ stepId: "approve", status: "completed" }),
      expect.objectContaining({ stepId: "accounting", status: "completed" }),
    ]));
    expect(decideRun(expenseWorkflow, approved, "approve")).toEqual(approved);
  });

  it("ends a rejected expense without creating an accounting task", () => {
    const pending = startRun(expenseWorkflow, submission(640));
    const rejected = decideRun(expenseWorkflow, pending, "reject");

    expect(rejected).toMatchObject({ status: "rejected" });
    expect(rejected.events.at(-1)).toMatchObject({ stepId: "approve", status: "rejected" });
    expect(rejected.events.some((event) => event.stepId === "accounting")).toBe(false);
  });

  it("rejects a missing required field before creating a run", () => {
    expect(() => startRun(expenseWorkflow, { employee: "Oussama", merchant: "Hotel", amount: 640 }))
      .toThrow("Receipt is required.");
  });
});
