import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expenseWorkflow } from "../shared/workflow-schema";
import App from "./App";
import { compileWorkflow } from "./services/compiler-client";

vi.mock("./services/compiler-client", () => ({ compileWorkflow: vi.fn() }));

describe("App demo journey", () => {
  beforeEach(() => {
    vi.mocked(compileWorkflow).mockResolvedValue({
      ok: true,
      source: "fallback",
      spec: expenseWorkflow,
      warning: "Model unavailable. Using the demo workflow.",
    });
  });

  it("compiles, pauses a $640 expense, approves it, and completes accounting", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /MCI builds the workflow/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate workflow" }));
    expect(await screen.findByText("Model unavailable. Using the demo workflow.")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Workflow conversation" })).toHaveTextContent("Build an expense approval workflow");

    fireEvent.change(screen.getByLabelText("Receipt"), {
      target: { files: [new File(["demo"], "receipt.pdf", { type: "application/pdf" })] },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Start run" }).closest("form")!);

    expect(screen.getByText("Decision required")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve expense" }));

    await waitFor(() => expect(screen.getByText("Sent to accounting")).toBeInTheDocument());
    expect(screen.queryByText("Decision required")).not.toBeInTheDocument();
  });

  it("uses the local workflow when the API is down", async () => {
    vi.mocked(compileWorkflow).mockRejectedValueOnce(new Error("offline"));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Generate workflow" }));
    expect(await screen.findByText("API unavailable. Using the local demo workflow.")).toBeInTheDocument();
    expect(screen.getByText("Fallback")).toBeInTheDocument();
  });
});
