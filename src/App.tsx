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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [submittedPrompt, setSubmittedPrompt] = useState(defaultPrompt);
  const selectedEvent = run?.events.find((event) => event.id === selectedEventId) ?? run?.events.at(-1);

  async function compile() {
    setSubmittedPrompt(prompt);
    setCompileStatus("loading");
    setWarning(null);
    setRun(null);
    setSelectedEventId(null);

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

  if (compileStatus === "idle") {
    return (
      <main className="prompt-screen">
        <header className="landing-nav">
          <a className="brand" href="/">MCI</a>
          <nav aria-label="Primary navigation">
            <a href="#prompt">Build</a>
            <a href="#prompt">Examples</a>
            <a href="#prompt">How it works</a>
          </nav>
          <span className="landing-badge">Local prototype</span>
        </header>
        <section className="prompt-stage" id="prompt">
          <div className="prompt-intro">
            <p className="eyebrow">Operational software from one prompt</p>
            <h1>Describe the process.<br />MCI builds the workflow.</h1>
            <p>Generate the workflow, the form your team uses, and a trace for every decision.</p>
          </div>
          <div className="landing-prompt">
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Workflow prompt" />
            <div className="landing-prompt-footer">
              <span>Expense approval workflow</span>
              <button onClick={compile}>Generate workflow</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function submitExpense(input: WorkflowSubmission) {
    const nextRun = startRun(spec, input);
    setRun(nextRun);
    setSelectedEventId(nextRun.events.at(-1)?.id ?? null);
    setActiveTab("trace");
  }

  function decide(decision: "approve" | "reject") {
    setRun((current) => {
      if (!current) return current;
      const nextRun = decideRun(spec, current, decision);
      const decisionEvent = nextRun.events.find((event) => event.stepId === "approve");
      setSelectedEventId(decisionEvent?.id ?? nextRun.events.at(-1)?.id ?? null);
      return nextRun;
    });
  }

  return (
    <main className="builder-shell">
      <header className="builder-topbar">
        <a className="brand" href="/">MCI</a>
        <div className="builder-title"><strong>{spec.name}</strong><span>Workflow builder</span></div>
        <span className={`saved ${compileStatus === "loading" ? "is-loading" : ""}`}>
          {compileStatus === "loading" ? "Generating" : compileStatus === "fallback" ? "Fallback" : "Compiled"}
        </span>
      </header>

      <aside className="chat-sidebar" aria-label="Workflow conversation">
        <div className="chat-heading">
          <span className="kicker">Conversation</span>
          <h2>Build with MCI</h2>
        </div>
        <div className="chat-thread">
          <div className="chat-message user-message"><span>You</span><p>{submittedPrompt}</p></div>
          <div className="chat-message assistant-message">
            <span>MCI</span>
            <p>{compileStatus === "loading" ? "Building the workflow and its operating UI..." : warning ?? "The workflow is ready. You can run it or inspect its JSON."}</p>
          </div>
        </div>
        <div className="chat-compose">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Refine workflow prompt" />
          <button onClick={compile} disabled={compileStatus === "loading"}>{compileStatus === "loading" ? "Working..." : "Send update"}</button>
        </div>
      </aside>

      <section className="builder-workspace">
        <div className="canvas-panel">
          <div className="panel-heading">
            <div><span className="kicker">Workflow</span><h2>{spec.name}</h2></div>
            <span className="canvas-count">{spec.steps.length} steps</span>
          </div>
          <WorkflowCanvas
            spec={spec}
            activeStepId={selectedEvent?.stepId ?? null}
            availableStepIds={run?.events.map((event) => event.stepId) ?? []}
            onSelectStep={(stepId) => {
              const matchingEvent = run?.events.find((event) => event.stepId === stepId);
              if (matchingEvent) setSelectedEventId(matchingEvent.id);
            }}
          />
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
                selectedEventId={selectedEventId}
                onSelectEvent={(event) => setSelectedEventId(event.id)}
                onDecision={decide}
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
