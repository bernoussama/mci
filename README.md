# TraceFlow

TraceFlow is a starter for prompt-built business workflows. A user describes a process, the compiler returns a declarative workflow spec, and the product derives both the operational UI and execution trace from that spec.

The included expense approval demo covers one complete path:

1. An employee submits an expense and receipt.
2. An AI step reads the merchant and amount.
3. Expenses above $500 pause for manager approval.
4. Smaller expenses go straight to accounting.
5. The run trace records each decision.

Business discovery uses GPT-5.6 Luna to assess each answer, ask the next question, and suggest workflows after no more than five answers. The compiler also uses structured model output. Both paths have deterministic fallbacks, while receipt extraction and the accounting handoff remain visibly simulated.

## Run it

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:5173`.

Put your API key in `.env.local`:

```dotenv
OPENAI_API_KEY=your_key_here
DISCOVERY_MODEL=gpt-5.6-luna
```

Never prefix this variable with `VITE_`. The Hono server reads the key and the browser never receives it. Without a key, discovery uses fixed follow-up questions and the compiler returns the checked-in expense workflow so the demo still runs.

To test the production-shaped local server:

```bash
pnpm build
pnpm start
```

Open `http://localhost:8787`.

## Checks

```bash
pnpm test
pnpm lint
pnpm build
```

## Project shape

```text
server/                   local Hono API, discovery agent, and model compiler
shared/                   Zod contracts shared by browser and server
src/
├── components/           canvas, generated form, and trace UI
├── domain/               pure workflow executor
├── services/             browser API client
└── App.tsx               orchestration state
```

## Next steps

- Add durable run storage and resume manager approvals.
- Replace simulated receipt extraction with OCR.
- Connect one real accounting destination. Do not start with a catalog of integrations.

## License

MIT
