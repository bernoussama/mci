import type { WorkflowSpec } from "../../shared/workflow-schema";

export function WorkflowCanvas({ spec }: { spec: WorkflowSpec }) {
  return (
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
  );
}
