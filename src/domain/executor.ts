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
  actor: string;
  occurredAt: string;
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

type EventInput = Omit<TraceEvent, "id" | "occurredAt">;

function event(input: EventInput): TraceEvent {
  return { id: crypto.randomUUID(), occurredAt: new Date().toISOString(), ...input };
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
  const employee = String(input.employee ?? "Employee");
  const merchant = String(input.merchant ?? "Unknown merchant");
  const receipt = String(input.receipt ?? "No receipt selected");
  const events = [
    event({
      stepId: "submit",
      status: "completed",
      title: "Expense submitted",
      detail: `${employee} submitted an expense.`,
      actor: employee,
      input: spec.form.title,
      output: `${merchant}, $${amount.toFixed(2)}`,
      reason: "A completed generated form starts the workflow.",
    }),
    event({
      stepId: "extract",
      status: "completed",
      title: "Receipt read",
      detail: "Simulated receipt extraction for the demo.",
      actor: "MCI AI, simulated",
      input: receipt,
      output: `Merchant: ${merchant}; amount: $${amount.toFixed(2)}`,
      reason: "The MVP records supplied form values. It does not upload or read receipt bytes.",
    }),
    event({
      stepId: "threshold",
      status: "completed",
      title: "Amount checked",
      detail: needsApproval
        ? `$${amount.toFixed(2)} is above $${spec.approval.threshold}.`
        : `$${amount.toFixed(2)} is within the $${spec.approval.threshold} limit.`,
      actor: "Policy engine",
      input: `Amount: $${amount.toFixed(2)}; threshold: $${spec.approval.threshold.toFixed(2)}`,
      output: needsApproval ? `${spec.approval.approverRole} approval required` : "Automatic approval",
      reason: needsApproval
        ? "The expense exceeds the configured threshold."
        : "The expense is within the automatic approval limit.",
    }),
  ];

  if (needsApproval) {
    events.push(event({
      stepId: "approve",
      status: "waiting",
      title: `${spec.approval.approverRole} approval`,
      detail: "The run is paused for a decision.",
      actor: spec.approval.approverRole,
      input: `${merchant}, $${amount.toFixed(2)}`,
      output: "Waiting for approval or rejection",
      reason: "A human checkpoint is required above the configured threshold.",
    }));
  } else {
    events.push(event({
      stepId: "accounting",
      status: "completed",
      title: "Sent to accounting",
      detail: "The demo recorded an automatic accounting handoff.",
      actor: "MCI",
      input: "Automatically approved expense",
      output: "Simulated accounting task",
      reason: "No human approval was required.",
    }));
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

  const waitingEvent = run.events.find((item) => item.stepId === "approve" && item.status === "waiting");
  if (!waitingEvent) return run;

  const decidedEvent: TraceEvent = {
    ...waitingEvent,
    status: decision === "approve" ? "completed" : "rejected",
    title: decision === "approve" ? "Expense approved" : "Expense rejected",
    detail: `${spec.approval.approverRole} ${decision === "approve" ? "approved" : "rejected"} the expense.`,
    occurredAt: new Date().toISOString(),
    output: decision === "approve" ? "Approved" : "Rejected",
    reason: `The ${spec.approval.approverRole} chose to ${decision} this expense.`,
  };
  const decidedEvents = run.events.map((item) => item.id === waitingEvent.id ? decidedEvent : item);

  if (decision === "reject") {
    return {
      ...run,
      status: "rejected",
      events: decidedEvents,
    };
  }

  return {
    ...run,
    status: "completed",
    events: [
      ...decidedEvents,
      event({
        stepId: "accounting",
        status: "completed",
        title: "Sent to accounting",
        detail: "The demo recorded the approved accounting handoff.",
        actor: "MCI",
        input: "Human-approved expense",
        output: "Simulated accounting task",
        reason: "The workflow resumed after approval.",
      }),
    ],
  };
}
