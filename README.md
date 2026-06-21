# Invoice Processing Pipeline

Internal fintech automation: invoices dropped into a Google Drive folder are
detected on upload, read by an LLM (via OpenRouter) regardless of format/layout,
and written as structured rows to Google Sheets — with a web dashboard on top.

## Repository layout

```
.
├─ backend/    Express service: detection → extraction → Sheets + REST API
├─ frontend/   Next.js dashboard: ledger, invoice detail, review queue
└─ docs/       Architecture, design, features, user journey
```

## Run the full stack locally

Two terminals:

```bash
# Terminal 1 — backend (runs in mock mode by default, no accounts needed)
cd backend && cp -n .env.example .env && npm install && npm run dev

# Terminal 2 — frontend
cd frontend && cp -n .env.local.example .env.local && npm install && npm run dev
```

Open http://localhost:3000 and click **Simulate upload** to push invoices
through the real pipeline. To go live, add Google + OpenRouter credentials to
`backend/.env` and set `MOCK_MODE=false`.

## How it works

1. **Detect** — a new file in the watched Drive folder triggers processing
   (push when deployed; polling locally).
2. **Normalize** — PDF/image pass through; XLSX/DOCX are converted to text.
3. **Extract** — the document is sent to an LLM via OpenRouter, returning
   structured JSON (core fields + line items + `extra_fields`).
4. **Store** — rows are appended to the `Invoices` and `Line Items` tabs and
   mirrored locally for the API.
5. **Finish** — the source file is moved to `Processed/` and marked done
   (idempotent, crash-safe ordering).

## Documentation

See [`docs/`](./docs/README.md) for the system description, architecture, design,
feature list, and user journey.

## Tech

- **Backend:** Node.js, Express, googleapis (Drive + Sheets), OpenAI SDK →
  OpenRouter, zod, xlsx, mammoth, pino.
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS.
