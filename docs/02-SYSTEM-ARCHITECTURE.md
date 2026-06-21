# System Architecture — Automated Invoice Processing Pipeline

> **Status:** Draft v0.2 (initial implementation)
> **Stack:** Node.js + Express (backend) · Next.js (frontend)
> **Intake:** Google Drive · **Output:** Google Sheets · **Extraction:** LLM via OpenRouter
> **Last updated:** 2026-06-22

---

## 1. Architectural Overview

The system is an **event-driven, modular pipeline**. Each stage has a single
responsibility and a clean interface to the next, so individual stages
(detection source, normalizer, extractor, output target) can be swapped or
extended without touching the rest.

```
   ┌──────────────┐
   │ Google Drive │  invoices dropped here (PDF / image / XLSX / DOCX)
   │ watched dir  │
   └──────┬───────┘
          │  (1) change event
          ▼
   ┌──────────────────────────────────────────────────────────┐
   │                 Node.js + Express Service                 │
   │                                                           │
   │  (2) Detection Layer                                      │
   │      • Webhook receiver  (push, when deployed)            │
   │      • Polling worker    (Changes API, local fallback)    │
   │                  │                                        │
   │                  ▼                                        │
   │  (3) Ingestion / Download                                 │
   │      • fetch file bytes + metadata from Drive             │
   │      • idempotency check (already processed?)             │
   │                  │                                        │
   │                  ▼                                        │
   │  (4) Normalization Layer  (format → LLM-ready input)      │
   │      ├─ PDF / image  → pass through                       │
   │      ├─ XLSX         → extract text/tables                │
   │      ├─ DOCX         → extract text  / convert to PDF     │
   │      └─ (future)     → pluggable adapters                 │
   │                  │                                        │
   │                  ▼                                        │
   │  (5) Extraction Layer  (LLM via OpenRouter gateway)        │
   │      • prompt + document → structured JSON                │
   │      • core fields + line items + extra_fields            │
   │                  │                                        │
   │                  ▼                                        │
   │  (6) Validation & Mapping                                 │
   │      • schema validation, type coercion                   │
   │      • map JSON → sheet rows                              │
   │                  │                                        │
   │                  ▼                                        │
   │  (7) Output Layer                                         │
   │      • append to "Invoices" tab                          │
   │      • append to "Line Items" tab                        │
   │                  │                                        │
   │                  ▼                                        │
   │  (8) Post-Processing                                      │
   │      • move source file → Processed/                      │
   │      • record file ID in processed store                 │
   │      • structured logging                                │
   └──────────────────────────────────────────────────────────┘
          │
          ▼
   ┌──────────────┐
   │ Google Sheet │  live ledger: Invoices tab + Line Items tab
   └──────────────┘

   The same Express service also exposes a REST API consumed by the frontend:

   ┌──────────────────┐      REST/JSON       ┌────────────────────────────┐
   │  Next.js frontend │ ───────────────────► │  Express API (/api/*)       │
   │  • Dashboard      │ ◄─────────────────── │  reads the local mirror /   │
   │  • Invoice detail │                      │  store; triggers actions    │
   │  • Review queue   │                      │                            │
   └──────────────────┘                      └────────────────────────────┘
```

---

## 2. Why These Choices

### 2.1 Node.js + Express (vs. Apps Script)
Apps Script was rejected because:
- It cannot natively parse the full range of formats (XLSX/DOCX/others).
- It is awkward for an **extensible service** with many future features.
- It is tied to interval triggers, not true event-driven processing.

Express gives a proper backend: full npm ecosystem (format parsers, SDKs),
clean module boundaries, and a natural home for future endpoints and features.

