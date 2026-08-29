import { type FormEvent } from "react";
import type { WorkflowSpec } from "../../shared/workflow-schema";
import type { WorkflowSubmission } from "../domain/executor";

type GeneratedFormProps = {
  spec: WorkflowSpec;
  disabled: boolean;
  onSubmit(input: WorkflowSubmission): void;
};

const demoValues: Record<string, string> = {
  employee: "Oussama",
  merchant: "Acme Hotel",
  amount: "640",
};

export function GeneratedForm({ spec, disabled, onSubmit }: GeneratedFormProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: WorkflowSubmission = {};

    for (const field of spec.form.fields) {
      const value = data.get(field.id);
      if (field.type === "number") input[field.id] = Number(value);
      else if (field.type === "file") {
        const fileInput = event.currentTarget.elements.namedItem(field.id);
        input[field.id] = fileInput instanceof HTMLInputElement ? fileInput.files?.[0]?.name ?? "" : "";
      }
      else input[field.id] = String(value ?? "");
    }

    onSubmit(input);
  }

  return (
    <form onSubmit={submit}>
      {spec.form.fields.map((field) => (
        <label key={field.id}>
          {field.label}
          <input
            name={field.id}
            type={field.type}
            required={field.required}
            disabled={disabled}
            defaultValue={field.type === "file" ? undefined : demoValues[field.id]}
            min={field.type === "number" ? 0 : undefined}
            step={field.type === "number" ? 0.01 : undefined}
          />
        </label>
      ))}
      <button className="primary" type="submit" disabled={disabled}>Start run</button>
    </form>
  );
}
