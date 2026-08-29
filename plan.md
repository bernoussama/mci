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

## Architecture decision

Use a small local TypeScript server next to the existing Vite app. The browser sends the prompt to one HTTP endpoint. The server calls the model, validates its structured output, normalizes it into the runtime spec, and returns that spec to the browser.

```text
Browser prompt
    |
    | POST /api/compile
    v
Hono API -> AI SDK -> OpenAI model
    |                    |
    |                    v
    |              WorkflowDraft
    |                    |
    +---- Zod validation + deterministic normalization
                         |
                         v
                   WorkflowSpec
                         |
          +--------------+--------------+--------------+
          |              |              |              |
          v              v              v              v
       Canvas      Generated form    Executor       JSON view
```

The compiler must not emit source code. It emits data that conforms to one narrow schema.

## Libraries

### Keep

| Library | Job | Decision |
| --- | --- | --- |
| React | UI and local run state | Keep the current React app. |
| Vite | Browser development and production build | Keep it and proxy `/api` to the local server. |
| TypeScript | Shared types across browser and server | Keep strict mode. |
| Vitest | Domain and server tests | Keep it as the only test runner. |
| Testing Library | One user-journey component test | Keep it; do not add end-to-end tooling during the sprint. |

### Add

Install the runtime packages with:

```bash
pnpm add ai @ai-sdk/openai zod hono @hono/node-server
pnpm add -D concurrently tsx
```

