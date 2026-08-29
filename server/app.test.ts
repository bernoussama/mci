import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "./app";

const originalApiKey = process.env.OPENAI_API_KEY;

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
});

afterAll(() => {
  if (originalApiKey) process.env.OPENAI_API_KEY = originalApiKey;
});

describe("compiler API", () => {
  it("reports whether the model is configured", async () => {
    const response = await app.request("/api/health");
    expect(await response.json()).toMatchObject({ ok: true, modelConfigured: false });
  });

  it("returns the demo workflow when no model key is configured", async () => {
    const response = await app.request("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Build an expense workflow with manager approval above $500." }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, source: "fallback" });
  });

  it("rejects a short prompt", async () => {
    const response = await app.request("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "short" }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "invalid_request" },
    });
  });

  it.each([
    [{ prompt: "" }, "empty"],
    [{ prompt: "x".repeat(4_001) }, "oversized"],
  ])("rejects an %s prompt", async (body) => {
    const response = await app.request("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "invalid_request" } });
  });
});
