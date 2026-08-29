import { z } from "zod";

const fieldId = z.string()
  .regex(/^[a-z][a-z0-9_]*$/)
  .max(48)
  .describe("Stable lowercase identifier using letters, numbers, and underscores.");

export const WorkflowFieldSchema = z.object({
  id: fieldId.describe("Field ID. Use employee, receipt, merchant, or amount."),
  label: z.string().trim().min(1).max(80).describe("Short label shown above the form input."),
  type: z.enum(["text", "number", "file"]).describe("HTML input type supported by the generated form."),
  required: z.boolean().describe("Whether the employee must provide this field."),
}).strict();

export const WorkflowDraftSchema = z.object({
  name: z.string().trim().min(1).max(80).describe("Short workflow name."),
  description: z.string().trim().min(1).max(240).describe("One sentence explaining the expense approval rule."),
  formTitle: z.string().trim().min(1).max(80).describe("Short title for the employee expense form."),
  fields: z.array(WorkflowFieldSchema).length(4).describe("Exactly the four required expense fields."),
  extraction: z.object({
    sourceFieldId: fieldId.describe("Must be receipt."),
    outputFieldIds: z.array(fieldId).length(2).describe("Must contain merchant and amount."),
  }).strict(),
  approval: z.object({
    fieldId: fieldId.describe("Must be amount."),
    operator: z.literal("greater_than"),
    threshold: z.number().finite().nonnegative().max(1_000_000).describe("Numeric amount copied from the prompt, or 500 by default."),
    approverRole: z.string().trim().min(1).max(48).describe("Role that approves large expenses, or manager by default."),
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
