import { describe, expect, it } from "vitest";
import { normalizeWorkflow } from "./normalize";
import type { WorkflowDraft } from "./workflow-schema";

const draft: WorkflowDraft = {
  name: "Expense approval",
  description: "Approve large expenses.",
  formTitle: "Submit an expense",
  fields: [
    { id: "receipt", label: "Receipt", type: "file", required: true },
    { id: "amount", label: "Amount", type: "number", required: true },
  ],
  extraction: { sourceFieldId: "receipt", outputFieldIds: ["amount"] },
  approval: { fieldId: "amount", operator: "greater_than", threshold: 500, approverRole: "manager" },
  destination: "accounting",
};

describe("normalizeWorkflow", () => {
  it("creates stable runtime steps", () => {
    expect(normalizeWorkflow(draft).steps.map((step) => step.id)).toEqual([
      "submit", "extract", "threshold", "approve", "accounting",
    ]);
  });

  it("rejects an approval rule that points at a non-number field", () => {
    expect(() => normalizeWorkflow({ ...draft, approval: { ...draft.approval, fieldId: "receipt" } })).toThrow(
      "approval rule must reference a number field",
    );
  });
});