| Library | Job | Why this one |
| --- | --- | --- |
| [`ai`](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) | Provider-neutral model call and typed object output | `generateText` with `Output.object` accepts a Zod schema and validates the result. |
| [`@ai-sdk/openai`](https://ai-sdk.dev/providers/ai-sdk-providers/openai) | OpenAI model adapter | Keeps provider setup separate from compiler logic. |
| [`zod`](https://zod.dev/) | Request, model-output, and runtime-spec validation | One schema supplies runtime validation and inferred TypeScript types. |
| [`hono`](https://hono.dev/docs/getting-started/nodejs) | Local HTTP API | Small TypeScript server with Web-standard request and response objects. |
| [`@hono/node-server`](https://hono.dev/docs/getting-started/nodejs) | Run Hono on the team's Node installation | The demo target is a local laptop, not a cloud runtime. |
| `concurrently` | Start Vite and the API with one command | One teammate can launch the whole demo with `pnpm dev`. |
| `tsx` | Run the TypeScript server without a separate server build | Saves setup time and keeps the local server readable. |

### Do not add

- Do not add React Flow. The existing five-node canvas already tells the demo story.
- Do not add JSON Forms or React Hook Form. Mapping three field types in React is smaller than configuring a form system.
- Do not add XState. Pure reducer functions cover the four run states.
- Do not add TanStack Query. There is one request and no cache to manage.
- Do not add a database, ORM, queue, OAuth library, UI kit, or state-management package.

## The interface to pipe the model into

The model returns `WorkflowDraft`, not `WorkflowSpec`. This keeps unstable model choices away from step IDs and executor behavior.

```ts
type FieldType = "text" | "number" | "file";

type WorkflowDraft = {
  name: string;
  description: string;
  formTitle: string;
  fields: Array<{
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
  }>;
  extraction: {
    sourceFieldId: string;
    outputFieldIds: string[];
  };
  approval: {
    fieldId: string;
    operator: "greater_than";
    threshold: number;
    approverRole: string;
  };
  destination: "accounting";
};
```

For the expense prompt, valid model output looks like:

```json
{
  "name": "Expense approval",
  "description": "Review large employee expenses before accounting.",
  "formTitle": "Submit an expense",
  "fields": [
    { "id": "employee", "label": "Employee", "type": "text", "required": true },
    { "id": "receipt", "label": "Receipt", "type": "file", "required": true },
    { "id": "merchant", "label": "Merchant", "type": "text", "required": true },
    { "id": "amount", "label": "Amount", "type": "number", "required": true }
  ],
  "extraction": {
    "sourceFieldId": "receipt",
    "outputFieldIds": ["merchant", "amount"]
  },
  "approval": {
    "fieldId": "amount",
    "operator": "greater_than",
    "threshold": 500,
    "approverRole": "manager"
  },
  "destination": "accounting"
}
```

`normalizeWorkflow(draft)` performs checks that structured model output alone cannot guarantee:

- Field IDs are unique and use lowercase letters, numbers, and underscores.
- `sourceFieldId`, `outputFieldIds`, and `approval.fieldId` reference existing fields.
- The approval field has type `number`.
- The extraction source has type `file`.
- Threshold is finite, non-negative, and no larger than 1,000,000.
- The normalizer owns stable step IDs: `submit`, `extract`, `threshold`, `approve`, and `accounting`.

After those checks, the normalizer returns the object every product surface consumes:

```ts
type WorkflowSpec = {
  version: 1;
  id: string;
  name: string;
  description: string;
  form: {
    title: string;
    fields: WorkflowField[];
  };
  steps: WorkflowStep[];
  approval: {
    fieldId: string;
    operator: "greater_than";
    threshold: number;
    approverRole: string;
  };
};
```

Derive `WorkflowDraft`, `WorkflowSpec`, and their child types with `z.infer`. Do not maintain separate handwritten TypeScript types that can drift from the Zod schemas.

## HTTP interface

### `GET /api/health`

Use this only for startup status.

```json
{
  "ok": true,
  "modelConfigured": true,
  "model": "gpt-5-mini"
}
```

Never return the API key or any part of it.

### `POST /api/compile`

Request:

```ts
type CompileRequest = {
  prompt: string;
};
```

Rules:

- Trim the prompt.
- Reject fewer than 20 or more than 4,000 characters with HTTP 400.
- Set `Content-Type: application/json` on every response.
- Abort the provider call after 12 seconds.
- Do not log the raw prompt or provider response.

Successful model response:

```ts
type CompileSuccess = {
  ok: true;
  source: "model";
  spec: WorkflowSpec;
  warning: null;
};
```

Provider, timeout, or model-output failure:

```ts
type CompileFallback = {
  ok: true;
  source: "fallback";
  spec: WorkflowSpec;
  warning: string;
};
```

The fallback is HTTP 200 because the browser still receives an executable workflow. Use a short safe warning such as `"Model unavailable. Using the demo workflow."` Do not expose SDK errors or stack traces.

Invalid browser request:

```ts
type CompileFailure = {
  ok: false;
  error: {
    code: "invalid_request";
    message: string;
  };
};
```

Return this shape with HTTP 400. Unexpected server bugs return the same outer failure shape with code `internal_error` and HTTP 500.

## Compiler call

Use the current AI SDK structured-output interface:

```ts
const { output } = await generateText({
  model: openai(process.env.MCI_MODEL ?? "gpt-5-mini"),
  output: Output.object({
    schema: WorkflowDraftSchema,
    name: "workflow_draft",
    description: "A constrained expense approval workflow",
  }),
  system: WORKFLOW_COMPILER_PROMPT,
  prompt,
  abortSignal: AbortSignal.timeout(12_000),
});
```

The system prompt must say:

- Generate an expense approval workflow only.
- Use only `text`, `number`, and `file` fields.
- Use `greater_than` for the approval rule.
- Use `accounting` as the destination.
- Do not invent integrations, secrets, code, URLs, or executable expressions.
- Preserve the threshold and approver role from the user's prompt.

Catch `NoObjectGeneratedError`, provider errors, aborts, and normalization errors at the compiler boundary. All four paths return the fixed fallback spec.

Configuration lives in `.env.local` and must remain ignored:

```dotenv
OPENAI_API_KEY=replace_me
MCI_MODEL=gpt-5-mini
API_PORT=8787
```

Add `.env.example` with the variable names and safe placeholders. Do not commit `.env.local`.

## Runtime interface

The browser converts form data into:

```ts
type SubmissionValue = string | number;
type WorkflowSubmission = Record<string, SubmissionValue>;

type RunStatus = "running" | "waiting" | "completed" | "rejected";

type TraceEvent = {
  id: string;
  stepId: string;
  status: "completed" | "waiting" | "rejected";
  title: string;
  detail: string;
};

type WorkflowRun = {
  id: string;
  status: RunStatus;
  input: WorkflowSubmission;
  events: TraceEvent[];
};
```

Use browser `crypto.randomUUID()` for run and event IDs. File fields contribute the selected filename, not file bytes.

Expose two pure functions:

```ts
startRun(spec: WorkflowSpec, input: WorkflowSubmission): WorkflowRun
decideRun(spec: WorkflowSpec, run: WorkflowRun, decision: "approve" | "reject"): WorkflowRun
```

`startRun` validates that required values exist and that the approval field is numeric. It adds submit, extraction, and threshold events. It returns `waiting` above the threshold or `completed` with an accounting event at or below it.

`decideRun` accepts decisions only when the run is `waiting`. Approval adds approval and accounting events, then completes. Rejection adds one rejected approval event and ends the run. Calling it again returns the unchanged run.

## Browser component interfaces

```ts
type WorkflowCanvasProps = {
  spec: WorkflowSpec;
};

type GeneratedFormProps = {
  spec: WorkflowSpec;
  disabled: boolean;
  onSubmit(input: WorkflowSubmission): void;
};

type TracePanelProps = {
  run: WorkflowRun | null;
  onDecision(decision: "approve" | "reject"): void;
};
```

`App` owns only orchestration state:

```ts
type CompileState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; source: "model" | "fallback"; warning: string | null }
  | { status: "error"; message: string };
```

The app stores `prompt`, `spec`, `compileState`, `run`, and `activeTab`. It calls `/api/compile`, passes the returned spec to all four views, calls `startRun` on form submission, and calls `decideRun` from the trace panel.

If the HTTP request itself fails, the browser imports the checked-in fallback spec and sets `source: "fallback"`. This second fallback keeps the demo alive if the local API process dies.

## Local process layout

Use these boundaries:

```text
server/
├── index.ts               Hono routes, error mapping, static production files
└── compiler.ts            AI SDK call and fallback policy
src/
├── domain/
│   ├── workflow-schema.ts Zod schemas, inferred types, fallback spec
│   ├── normalize.ts       WorkflowDraft -> WorkflowSpec
│   └── executor.ts        startRun and decideRun
├── components/
│   ├── GeneratedForm.tsx
│   ├── TracePanel.tsx
│   └── WorkflowCanvas.tsx
├── services/
│   └── compiler-client.ts POST /api/compile and response validation
└── App.tsx                orchestration only
```

Vite proxies `/api` to `http://localhost:8787` during development. The Hono server serves `dist` after `pnpm build` so the local production demo has one process and one URL.

Package scripts should provide:

```json
{
  "dev": "start the API and Vite together",
  "dev:web": "vite",
  "dev:api": "run server/index.ts with .env.local",
  "build": "typecheck browser and server, then build Vite",
  "start": "run the Hono server against dist",
  "test": "vitest run",
  "lint": "eslint ."
}
```

## Team ownership

Each teammate owns one work packet. Avoid editing another owner's files unless the integration captain asks for the change.

| Owner | Work packet | Deliverable | Handoff |
| --- | --- | --- | --- |
| Teammate 1 | [Prompt compiler](https://github.com/bernoussama/mci/issues/2) | Typed compiler with a deterministic fallback | T+35 |
| Teammate 2 | [Generated form](https://github.com/bernoussama/mci/issues/1) | Form rendered from `WorkflowSpec.form.fields` | T+30 |
| Teammate 3 | [Approval and trace](https://github.com/bernoussama/mci/issues/5) | Approve, reject, and automatic-completion paths | T+35 |
| Teammate 4 | [Demo UI polish](https://github.com/bernoussama/mci/issues/3) | Projector-ready main flow and status states | T+30 |
| Teammate 5 | [Integration and pitch](https://github.com/bernoussama/mci/issues/4) | Merged build, local launch, fallback, and rehearsal | T+45 |

Use short-lived branches named `hack/compiler`, `hack/form`, `hack/trace`, and `hack/ui`. The integration captain owns `main`, `src/App.tsx`, the local production launch, and the final call on whether a branch is stable enough to merge.

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
- Integration captain prepares the local production command and watches for overlapping changes.

### T+30 to T+45: integrate

Merge in this order:

1. Generated form.
2. Executor and trace.
3. Prompt compiler.
4. CSS polish.

After each merge, run the focused test for that work packet. If a branch breaks the main demo and cannot be fixed in five minutes, revert that merge and use the fallback behavior.

### T+45 to T+52: freeze and launch

- Stop feature work at T+45.
- Run `pnpm test && pnpm lint && pnpm build`.
- Launch the local production build through the Hono server.
- Keep a local production build open in another tab.
- Verify the fixed workflow works with the network disabled.

### T+52 to T+60: rehearse

Run the exact six-step demo twice. The presenter talks while one teammate watches the clock and another keeps the local fallback ready.

## Implementation order and handoff contracts

### Compiler owner

1. Add `WorkflowDraftSchema` and `WorkflowSpecSchema`.
2. Add `normalizeWorkflow` with reference and numeric checks.
3. Add the Hono health and compile routes.
4. Add the AI SDK call and server fallback.
5. Hand the integration captain a working `curl` example and the two response shapes.

### Form owner

1. Accept the component interface above without importing compiler code.
2. Render text, number, and file inputs from `spec.form.fields`.
3. Normalize number inputs to numbers and files to filenames.
4. Hand the integration captain a component that works with `expenseWorkflow` in isolation.

### Executor owner

1. Implement pure `startRun` and `decideRun` functions.
2. Cover automatic, waiting, approve, reject, and repeated-decision paths.
3. Build `TracePanel` around `WorkflowRun` without owning the run state.
4. Hand the integration captain the pure functions, tests, and component props.

### UI owner

1. Extract the current canvas into `WorkflowCanvas` without changing its data contract.
2. Add styles for loading, fallback, waiting, approved, rejected, and completed.
3. Fit the six-step demo at 1366 by 768.
4. Do not change domain types or component props.

### Integration captain

1. Configure the Vite proxy and local scripts first so compiler work is testable.
2. Integrate form, executor, compiler, then CSS in that order.
3. Keep the JSON tab bound to the same `spec` object used everywhere else.
4. Exercise both server fallback and browser fallback before feature freeze.

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

### Automated checks

The focused suite must cover:

- `WorkflowDraftSchema` accepts the expense draft and rejects missing required keys.
- `normalizeWorkflow` rejects duplicate IDs, missing references, a non-numeric approval field, and an invalid threshold.
- `startRun` completes at exactly $500 and waits at $500.01.
- `decideRun` approves, rejects, and ignores a repeated decision.
- `POST /api/compile` returns the model spec when the AI SDK succeeds.
- `POST /api/compile` returns the fallback on timeout, provider error, invalid structured output, and normalization failure.
- `POST /api/compile` returns HTTP 400 for an empty, short, or oversized prompt.
- `GeneratedForm` renders all three field types and returns normalized values.
- One app test covers compile, submit $640, approve, and completed accounting trace.

Mock the AI SDK at the compiler module boundary. Tests must not call a real model.

### Final demo checks

Before launch, the integration captain must confirm:

- `pnpm test` passes the small-expense, approval, and rejection routes.
- `pnpm lint` passes without errors.
- `pnpm build` produces a production bundle.
- The form fields come from the selected spec rather than inline JSX.
- A $500 expense completes automatically and a $500.01 expense waits.
- Approve and reject are idempotent.
- Invalid compiler output activates the fixed fallback.
- No secret appears in the browser bundle, Git diff, or repository history.
- The local fallback completes the entire demo without network access.
- The receipt-extraction event is visibly labeled as simulated. Do not claim that the MVP uploads or reads receipt bytes.

## Ninety-second pitch

- **0:00 to 0:15:** "Automation tools build workflows, but people still need forms, approvals, and a way to understand each run. MCI derives all of them from one spec."
- **0:15 to 1:00:** Compile the prompt, show the workflow and generated form, submit $640, approve it, and show the completed trace.
- **1:00 to 1:20:** Open the JSON tab. Explain that the workflow, form, and trace share this source of truth.
- **1:20 to 1:30:** "Next, we replace the demo adapters with durable execution and one real accounting integration."

Do not explain the architecture before showing the working flow. The product loop is the pitch.
