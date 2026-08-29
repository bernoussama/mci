# MCI hackathon MVP plan

## The demo we are shipping

MCI turns one business-process prompt into a workflow spec, the form people use to interact with it, and a trace of what happened during execution.

The one-hour demo covers one expense approval flow:

```text
prompt -> WorkflowSpec -> generated expense form -> execution trace
                                                    |
                               amount over $500 -> manager decision
                               amount up to $500 -> accounting
```

The demo is successful when a judge can:

1. Compile the expense approval prompt.
2. See the resulting workflow and JSON spec.
3. Open a form derived from the same spec.
4. Submit a $640 expense and see the run pause.
5. Approve it and see the accounting step complete.
6. Submit a $42 expense and see it complete automatically.

The checked-in expense workflow remains the fallback. A failed model call or bad network must not break the demo.

## Team ownership

Each teammate owns one work packet. Avoid editing another owner's files unless the integration captain asks for the change.

| Owner | Work packet | Deliverable | Handoff |
| --- | --- | --- | --- |
| Teammate 1 | [Prompt compiler](https://github.com/bernoussama/mci/issues/2) | Typed compiler with a deterministic fallback | T+35 |
| Teammate 2 | [Generated form](https://github.com/bernoussama/mci/issues/1) | Form rendered from `WorkflowSpec.fields` | T+30 |
| Teammate 3 | [Approval and trace](https://github.com/bernoussama/mci/issues/5) | Approve, reject, and automatic-completion paths | T+35 |
| Teammate 4 | [Demo UI polish](https://github.com/bernoussama/mci/issues/3) | Projector-ready main flow and status states | T+30 |
| Teammate 5 | [Integration and pitch](https://github.com/bernoussama/mci/issues/4) | Merged build, deployment, fallback, and rehearsal | T+45 |

Use short-lived branches named `hack/compiler`, `hack/form`, `hack/trace`, and `hack/ui`. The integration captain owns `main`, `src/App.tsx`, deployment, and the final call on whether a branch is stable enough to merge.

## Sixty-minute schedule

### T+00 to T+05: start

- Each teammate claims an issue and creates their branch.
- Run `pnpm install` and confirm `pnpm test` passes before editing.
- Integration captain opens the current demo and confirms the fallback path works.

### T+05 to T+30: build in parallel

- Compiler owner returns a validated `WorkflowSpec` or the fixed fallback.
- Form owner renders text, number, and file fields from the spec.
- Trace owner implements waiting, approved, rejected, and completed states.
- UI owner polishes only the compile, submit, decision, and trace path.
- Integration captain prepares deployment and watches for overlapping changes.

### T+30 to T+45: integrate

Merge in this order:

1. Generated form.
2. Executor and trace.
3. Prompt compiler.
4. CSS polish.

After each merge, run the focused test for that work packet. If a branch breaks the main demo and cannot be fixed in five minutes, revert that merge and use the fallback behavior.

### T+45 to T+52: freeze and deploy

- Stop feature work at T+45.
- Run `pnpm test && pnpm lint && pnpm build`.
- Deploy the production build.
- Keep a local production build open in another tab.
- Verify the fixed workflow works with the network disabled.

### T+52 to T+60: rehearse

Run the exact six-step demo twice. The presenter talks while one teammate watches the clock and another keeps the local fallback ready.

## Implementation contracts

### Compiler

- Input: a plain-text business-process prompt.
- Output: the existing typed `WorkflowSpec` shape.
- Validate model output before displaying or executing it.
- Never expose or commit an API key.
- On missing credentials, timeout, invalid JSON, or invalid schema, return `expenseWorkflow` and show that the fallback is active.
- If the model route is not reliable by T+25, use a deterministic compiler that extracts the approval threshold from the prompt.

### Generated form

- Render `text`, `number`, and `file` fields from `spec.fields`.
- Apply each field's label and `required` value.
- Return normalized form values through a component callback.
- Keep receipt bytes local. The MVP only needs the selected filename.

### Executor and trace

- An amount up to and including the threshold completes automatically.
- An amount above the threshold pauses for a manager decision.
- Approve completes the approval step, then accounting.
- Reject ends the run and never adds an accounting event.
- A repeated decision must not duplicate trace events.
- Keep run state in React memory for the demo.

### Integration and UI

- `src/App.tsx` owns the selected spec, current run, active tab, and component wiring.
- The JSON tab displays the same spec used by the workflow canvas and form.
- Loading, fallback, waiting, approved, rejected, and completed states must be visually distinct.
- The main demo controls must remain visible and readable at 1366 by 768.

## Hard cut line

Do not build any of the following during this sprint:

- Authentication or authorization
- A database or durable workflow engine
- Receipt uploads or OCR
- OAuth and third-party integrations
- A workflow editor
- Dashboards or multiple workflow templates
- Notifications, retries, queues, or audit exports
- A component library, animation system, or dark mode

If a task does not make the six-step demo clearer or more reliable, cut it.

## Verification

Before deployment, the integration captain must confirm:

- `pnpm test` passes the small-expense, approval, and rejection routes.
- `pnpm lint` passes without errors.
- `pnpm build` produces a production bundle.
- The form fields come from the selected spec rather than inline JSX.
- A $500 expense completes automatically and a $500.01 expense waits.
- Approve and reject are idempotent.
- Invalid compiler output activates the fixed fallback.
- No secret appears in the browser bundle, Git diff, or repository history.
- The local fallback completes the entire demo without network access.

## Ninety-second pitch

- **0:00 to 0:15:** "Automation tools build workflows, but people still need forms, approvals, and a way to understand each run. MCI derives all of them from one spec."
- **0:15 to 1:00:** Compile the prompt, show the workflow and generated form, submit $640, approve it, and show the completed trace.
- **1:00 to 1:20:** Open the JSON tab. Explain that the workflow, form, and trace share this source of truth.
- **1:20 to 1:30:** "Next, we replace the demo adapters with durable execution and one real accounting integration."

Do not explain the architecture before showing the working flow. The product loop is the pitch.
