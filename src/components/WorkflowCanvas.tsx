import type { WorkflowSpec } from "../../shared/workflow-schema";

type WorkflowCanvasProps = {
  spec: WorkflowSpec;
  activeStepId: string | null;
  availableStepIds: string[];
  onSelectStep(stepId: string): void;
};

export function WorkflowCanvas({ spec, activeStepId, availableStepIds, onSelectStep }: WorkflowCanvasProps) {
  return (
    <div className="workflow-canvas">
      {spec.steps.map((step, index) => (
        <div className="step-row" key={step.id}>
          <button
            className={`node node-${step.kind} ${activeStepId === step.id ? "node-active" : ""}`}
            disabled={!availableStepIds.includes(step.id)}
            onClick={() => onSelectStep(step.id)}
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
  );
}
