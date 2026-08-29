import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DiscoveryResponse } from "../../shared/discovery-schema";
import { BusinessOnboarding } from "./BusinessOnboarding";

const nextQuestion: DiscoveryResponse = {
  ok: true,
  source: "model",
  warning: null,
  decision: {
    stage: "question",
    assessment: "The business is clear, but its repeated work is not.",
    question: "Which task does your team repeat most often?",
    suggestions: [],
  },
};

const complete: DiscoveryResponse = {
  ok: true,
  source: "model",
  warning: null,
  decision: {
    stage: "complete",
    assessment: "The repeated work and handoff are specific enough.",
    question: null,
    suggestions: [
      {
        title: "Maintenance request triage",
        description: "Route tenant requests to the right property manager.",
        prompt: "Build a maintenance request workflow with tenant intake, urgency classification, assignment, and status notifications.",
      },
      {
        title: "Repair approval",
        description: "Collect owner approval before expensive repair work.",
        prompt: "Build a repair approval workflow with quote intake, an amount threshold, owner approval, and contractor notification.",
      },
    ],
  },
};

describe("BusinessOnboarding", () => {
  it("sends the full answer history and renders model-generated suggestions", async () => {
    const assess = vi.fn()
      .mockResolvedValueOnce(nextQuestion)
      .mockResolvedValueOnce(complete);
    const onChooseWorkflow = vi.fn();
    render(<BusinessOnboarding onChooseWorkflow={onChooseWorkflow} onSkip={vi.fn()} assess={assess} />);

    fireEvent.change(screen.getByLabelText("Business description"), {
      target: { value: "We manage 80 rental properties for owners." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await screen.findByRole("heading", { name: "Which task does your team repeat most often?" });
    expect(assess).toHaveBeenNthCalledWith(1, [{
      question: "Tell us what your business does.",
      answer: "We manage 80 rental properties for owners.",
    }]);

    fireEvent.change(screen.getByLabelText("Discovery answer 2"), {
      target: { value: "We manually route tenant maintenance emails." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await screen.findByText("Maintenance request triage");
    expect(assess.mock.calls[1][0]).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Open in prompt builder" })[0]);
    expect(onChooseWorkflow).toHaveBeenCalledWith(expect.stringContaining("maintenance request workflow"));
  });

  it("disables the answer while Luna is assessing it", async () => {
    let resolveAssessment!: (value: DiscoveryResponse) => void;
    const assess = vi.fn(() => new Promise<DiscoveryResponse>((resolve) => { resolveAssessment = resolve; }));
    render(<BusinessOnboarding onChooseWorkflow={vi.fn()} onSkip={vi.fn()} assess={assess} />);

    fireEvent.change(screen.getByLabelText("Business description"), { target: { value: "A design studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Assessing..." })).toBeDisabled();
    expect(screen.getByLabelText("Business description")).toBeDisabled();

    resolveAssessment(nextQuestion);
    await screen.findByRole("heading", { name: nextQuestion.decision.question! });
  });

  it("shows a retryable error when the discovery request fails", async () => {
    const assess = vi.fn().mockRejectedValue(new Error("offline"));
    render(<BusinessOnboarding onChooseWorkflow={vi.fn()} onSkip={vi.fn()} assess={assess} />);
    fireEvent.change(screen.getByLabelText("Business description"), { target: { value: "A design studio" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("could not assess");
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
  });

  it("allows users to skip to the prompt", () => {
    const onSkip = vi.fn();
    render(<BusinessOnboarding onChooseWorkflow={vi.fn()} onSkip={onSkip} assess={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip to prompt" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
