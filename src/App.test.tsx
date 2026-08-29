import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App demo journey", () => {
  it("loads the hardcoded demo, pauses a $640 expense, approves it, and completes accounting", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Business description"), { target: { value: "A professional services business with 11-50 people" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Repetitive work"), { target: { value: "The team reviews employee expenses every week" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Workflow bottleneck"), { target: { value: "Approvals wait too long in email" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Build this workflow" }));

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
    expect(screen.getByRole("heading", { name: /MCI builds the workflow/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate workflow" }));
    expect(screen.getByText("Demo workflow loaded. No network required.")).toBeInTheDocument();
  });
});
