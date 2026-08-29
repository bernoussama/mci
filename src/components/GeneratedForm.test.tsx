import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expenseWorkflow } from "../../shared/workflow-schema";
import { GeneratedForm } from "./GeneratedForm";

describe("GeneratedForm", () => {
  it("renders the spec fields and normalizes submitted values", () => {
    const onSubmit = vi.fn();
    render(<GeneratedForm spec={expenseWorkflow} disabled={false} onSubmit={onSubmit} />);

    expect(screen.getByLabelText("Employee")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Receipt")).toHaveAttribute("type", "file");
    expect(screen.getByLabelText("Amount")).toHaveAttribute("type", "number");

    fireEvent.change(screen.getByLabelText("Receipt"), {
      target: { files: [new File(["demo"], "receipt.pdf", { type: "application/pdf" })] },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Start run" }).closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith({
      employee: "Oussama",
      receipt: "receipt.pdf",
      merchant: "Acme Hotel",
      amount: 640,
    });
  });
});
