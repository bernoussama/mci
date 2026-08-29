import { z } from "zod";

const fieldId = z.string().regex(/^[a-z][a-z0-9_]*$/).max(48);

export const WorkflowFieldSchema = z.object({
  id: fieldId,
  label: z.string().trim().min(1).max(80),
  type: z.enum(["text", "number", "file"]),
  required: z.boolean(),
}).strict();

export const WorkflowDraftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  formTitle: z.string().trim().min(1).max(80),
  fields: z.array(WorkflowFieldSchema).min(1).max(12),
  extraction: z.object({
    sourceFieldId: fieldId,
    outputFieldIds: z.array(fieldId).min(1).max(8),
  }).strict(),
  approval: z.object({
    fieldId,
    operator: z.literal("greater_than"),
    threshold: z.number().finite().nonnegative().max(1_000_000),
    approverRole: z.string().trim().min(1).max(48),
  }).strict(),
  destination: z.literal("accounting"),
}).strict();

export const WorkflowStepSchema = z.object({
  id: z.enum(["submit", "extract", "threshold", "approve", "accounting"]),
  kind: z.enum(["trigger", "ai", "condition", "approval", "action"]),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(180),
}).strict();

export const WorkflowSpecSchema = z.object({
  version: z.literal(1),
  id: z.string().regex(/^[a-z][a-z0-9-]*$/).max(64),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  form: z.object({
    title: z.string().min(1).max(80),
    fields: z.array(WorkflowFieldSchema).min(1).max(12),
  }).strict(),
  steps: z.array(WorkflowStepSchema).length(5),
  approval: z.object({
    fieldId,
    operator: z.literal("greater_than"),
    threshold: z.number().finite().nonnegative().max(1_000_000),
    approverRole: z.string().min(1).max(48),
  }).strict(),
}).strict();

export const CompileRequestSchema = z.object({
  prompt: z.string().trim().min(20).max(4_000),
}).strict();

const CompileSuccessSchema = z.object({
  ok: z.literal(true),
  source: z.enum(["model", "fallback"]),
  spec: WorkflowSpecSchema,
  warning: z.string().nullable(),
}).strict();

const CompileFailureSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.enum(["invalid_request", "internal_error"]),
    message: z.string(),
  }).strict(),
}).strict();

export const CompileResponseSchema = z.discriminatedUnion("ok", [
  CompileSuccessSchema,
  CompileFailureSchema,
]);

export type WorkflowField = z.infer<typeof WorkflowFieldSchema>;
export type WorkflowDraft = z.infer<typeof WorkflowDraftSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;
export type CompileResponse = z.infer<typeof CompileResponseSchema>;

export const expenseWorkflow: WorkflowSpec = {
  version: 1,
  id: "expense-approval",
  name: "Expense approval",
  description: "Capture an expense and route large amounts to a manager before accounting.",
  form: {
    title: "Submit an expense",
    fields: [
      { id: "employee", label: "Employee", type: "text", required: true },
      { id: "receipt", label: "Receipt", type: "file", required: true },
      { id: "merchant", label: "Merchant", type: "text", required: true },
      { id: "amount", label: "Amount", type: "number", required: true },
    ],
  },
  steps: [
    { id: "submit", kind: "trigger", title: "Expense submitted", description: "Start when an employee sends the form." },
    { id: "extract", kind: "ai", title: "Read receipt", description: "Simulate extracting the merchant and amount." },
    { id: "threshold", kind: "condition", title: "Check amount", description: "Compare the amount with the approval limit." },
    { id: "approve", kind: "approval", title: "Manager approval", description: "Pause large expenses for a decision." },
    { id: "accounting", kind: "action", title: "Send to accounting", description: "Forward an approved expense." },
  ],
  approval: {
    fieldId: "amount",
    operator: "greater_than",
    threshold: 500,
    approverRole: "manager",
  },
};
