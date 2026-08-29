import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { compileWorkflow } from "./compiler";
import { CompileRequestSchema } from "../shared/workflow-schema";

export const app = new Hono();

app.get("/api/health", (context) => context.json({
  ok: true,
  modelConfigured: Boolean(process.env.OPENAI_API_KEY),
  model: process.env.MCI_MODEL ?? "gpt-5-mini",
}));

app.post("/api/compile", async (context) => {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    return context.json({
      ok: false as const,
      error: { code: "invalid_request" as const, message: "Request body must be valid JSON." },
    }, 400);
  }

  const request = CompileRequestSchema.safeParse(body);
  if (!request.success) {
    return context.json({
      ok: false as const,
      error: { code: "invalid_request" as const, message: "Prompt must contain between 20 and 4,000 characters." },
    }, 400);
  }

  return context.json(await compileWorkflow(request.data.prompt));
});

app.use("*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));
