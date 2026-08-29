import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessOnboarding } from "./BusinessOnboarding";

describe("BusinessOnboarding", () => {
  it("turns three written answers into a runnable expense workflow prompt", () => {
    const onBuild = vi.fn();
    render(<BusinessOnboarding onBuild={onBuild} onSkip={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Business description"), { target: { value: "We run a 12-person property management company." } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Repetitive work"), { target: { value: "We copy tenant maintenance requests into a spreadsheet." } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Workflow bottleneck"), { target: { value: "Requests get lost while waiting for owner approval." } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Request and approval routing")).toBeInTheDocument();
    expect(screen.getByText("Runnable in this demo")).toBeInTheDocument();
    expect(screen.getByText("We run a 12-person property management company.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Build this workflow" }));

    expect(onBuild).toHaveBeenCalledWith(expect.stringContaining("12-person property management company"));
    expect(onBuild).toHaveBeenCalledWith(expect.stringContaining("Requests get lost while waiting for owner approval"));
    expect(onBuild).toHaveBeenCalledWith(expect.stringContaining("Expenses above $500 need manager approval"));
  });

  it("requires an answer before continuing", () => {
    render(<BusinessOnboarding onBuild={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Business description"), { target: { value: "A design studio" } });
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("allows users to skip to the prompt", () => {
    const onSkip = vi.fn();
    render(<BusinessOnboarding onBuild={vi.fn()} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip to prompt" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
