import { useState } from "react";
import { expenseWorkflow, type WorkflowSpec } from "../shared/workflow-schema";
import { GeneratedForm } from "./components/GeneratedForm";
import { TracePanel } from "./components/TracePanel";
import { WorkflowCanvas } from "./components/WorkflowCanvas";
import { decideRun, startRun, type WorkflowRun, type WorkflowSubmission } from "./domain/executor";
import { compileWorkflow } from "./services/compiler-client";
import "./styles.css";

const defaultPrompt = "Build an expense approval workflow. Employees submit a receipt. Read the merchant and amount. Expenses above $500 need manager approval.";

export default function App() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [spec, setSpec] = useState<WorkflowSpec>(expenseWorkflow);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [compileStatus, setCompileStatus] = useState<"idle" | "loading" | "model" | "fallback">("idle");
  const [warning, setWarning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "trace" | "json">("form");

  async function compile() {
    setCompileStatus("loading");
    setWarning(null);
    setRun(null);

    try {
      const result = await compileWorkflow(prompt);
      if (!result.ok) throw new Error(result.error.message);
      setSpec(result.spec);
      setCompileStatus(result.source);
      setWarning(result.warning);
      setActiveTab("form");
    } catch {
      setSpec(expenseWorkflow);
      setCompileStatus("fallback");
      setWarning("API unavailable. Using the local demo workflow.");
      setActiveTab("form");
    }
  }

  function submitExpense(input: WorkflowSubmission) {
    setRun(startRun(spec, input));
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
          <button onClick={compile} disabled={compileStatus === "loading"}>
            {compileStatus === "loading" ? "Compiling…" : "Compile workflow"} <span>→</span>
          </button>
        </div>
        {warning && <p className="compile-warning">{warning}</p>}
      </section>

      <section className="workspace">
        <div className="canvas-panel">
          <div className="panel-heading">
            <div><span className="kicker">Workflow</span><h2>{spec.name}</h2></div>
            <span className="saved">{compileStatus === "fallback" ? "Fallback" : "Compiled"}</span>
          </div>
          <WorkflowCanvas spec={spec} />
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
              <h2>{spec.form.title}</h2>
              <p className="muted">This form comes from the workflow spec.</p>
              <GeneratedForm spec={spec} disabled={compileStatus === "loading"} onSubmit={submitExpense} />
            </div>
          )}

          {activeTab === "trace" && (
            <div className="tab-content">
              <span className="kicker">Run trace</span>
              <h2>{run ? "Latest execution" : "No runs yet"}</h2>
              <TracePanel
                run={run}
                onDecision={(decision) => setRun((current) => current ? decideRun(spec, current, decision) : current)}
              />
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
