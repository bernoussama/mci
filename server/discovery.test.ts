import { describe, expect, it, vi } from "vitest";
import {
  DISCOVERY_AGENT_PROMPT,
  assessBusinessDiscovery,
  type DiscoveryDependencies,
} from "./discovery";
import type { DiscoveryDecision, DiscoveryTurn } from "../shared/discovery-schema";

const firstTurn: DiscoveryTurn = {
  question: "Tell us what your business does.",
  answer: "We manage rental properties for owners.",
};

function dependencies(
  generateDecision: DiscoveryDependencies["generateDecision"],
  overrides: Partial<DiscoveryDependencies> = {},
): DiscoveryDependencies {
  return {
    apiKey: "test-key",
    model: "gpt-5.6-luna",
    timeoutMs: 50,
    generateDecision,
    ...overrides,
  };
}

describe("assessBusinessDiscovery", () => {
  it("uses Luna to produce the next question from the full history", async () => {
    const decision: DiscoveryDecision = {
      stage: "question",
      assessment: "The business is clear, but its repeated work is not.",
      question: "Which task does the property team repeat most often?",
      suggestions: [],
    };
    const generateDecision = vi.fn(async () => decision);

    const result = await assessBusinessDiscovery([firstTurn], dependencies(generateDecision));

    expect(result).toMatchObject({ ok: true, source: "model", decision });
    expect(generateDecision).toHaveBeenCalledWith(expect.objectContaining({
      turns: [firstTurn],
      model: "gpt-5.6-luna",
      system: DISCOVERY_AGENT_PROMPT,
      abortSignal: expect.any(AbortSignal),
    }));
  });

  it("returns workflow suggestions from the model", async () => {
    const decision: DiscoveryDecision = {
      stage: "complete",
      assessment: "The intake, approval, and handoff are specific enough.",
      question: null,
      suggestions: [
        { title: "Maintenance triage", description: "Route tenant requests to the right contractor.", prompt: "Build a maintenance triage workflow with tenant intake, urgency classification, assignment, and completion updates." },
        { title: "Owner approval", description: "Collect owner decisions for expensive repairs.", prompt: "Build a repair approval workflow with quote intake, a cost threshold, owner decision, and contractor notification." },
      ],
    };

    const result = await assessBusinessDiscovery([firstTurn], dependencies(async () => decision));
    expect(result).toMatchObject({ source: "model", decision: { stage: "complete" } });
    expect(result.decision.suggestions).toHaveLength(2);
  });

  it("forces suggestions after the fifth answer", async () => {
    const turns = Array.from({ length: 5 }, (_, index) => ({
      question: `Question number ${index + 1}?`,
      answer: `Detailed business answer ${index + 1}`,
    }));
    const invalidAtLimit: DiscoveryDecision = {
      stage: "question",
      assessment: "More detail would help the assessment.",
      question: "Can you provide one more detail?",
      suggestions: [],
    };

    const result = await assessBusinessDiscovery(turns, dependencies(async () => invalidAtLimit));
    expect(result).toMatchObject({ source: "fallback", decision: { stage: "complete" } });
    expect(result.decision.suggestions).toHaveLength(3);
  });

  it("uses deterministic questions and suggestions without an API key", async () => {
    const generateDecision = vi.fn(async () => { throw new Error("should not run"); });
    const questionResult = await assessBusinessDiscovery(
      [firstTurn],
      dependencies(generateDecision, { apiKey: undefined }),
    );
    expect(questionResult).toMatchObject({ source: "fallback", decision: { stage: "question" } });

    const turns = Array.from({ length: 5 }, (_, index) => ({
      question: `Business discovery question ${index + 1}`,
      answer: `Business discovery answer ${index + 1}`,
    }));
    const completeResult = await assessBusinessDiscovery(
      turns,
      dependencies(generateDecision, { apiKey: undefined }),
    );
    expect(completeResult).toMatchObject({ source: "fallback", decision: { stage: "complete" } });
    expect(generateDecision).not.toHaveBeenCalled();
  });
});
