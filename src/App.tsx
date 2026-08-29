import { FormEvent, useState } from "react";
import { executeExpenseWorkflow, expenseWorkflow, TraceEvent } from "./domain/workflow";
import "./styles.css";

const defaultPrompt = "Build an expense approval workflow. Employees submit a receipt. Read the merchant and amount. Expenses above $500 need manager approval.";

export default function App() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"form" | "trace" | "json">("form");
  const spec = expenseWorkflow;

  function compile() {
    setTrace([]);
    setActiveTab("form");
  }

  function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setTrace(executeExpenseWorkflow(spec, {
      employee: String(data.get("employee")),
      merchant: String(data.get("merchant")),
      amount: Number(data.get("amount")),
    }));
    setActiveTab("trace");
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
                <article className={`node node-${step.kind}`}>
                  <span className="node-kind">{step.kind}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
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
            <div className="tab-content">
              <span className="kicker">Run trace</span>
              <h2>{trace.length ? "Latest execution" : "No runs yet"}</h2>
              {!trace.length && <p className="empty">Submit the generated form to see every step and its output.</p>}
              <ol className="trace-list">
                {trace.map((event) => (
                  <li key={event.stepId} className={event.status}>
                    <span className="trace-dot" />
                    <div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.status}</small></div>
                  </li>
                ))}
              </ol>
            </div>
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
