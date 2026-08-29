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

export type SubmissionValue = string | number;
export type WorkflowSubmission = Record<string, SubmissionValue>;
export type RunStatus = "running" | "waiting" | "completed" | "rejected";
export type Decision = "approve" | "reject";

export type TraceEvent = {
  id: string;
  stepId: string;
  title: string;
  status: "completed" | "waiting" | "rejected";
  detail: string;
  actor: string;
  timestamp: string;
  input: string;
  output: string;
  reason: string;
};

export type WorkflowRun = {
  id: string;
  status: RunStatus;
  input: WorkflowSubmission;
  events: TraceEvent[];
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

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function requireSubmission(spec: WorkflowSpec, input: WorkflowSubmission) {
  for (const field of spec.fields) {
    if (field.required && (input[field.id] === undefined || input[field.id] === "")) {
      throw new Error(`${field.label} is required.`);
    }
  }

  if (typeof input.amount !== "number" || !Number.isFinite(input.amount)) {
    throw new Error("Amount must be a valid number.");
  }
}

/** Starts an immutable run from the generated form values. */
export function startRun(spec: WorkflowSpec, input: WorkflowSubmission): WorkflowRun {
  requireSubmission(spec, input);
  const employee = String(input.employee);
  const merchant = String(input.merchant);
  const amount = Number(input.amount);
  const needsApproval = amount > spec.approvalThreshold;
  const events: TraceEvent[] = [
    { id: createId("event"), stepId: "submit", title: "Expense submitted", status: "completed", detail: `${employee} submitted an expense.`, actor: employee, timestamp: "13:42:00", input: "Generated expense form", output: `${merchant} · $${amount.toFixed(2)}`, reason: "The workflow was started by a completed employee form." },
    { id: createId("event"), stepId: "extract", title: "Receipt read", status: "completed", detail: `Found ${merchant} and $${amount.toFixed(2)}.`, actor: "Traceflow AI", timestamp: "13:42:02", input: "Receipt filename (simulated extraction)", output: `Merchant: ${merchant}; amount: $${amount.toFixed(2)}; confidence: 96%`, reason: "The demo simulates extraction; no receipt bytes leave the browser." },
    { id: createId("event"), stepId: "threshold", title: "Amount checked", status: "completed", detail: needsApproval ? `Amount is above $${spec.approvalThreshold}.` : `Amount is within the $${spec.approvalThreshold} limit.`, actor: "Policy engine", timestamp: "13:42:03", input: `Amount: $${amount.toFixed(2)}; limit: $${spec.approvalThreshold.toFixed(2)}`, output: needsApproval ? "Manager approval required" : "Automatically approved", reason: needsApproval ? "The expense exceeds the configured approval threshold." : "The expense is within the automatic approval threshold." },
  ];

  if (needsApproval) {
    events.push({ id: createId("event"), stepId: "approve", title: "Manager approval", status: "waiting", detail: "The run is paused until a manager decides.", actor: "Finance manager", timestamp: "13:42:04", input: `Expense from ${employee}`, output: "Waiting for an approval decision", reason: "A human checkpoint is required for high-value expenses." });
  } else {
    events.push({ id: createId("event"), stepId: "accounting", title: "Sent to accounting", status: "completed", detail: "The expense was forwarded automatically.", actor: "Traceflow", timestamp: "13:42:04", input: "Automatically approved expense", output: "Accounting task created", reason: "The policy allows this expense to continue without review." });
  }

  return { id: createId("run"), status: needsApproval ? "waiting" : "completed", input, events };
}

/** Resolves a waiting approval once. Repeated decisions return the same run. */
export function decideRun(spec: WorkflowSpec, run: WorkflowRun, decision: Decision): WorkflowRun {
  if (run.status !== "waiting") return run;
  const approval = run.events.find((event) => event.stepId === "approve" && event.status === "waiting");
  if (!approval) return run;

  const events = run.events.map((event) => event.id === approval.id ? {
    ...event,
    status: decision === "approve" ? "completed" as const : "rejected" as const,
    detail: decision === "approve" ? "Approved by the finance manager." : "Rejected by the finance manager.",
    actor: "Finance manager",
    timestamp: "13:42:20",
    output: decision === "approve" ? "Approved" : "Rejected",
    reason: `The finance manager chose to ${decision} this expense.`,
  } : event);

  if (decision === "reject") return { ...run, status: "rejected", events };

  return {
    ...run,
    status: "completed",
    events: [...events, {
      id: createId("event"),
      stepId: "accounting",
      title: "Sent to accounting",
      status: "completed",
      detail: "An accounting task was created and the employee was notified.",
      actor: "Traceflow",
      timestamp: "13:42:21",
      input: "Manager-approved expense",
      output: "Accounting task created; employee notified",
      reason: "The workflow resumed from the approved human checkpoint.",
    }],
  };
}