### 2.2 Event-driven detection (vs. interval polling)
The requirement is **instant** processing on upload. The architecture uses the
Google Drive **watch/Changes** mechanism. See [Detection Layer](#4-detection-layer)
for the push-vs-poll reality.

### 2.3 LLM extraction (vs. template OCR / Document AI)
Invoice layouts are inconsistent and the goal is to capture **all** information.
An LLM reads documents like a human and returns flexible structured JSON,
unlike rigid schema parsers that break on new layouts.

### 2.3.1 OpenRouter as the LLM gateway (vs. a single vendor SDK)
Extraction calls go through **OpenRouter**, an OpenAI-compatible API that fronts
many models (Claude, GPT, Gemini, open models). Benefits: one integration and
one API key for all models, the ability to **swap the model via config** (no code
change), built-in **model fallbacks**, and per-request cost/usage reporting. The
app uses the OpenAI SDK pointed at OpenRouter's base URL. A **vision-capable**
model is selected so PDFs/images can be read directly.

### 2.4 Google Sheets as primary store (v1)
Both ends are Google-native and volume is modest (20–100/day). Sheets is the
agreed v1 store; a database is a known future migration.

---

## 3. Component Inventory

| # | Component | Responsibility | Key Tech |
|---|-----------|----------------|----------|
| 1 | **Drive Watcher** | Subscribe to / poll the watched folder | Drive API v3 (`changes`, `files.watch`) |
| 2 | **Webhook Endpoint** | Receive push notifications (deployed mode) | Express route `POST /webhooks/drive` |
| 3 | **Polling Worker** | Local-mode fallback; poll Changes every few seconds | `setInterval` / job loop + Drive API |
| 4 | **Ingestion Service** | Download file bytes + metadata | Drive API `files.get` |
| 5 | **Idempotency Store** | Track processed file IDs | JSON/SQLite/file (v1), DB later |
| 6 | **Normalizer** | Convert any format → LLM input | `pdf` passthrough, `xlsx`, `mammoth`/`docx`, converters |
| 7 | **Extractor** | Document → structured JSON | OpenRouter (OpenAI-compatible SDK) |
| 8 | **Validator/Mapper** | Validate + map JSON to rows | `zod`/`ajv` + mapping logic |
| 9 | **Sheets Writer** | Append rows to both tabs | Sheets API v4 |
| 10 | **File Mover** | Relocate source to `Processed/` | Drive API `files.update` (parents) |
| 11 | **Logger/Monitor** | Structured logs, error capture | `pino` |
| 12 | **Local Store / Mirror** | Backs the REST API; mirrors Sheets rows | JSON file (v1), DB later |
| 13 | **REST API** | Expose invoices/stats/actions to the UI | Express routes `/api/*` |
| 14 | **Frontend** | Dashboard, invoice detail, review queue | Next.js (App Router) + Tailwind |

---

## 4. Detection Layer (Push vs. Poll)

> **The core nuance of this system.**

Google Drive does **not** broadcast changes to arbitrary listeners. Two modes:

### 4.1 Push (target / production)
- Register a **watch channel** (`files.watch` / `changes.watch`).
- Google sends a notification to a **public HTTPS webhook** on the Express server.
- Truly event-driven and near-instant.
- **Requires** the server be reachable from the internet (deployed, or via a
  dev tunnel like `ngrok` / `cloudflared`).

### 4.2 Poll (local v1 fallback)
- A background worker calls the Drive **Changes API** every few seconds using a
  saved **page token**.
- New files are detected within seconds — near-instant in practice.
- Works on `localhost` with **no public URL**.

> **Design rule:** the detection source is abstracted behind a single
> `onNewFile(file)` callback. Switching from poll (local) to push (deployed)
> changes only the detection adapter — the rest of the pipeline is untouched.

---

## 5. Data Flow (Happy Path)

1. Vendor invoice is uploaded to the watched Drive folder.
2. Detection layer emits a "new file" event (push) or discovers it (poll).
3. Ingestion checks the idempotency store → if seen, **stop**.
4. File bytes + metadata are downloaded.
5. Normalizer converts the file to LLM-ready input based on MIME type.
6. Extractor sends the document to the LLM via OpenRouter → receives structured JSON.
7. Validator checks the JSON; mapper builds invoice + line-item rows.
8. Sheets Writer appends one row to **Invoices** and N rows to **Line Items**.
9. File Mover relocates the source file to `Processed/`.
10. Idempotency store records the file ID; success is logged.

---

## 5a. Frontend & API Layer

The Express service doubles as the API for a **Next.js dashboard**. The frontend
never talks to Google/OpenRouter directly — it only calls the backend REST API,
keeping all credentials server-side.

**REST endpoints (v1):**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Mode, model, capabilities |
| GET | `/api/stats` | Counts by status + total value |
| GET | `/api/invoices?status=` | List (optional status filter) |
| GET | `/api/invoices/:id` | Invoice + line items |
| PATCH | `/api/invoices/:id` | Update status (resolve review) |
| POST | `/api/simulate-upload` | Inject a mock invoice (mock mode only) |

**Frontend pages:** Dashboard (stats + recent invoices), Invoice detail
(sender, totals, line items, extra fields, actions), Review queue
(needs-review + errors).

**Mock mode:** when Google/OpenRouter credentials are absent (or `MOCK_MODE=true`),
the backend runs the real pipeline against synthetic data so the entire stack is
demonstrable with no external accounts. The "Simulate upload" button drives it.

---

## 6. Error Handling & Resilience

| Failure point | Strategy |
|---------------|----------|
| Drive download fails | Retry with backoff; leave file in inbox; log |
| Unsupported format | Route to "Needs review"; flag status; do **not** move file |
| LLM call fails / times out | Retry with backoff; on repeated failure mark invoice `status=ERROR` |
| LLM returns invalid JSON | Re-prompt / repair; on failure flag for manual review |
| Sheets append fails | Retry; do **not** mark processed (so it re-runs safely) |
| Duplicate event | Idempotency store prevents re-processing |
| Partial success | Move to `Processed/` **only after** rows are written |

**Ordering guarantee:** A file is marked processed and moved **only after** its
rows are successfully written, so any crash mid-pipeline results in safe
re-processing rather than data loss.

---

## 7. Security & Configuration

- **Google auth:** Service Account (or OAuth) with access scoped to the single
  watched folder + the target spreadsheet.
- **OpenRouter key:** stored in environment variables / secrets, never in code.
- **Secrets management:** `.env` for local dev (git-ignored); secret manager when
  deployed.
- **Least privilege:** the service should not have broad Drive access — only the
  folders and sheet it needs.

---

## 8. Deployment Topology

### v1 — Local (now)
```
Developer machine
 ├─ Next.js frontend (localhost:3000)  ──REST──► Express API
 ├─ Express app (localhost:4000)
 │   ├─ Polling worker  → Google Drive (Changes API)
 │   ├─ → OpenRouter API (LLM)
 │   ├─ → Google Sheets API
 │   └─ local store mirror (data/invoices.json)   [mock mode runs with no accounts]
```

### Future — Deployed
```
Cloud host (Cloud Run / VM / container)
 ├─ Frontend (static/SSR host)  ──REST──► Backend API
 ├─ Backend: public HTTPS endpoint
 │   ├─ Drive watch channel → POST /webhooks/drive   (true push)
 │   ├─ → OpenRouter API (LLM)
 │   └─ → Google Sheets API  (or migrated DB)
```

---

## 9. Extensibility Roadmap

The modular design anticipates these additions **without rearchitecture**:

- **New intake sources** (FTP, email inbox) → add a detection adapter behind
  `onNewFile`.
- **New formats** → add a normalizer adapter keyed by MIME type.
- **Database store** → add a second output adapter alongside / replacing Sheets.
- **Accounting integration** (QuickBooks/Xero/ERP) → add an output/export stage.
- **Web dashboard / API** → add Express routes on the same service.
- **Approval & payment workflows** → add stages after extraction.

---

## 10. Open Architectural Questions

- Dev tunnel (`ngrok`/`cloudflared`) for early push testing, or stay on polling
  until first deploy?
- Idempotency store for v1: flat JSON file vs. SQLite vs. a Sheets "log" tab?
- Normalization for DOCX/XLSX: extract text vs. convert to PDF for richer LLM
  context?
- Concurrency model: process one file at a time vs. a small worker pool (to stay
  within Sheets/Drive/LLM rate limits at the 20–100/day volume)?
