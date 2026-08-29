import { FormEvent, useState } from "react";
import { decideRun, expenseWorkflow, startRun, WorkflowRun } from "./domain/workflow";
import { TracePanel } from "./components/TracePanel";
import "./styles.css";

const defaultPrompt = "Build an expense approval workflow. Employees submit a receipt. Read the merchant and amount. Expenses above $500 need manager approval.";

export default function App() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "trace" | "json">("form");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const spec = expenseWorkflow;
  const selectedEvent = run?.events.find((event) => event.id === selectedEventId) ?? run?.events.at(-1);

  function compile() {
    setRun(null);
    setSelectedEventId(null);
    setActiveTab("form");
  }

  function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const receipt = data.get("receipt");
    const nextRun = startRun(spec, {
      employee: String(data.get("employee")),
      receipt: receipt instanceof File ? receipt.name : "",
      merchant: String(data.get("merchant")),
      amount: Number(data.get("amount")),
    });
    setRun(nextRun);
    setSelectedEventId(nextRun.events.at(-1)?.id ?? null);
    setActiveTab("trace");
  }

  function decide(decision: "approve" | "reject") {
    setRun((current) => {
      if (!current) return current;
      const nextRun = decideRun(spec, current, decision);
      const approval = nextRun.events.find((event) => event.stepId === "approve");
      setSelectedEventId(approval?.id ?? null);
      return nextRun;
    });
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/">MCI</a>
        <span className="status"><i /> Local prototype</span>
      </header>

      <section className="hero">
        <p className="eyebrow">Workflow compiler</p>
        <h1>Describe the process.<br />Get the workflow and its UI.</h1>
        <div className="prompt-box">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Workflow prompt" />
          <button onClick={compile}>Compile workflow <span>→</span></button>
        </div>
      </section>

      <section className="workspace">
        <div className="canvas-panel">
          <div className="panel-heading">
            <div><span className="kicker">Workflow</span><h2>{spec.name}</h2></div>
            <span className="saved">Compiled</span>
          </div>
          <div className="workflow-canvas">
            {spec.steps.map((step, index) => (
              <div className="step-row" key={step.id}>
                <button
                  className={`node node-${step.kind} ${selectedEvent?.stepId === step.id ? "node-active" : ""}`}
                  onClick={() => setSelectedEventId(run?.events.find((event) => event.stepId === step.id)?.id ?? null)}
                  type="button"
                >
                  <span className="node-kind">{step.kind}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </button>
                {index < spec.steps.length - 1 && <div className="connector">↓</div>}
              </div>
            ))}
          </div>
        </div>

        <aside className="operation-panel">
          <nav className="tabs" aria-label="Generated output">
            {(["form", "trace", "json"] as const).map((tab) => (
              <button className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)} key={tab}>{tab}</button>
            ))}
          </nav>

          {activeTab === "form" && (
            <div className="tab-content">
              <span className="kicker">Generated UI</span>
              <h2>Submit an expense</h2>
              <p className="muted">This form comes from the workflow spec.</p>
              <form onSubmit={submitExpense}>
                <label>Employee<input name="employee" defaultValue="Oussama" required /></label>
                <label>Receipt<input name="receipt" type="file" required /></label>
                <div className="field-row">
                  <label>Merchant<input name="merchant" defaultValue="Acme Hotel" required /></label>
                  <label>Amount<input name="amount" type="number" defaultValue="640" min="0" step="0.01" required /></label>
                </div>
                <button className="primary" type="submit">Start run</button>
              </form>
            </div>
          )}

          {activeTab === "trace" && (
            <TracePanel
              run={run}
              selectedEventId={selectedEventId}
              onSelectEvent={(event) => setSelectedEventId(event.id)}
              onDecision={decide}
            />
          )}

          {activeTab === "json" && (
            <div className="tab-content json-content">
              <span className="kicker">Source of truth</span>
              <h2>Workflow spec</h2>
              <pre>{JSON.stringify(spec, null, 2)}</pre>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
