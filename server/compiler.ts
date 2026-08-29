import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { normalizeWorkflow } from "../shared/normalize";
import {
  WorkflowDraftSchema,
  expenseWorkflow,
  type CompileResponse,
} from "../shared/workflow-schema";

const WORKFLOW_COMPILER_PROMPT = `
Generate one constrained expense approval workflow.
Use only text, number, and file fields.
The extraction source must be a file field.
The approval field must be a number field and use greater_than.
The destination must be accounting.
Preserve the threshold and approver role from the user's prompt.
Do not invent code, URLs, credentials, or executable expressions.
`.trim();

export async function compileWorkflow(prompt: string): Promise<CompileResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: true,
      source: "fallback",
      spec: expenseWorkflow,
      warning: "Model is not configured. Using the demo workflow.",
    };
  }

  try {
    const { output } = await generateText({
      model: openai(process.env.MCI_MODEL ?? "gpt-5-mini"),
      output: Output.object({
        schema: WorkflowDraftSchema,
        name: "workflow_draft",
        description: "A constrained expense approval workflow",
      }),
      system: WORKFLOW_COMPILER_PROMPT,
      prompt,
      abortSignal: AbortSignal.timeout(12_000),
    });

    return {
      ok: true,
      source: "model",
      spec: normalizeWorkflow(output),
      warning: null,
    };
  } catch {
    return {
      ok: true,
      source: "fallback",
      spec: expenseWorkflow,
      warning: "Model unavailable. Using the demo workflow.",
    };
  }
}
