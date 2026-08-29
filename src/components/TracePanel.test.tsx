import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expenseWorkflow } from "../../shared/workflow-schema";
import { startRun } from "../domain/executor";
import { TracePanel } from "./TracePanel";

describe("TracePanel", () => {
  it("shows selected evidence and sends an approval decision", () => {
    const run = startRun(expenseWorkflow, {
      employee: "Oussama",
      receipt: "receipt.pdf",
      merchant: "Acme Hotel",
      amount: 640,
    });
    const onDecision = vi.fn();
    const onSelectEvent = vi.fn();

    render(
      <TracePanel
        run={run}
        selectedEventId={run.events[1].id}
        onSelectEvent={onSelectEvent}
        onDecision={onDecision}
      />,
    );

    expect(screen.getByRole("region", { name: "Selected trace step" })).toHaveTextContent("MCI AI, simulated");
    fireEvent.click(screen.getByRole("button", { name: /Amount checked/ }));
    expect(onSelectEvent).toHaveBeenCalledWith(run.events[2]);
    fireEvent.click(screen.getByRole("button", { name: "Approve expense" }));
    expect(onDecision).toHaveBeenCalledWith("approve");
  });
});
