import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessOnboarding } from "./BusinessOnboarding";

describe("BusinessOnboarding", () => {
  it("turns three answers into a runnable expense workflow prompt", () => {
    const onBuild = vi.fn();
    render(<BusinessOnboarding onBuild={onBuild} onSkip={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Professional services/ }));
    fireEvent.click(screen.getByRole("button", { name: /11-50 people/ }));
    fireEvent.click(screen.getByRole("button", { name: /Approvals wait too long/ }));

    expect(screen.getByText("Purchase request routing")).toBeInTheDocument();
    expect(screen.getByText("Runnable in this demo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Build this workflow" }));

    expect(onBuild).toHaveBeenCalledWith(expect.stringContaining("professional services business with 11-50 people"));
    expect(onBuild).toHaveBeenCalledWith(expect.stringContaining("Expenses above $500 need manager approval"));
  });

  it("allows users to skip to the prompt", () => {
    const onSkip = vi.fn();
    render(<BusinessOnboarding onBuild={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip to prompt" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
