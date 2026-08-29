import {
  CompileResponseSchema,
  type CompileResponse,
} from "../../shared/workflow-schema";

export async function compileWorkflow(prompt: string): Promise<CompileResponse> {
  const response = await fetch("/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const body: unknown = await response.json();
  return CompileResponseSchema.parse(body);
}
