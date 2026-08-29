# MCI

MCI is a starter for prompt-built business workflows. A user describes a process, the compiler returns a declarative workflow spec, and the product derives both the operational UI and execution trace from that spec.

The included expense approval demo covers one complete path:

1. An employee submits an expense and receipt.
2. An AI step reads the merchant and amount.
3. Expenses above $500 pause for manager approval.
4. Smaller expenses go straight to accounting.
5. The run trace records each decision.

The current compiler and integrations are simulated on purpose. The starter proves the product loop without hiding it behind API setup.

## Run it

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

## Checks

```bash
pnpm test
pnpm lint
pnpm build
```

## Project shape

```text
src/
├── domain/
│   ├── workflow.ts       workflow schema, demo spec, and executor
│   └── workflow.test.ts  routing tests
├── App.tsx               prompt, canvas, generated form, and trace UI
└── styles.css
```

## Next cuts

- Replace the fixed compiler with a structured-output model call that validates against `WorkflowSpec`.
- Render form fields from `spec.fields` instead of keeping the demo form inline.
- Add durable run storage and resume manager approvals.
- Connect one real accounting destination. Do not start with a catalog of integrations.

## License

MIT
