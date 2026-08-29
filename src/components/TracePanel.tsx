import { Decision, TraceEvent, WorkflowRun } from "../domain/workflow";

type TracePanelProps = {
  run: WorkflowRun | null;
  selectedEventId: string | null;
  onSelectEvent(event: TraceEvent): void;
  onDecision(decision: Decision): void;
};

export function TracePanel({ run, selectedEventId, onSelectEvent, onDecision }: TracePanelProps) {
  const selectedEvent = run?.events.find((event) => event.id === selectedEventId) ?? run?.events.at(-1);
  const pendingApproval = run?.events.find((event) => event.stepId === "approve" && event.status === "waiting");

  return (
    <div className="tab-content">
      <span className="kicker">Run trace</span>
      <h2>{run ? "Decision replay" : "No runs yet"}</h2>
      {!run && <p className="empty">Submit the generated form to see every step and its output.</p>}
      <ol className="trace-list">
        {run?.events.map((event) => (
          <li key={event.id} className={`${event.status} ${selectedEvent?.id === event.id ? "selected" : ""}`}>
            <span className="trace-dot" />
            <button type="button" onClick={() => onSelectEvent(event)}>
              <strong>{event.title}</strong><p>{event.detail}</p><small>{event.timestamp} · {event.status}</small>
            </button>
          </li>
        ))}
      </ol>
      {selectedEvent && (
        <section className="trace-inspector" aria-label="Selected trace step">
          <span className="kicker">Step evidence</span>
          <h3>{selectedEvent.title}</h3>
          <dl>
            <div><dt>Actor</dt><dd>{selectedEvent.actor}</dd></div>
            <div><dt>Input</dt><dd>{selectedEvent.input}</dd></div>
            <div><dt>Output</dt><dd>{selectedEvent.output}</dd></div>
            <div><dt>Why</dt><dd>{selectedEvent.reason}</dd></div>
          </dl>
        </section>
      )}
      {pendingApproval && (
        <section className="approval-card" aria-label="Manager decision">
          <span className="kicker">Human checkpoint</span>
          <h3>Manager decision required</h3>
          <p>This run is paused. Your decision is recorded in the execution trace.</p>
          <div className="decision-actions">
            <button className="approve" type="button" onClick={() => onDecision("approve")}>Approve expense</button>
            <button className="reject" type="button" onClick={() => onDecision("reject")}>Reject expense</button>
          </div>
        </section>
      )}
    </div>
  );
}
