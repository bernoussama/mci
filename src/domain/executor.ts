import type { WorkflowSpec } from "../../shared/workflow-schema";

export type SubmissionValue = string | number;
export type WorkflowSubmission = Record<string, SubmissionValue>;
export type RunStatus = "running" | "waiting" | "completed" | "rejected";

export type TraceEvent = {
  id: string;
  stepId: string;
  status: "completed" | "waiting" | "rejected";
  title: string;
  detail: string;
};

export type WorkflowRun = {
  id: string;
  status: RunStatus;
  input: WorkflowSubmission;
  events: TraceEvent[];
};

function event(stepId: string, status: TraceEvent["status"], title: string, detail: string): TraceEvent {
  return { id: crypto.randomUUID(), stepId, status, title, detail };
}

export function startRun(spec: WorkflowSpec, input: WorkflowSubmission): WorkflowRun {
  for (const field of spec.form.fields) {
    if (field.required && (input[field.id] === undefined || input[field.id] === "")) {
      throw new Error(`${field.label} is required.`);
    }
  }

  const amount = input[spec.approval.fieldId];
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error("The approval field must be a number.");
  }

  const needsApproval = amount > spec.approval.threshold;
  const events = [
    event("submit", "completed", "Expense submitted", "The generated form started this run."),
    event("extract", "completed", "Receipt read", "Simulated receipt extraction for the demo."),
    event("threshold", "completed", "Amount checked", needsApproval
      ? `$${amount.toFixed(2)} is above $${spec.approval.threshold}.`
      : `$${amount.toFixed(2)} is within the $${spec.approval.threshold} limit.`),
  ];

  if (needsApproval) {
    events.push(event("approve", "waiting", `${spec.approval.approverRole} approval`, "The run is paused for a decision."));
  } else {
    events.push(event("accounting", "completed", "Sent to accounting", "The expense was forwarded automatically."));
  }

  return {
    id: crypto.randomUUID(),
    status: needsApproval ? "waiting" : "completed",
    input,
    events,
  };
}

export function decideRun(
  spec: WorkflowSpec,
  run: WorkflowRun,
  decision: "approve" | "reject",
): WorkflowRun {
  if (run.status !== "waiting") return run;

  const withoutWaiting = run.events.filter((item) => item.status !== "waiting");
  if (decision === "reject") {
    return {
      ...run,
      status: "rejected",
      events: [...withoutWaiting, event("approve", "rejected", "Expense rejected", "The manager rejected this expense.")],
    };
  }

  return {
    ...run,
    status: "completed",
    events: [
      ...withoutWaiting,
      event("approve", "completed", "Expense approved", "The manager approved this expense."),
      event("accounting", "completed", "Sent to accounting", "The approved expense was forwarded."),
    ],
  };
}
