import { z } from "zod";

export const MAX_DISCOVERY_QUESTIONS = 5;

export const DiscoveryTurnSchema = z.object({
  question: z.string().trim().min(5).max(240),
  answer: z.string().trim().min(2).max(2_000),
}).strict();

export const WorkflowSuggestionSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(240),
  prompt: z.string().trim().min(20).max(1_200),
}).strict();

export const DiscoveryDecisionSchema = z.object({
  stage: z.enum(["question", "complete"]),
  assessment: z.string().trim().min(5).max(320),
  question: z.string().trim().min(5).max(240).nullable(),
  suggestions: z.array(WorkflowSuggestionSchema).max(3),
}).strict().superRefine((value, context) => {
  if (value.stage === "question" && (!value.question || value.suggestions.length !== 0)) {
    context.addIssue({ code: "custom", message: "A question decision needs one question and no suggestions." });
  }
  if (value.stage === "complete" && (value.question !== null || value.suggestions.length < 2)) {
    context.addIssue({ code: "custom", message: "A complete decision needs two or three suggestions and no question." });
  }
});

export const DiscoveryRequestSchema = z.object({
  turns: z.array(DiscoveryTurnSchema).min(1).max(MAX_DISCOVERY_QUESTIONS),
}).strict();

export const DiscoveryResponseSchema = z.object({
  ok: z.literal(true),
  source: z.enum(["model", "fallback"]),
  decision: DiscoveryDecisionSchema,
  warning: z.string().nullable(),
}).strict();

export type DiscoveryTurn = z.infer<typeof DiscoveryTurnSchema>;
export type DiscoveryDecision = z.infer<typeof DiscoveryDecisionSchema>;
export type DiscoveryResponse = z.infer<typeof DiscoveryResponseSchema>;
export type WorkflowSuggestion = z.infer<typeof WorkflowSuggestionSchema>;
