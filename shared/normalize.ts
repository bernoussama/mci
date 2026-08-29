import {
  WorkflowDraftSchema,
  WorkflowSpecSchema,
  type WorkflowDraft,
  type WorkflowSpec,
} from "./workflow-schema";

function workflowId(name: string): string {
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return /^[a-z]/.test(id) ? id : "expense-approval";
}

export function normalizeWorkflow(input: WorkflowDraft): WorkflowSpec {
  const draft = WorkflowDraftSchema.parse(input);
  const fields = new Map(draft.fields.map((field) => [field.id, field]));

  if (fields.size !== draft.fields.length) {
    throw new Error("Field IDs must be unique.");
  }

  const requiredFieldIds = ["employee", "receipt", "merchant", "amount"];
  if (fields.size !== requiredFieldIds.length || requiredFieldIds.some((id) => !fields.has(id))) {
    throw new Error("The workflow must contain employee, receipt, merchant, and amount fields.");
  }

  const source = fields.get(draft.extraction.sourceFieldId);
  if (!source || source.type !== "file") {
    throw new Error("The extraction source must reference a file field.");
  }

  if (draft.extraction.sourceFieldId !== "receipt") {
    throw new Error("The extraction source must be the receipt field.");
  }

  for (const outputId of draft.extraction.outputFieldIds) {
    if (!fields.has(outputId)) {
      throw new Error(`Extraction output '${outputId}' does not exist.`);
    }
  }

  if (!draft.extraction.outputFieldIds.includes("merchant") || !draft.extraction.outputFieldIds.includes("amount")) {
    throw new Error("Extraction must output merchant and amount.");
  }

  const approvalField = fields.get(draft.approval.fieldId);
  if (!approvalField || approvalField.type !== "number") {
    throw new Error("The approval rule must reference a number field.");
  }

  if (draft.approval.fieldId !== "amount") {
    throw new Error("The approval rule must reference the amount field.");
  }

  return WorkflowSpecSchema.parse({
    version: 1,
    id: workflowId(draft.name),
    name: draft.name,
    description: draft.description,
    form: { title: draft.formTitle, fields: draft.fields },
    steps: [
      { id: "submit", kind: "trigger", title: "Expense submitted", description: `Open the ${draft.formTitle.toLowerCase()} form.` },
      { id: "extract", kind: "ai", title: "Read receipt", description: `Simulate extracting ${draft.extraction.outputFieldIds.join(" and ")}.` },
      { id: "threshold", kind: "condition", title: "Check amount", description: `Compare ${draft.approval.fieldId} with $${draft.approval.threshold}.` },
      { id: "approve", kind: "approval", title: `${draft.approval.approverRole} approval`, description: "Pause large expenses for a decision." },
      { id: "accounting", kind: "action", title: "Send to accounting", description: "Forward an approved expense." },
    ],
    approval: draft.approval,
  });
}
