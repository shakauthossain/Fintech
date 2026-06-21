# Invoice Pipeline — Frontend (Next.js)

Admin dashboard for the invoice pipeline. Shows the live invoice ledger, invoice
detail with line items, and a review queue for flagged/errored invoices.

## Quick start

```bash
cp .env.local.example .env.local   # points at the backend (http://localhost:4000)
npm install
npm run dev                         # http://localhost:3000
```

Make sure the backend is running first (see `../backend`).

## Pages

- `/` — Dashboard: stats, recent invoices, and a **Simulate upload** button
  (visible in mock mode) to drive the pipeline without Google Drive.
- `/invoices/[id]` — Invoice detail: sender, totals, line items, extra fields,
  and actions to mark OK / flag for review.
- `/review` — Review queue: invoices needing review or that errored.

## Configuration

- `NEXT_PUBLIC_API_BASE` — base URL of the Express backend (default
  `http://localhost:4000`).

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS.
