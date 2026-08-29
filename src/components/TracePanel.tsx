import type { WorkflowRun } from "../domain/executor";

type TracePanelProps = {
  run: WorkflowRun | null;
  onDecision(decision: "approve" | "reject"): void;
};

export function TracePanel({ run, onDecision }: TracePanelProps) {
  if (!run) return <p className="empty">Submit the generated form to see every step and its output.</p>;

  return (
    <>
      <ol className="trace-list">
        {run.events.map((event) => (
          <li key={event.id} className={event.status}>
            <span className="trace-dot" />
            <div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.status}</small></div>
          </li>
        ))}
      </ol>
      {run.status === "waiting" && (
        <div className="decision-actions">
          <button className="primary" onClick={() => onDecision("approve")}>Approve</button>
          <button className="secondary" onClick={() => onDecision("reject")}>Reject</button>
        </div>
      )}
    </>
  );
}
