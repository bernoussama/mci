export type FieldType = "text" | "number" | "file";

export type WorkflowField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
};

export type WorkflowStep = {
  id: string;
  kind: "trigger" | "ai" | "condition" | "approval" | "action";
  title: string;
  description: string;
};

export type WorkflowSpec = {
  id: string;
  name: string;
  description: string;
  fields: WorkflowField[];
  steps: WorkflowStep[];
  approvalThreshold: number;
};

export type ExpenseSubmission = {
  employee: string;
  merchant: string;
  amount: number;
};

export type TraceEvent = {
  stepId: string;
  title: string;
  status: "completed" | "waiting";
  detail: string;
};

export const expenseWorkflow: WorkflowSpec = {
  id: "expense-approval",
  name: "Expense approval",
  description: "Capture an expense, extract receipt data, and route large expenses to a manager.",
  approvalThreshold: 500,
  fields: [
    { id: "employee", label: "Employee", type: "text", required: true },
    { id: "receipt", label: "Receipt", type: "file", required: true },
    { id: "merchant", label: "Merchant", type: "text", required: true },
    { id: "amount", label: "Amount", type: "number", required: true },
  ],
  steps: [
    { id: "submit", kind: "trigger", title: "Expense submitted", description: "Start when an employee sends the form." },
    { id: "extract", kind: "ai", title: "Read receipt", description: "Extract the merchant and amount." },
    { id: "threshold", kind: "condition", title: "Check amount", description: "Compare the amount with the $500 limit." },
    { id: "approve", kind: "approval", title: "Manager approval", description: "Pause large expenses for a decision." },
    { id: "accounting", kind: "action", title: "Send to accounting", description: "Forward approved expense data." },
  ],
};

export function executeExpenseWorkflow(
  spec: WorkflowSpec,
  submission: ExpenseSubmission,
): TraceEvent[] {
  const needsApproval = submission.amount > spec.approvalThreshold;
  const events: TraceEvent[] = [
    { stepId: "submit", title: "Expense submitted", status: "completed", detail: `${submission.employee} submitted an expense.` },
    { stepId: "extract", title: "Receipt read", status: "completed", detail: `Found ${submission.merchant} and $${submission.amount.toFixed(2)}.` },
    { stepId: "threshold", title: "Amount checked", status: "completed", detail: needsApproval ? `Amount is above $${spec.approvalThreshold}.` : `Amount is within the $${spec.approvalThreshold} limit.` },
  ];

  if (needsApproval) {
    events.push({ stepId: "approve", title: "Manager approval", status: "waiting", detail: "The run is paused until a manager decides." });
  } else {
    events.push({ stepId: "accounting", title: "Sent to accounting", status: "completed", detail: "The expense was forwarded automatically." });
  }

  return events;
}
