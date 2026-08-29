import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App demo journey", () => {
  it("loads the hardcoded demo, pauses a $640 expense, approves it, and completes accounting", async () => {
    const discoveryResponses = [
      { ok: true, source: "model", warning: null, decision: { stage: "question", assessment: "The business is clear.", question: "What work repeats every week?", suggestions: [] } },
      { ok: true, source: "model", warning: null, decision: { stage: "question", assessment: "The repeated work is clear.", question: "Where does that process slow down?", suggestions: [] } },
      { ok: true, source: "model", warning: null, decision: { stage: "complete", assessment: "The process is specific enough.", question: null, suggestions: [
        { title: "Expense approvals", description: "Route large employee expenses to a manager.", prompt: "Build an expense approval workflow for this professional services business with manager approval above $500." },
        { title: "Request routing", description: "Assign internal requests to an accountable owner.", prompt: "Build an internal request routing workflow with intake, classification, assignment, and completion notification." },
      ] } },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => discoveryResponses.shift() })));

    render(<App />);
    fireEvent.change(screen.getByLabelText("Business description"), { target: { value: "A professional services business with 11-50 people" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "What work repeats every week?" });
    fireEvent.change(screen.getByLabelText("Discovery answer 2"), { target: { value: "The team reviews employee expenses every week" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Where does that process slow down?" });
    fireEvent.change(screen.getByLabelText("Discovery answer 3"), { target: { value: "Approvals wait too long in email" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Expense approvals");
    fireEvent.click(screen.getAllByRole("button", { name: "Open in prompt builder" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Generate workflow" }));

    expect(screen.getByText("Demo workflow loaded. No network required.")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Workflow conversation" })).toHaveTextContent("professional services business");

    fireEvent.change(screen.getByLabelText("Receipt"), {
      target: { files: [new File(["demo"], "receipt.pdf", { type: "application/pdf" })] },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Start run" }).closest("form")!);

    expect(screen.getByText("Decision required")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve expense" }));

    await waitFor(() => expect(screen.getByText("Sent to accounting")).toBeInTheDocument());
    expect(screen.queryByText("Decision required")).not.toBeInTheDocument();
  });

  it("lets users skip discovery and enter their own prompt", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Skip to prompt" }));
    expect(screen.getByRole("heading", { name: /TraceFlow builds the workflow/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate workflow" }));
    expect(screen.getByText("Demo workflow loaded. No network required.")).toBeInTheDocument();
  });
});
