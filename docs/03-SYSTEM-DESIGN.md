# System Design — Automated Invoice Processing Pipeline

> **Status:** Draft v0.1 (pre-implementation)
> **Stack:** Node.js + Express · Google Drive · Google Sheets · LLM via OpenRouter
> **Last updated:** 2026-06-22

This document is the **low-level / implementation-facing** design. It covers
module layout, interfaces, data schemas, the processing algorithm, the data
model in Sheets, configuration, and sequence flows.

---

## 1. Module / Folder Layout (proposed)

```
fintech/
├─ docs/                          # these documents
├─ backend/                       # Express service + pipeline + REST API
│  ├─ src/
│  │  ├─ index.js                 # app bootstrap (Express + detection + API)
│  │  ├─ config/env.js            # loads + validates env vars; derives mock mode
│  │  ├─ lib/logger.js            # pino logger
│  │  ├─ detection/
│  │  │  ├─ index.js              # startDetection / onNewFile / emitNewFile
│  │  │  ├─ pollingWatcher.js     # Changes API loop (local mode)
│  │  │  └─ pushWebhook.js        # Express webhook route (deployed mode)
│  │  ├─ ingestion/
│  │  │  ├─ driveClient.js        # Drive API wrapper (null in mock mode)
│  │  │  └─ downloader.js         # fetch bytes + metadata
│  │  ├─ normalization/
│  │  │  ├─ index.js              # selectNormalizer(mimeType)
│  │  │  ├─ pdfImage.js           # passthrough (pdf/image)
│  │  │  ├─ xlsx.js               # XLSX → CSV text
│  │  │  └─ docx.js               # DOCX → text (mammoth)
│  │  ├─ extraction/
│  │  │  ├─ openrouterClient.js   # OpenRouter via OpenAI-compatible SDK
│  │  │  ├─ prompt.js             # system + user prompt templates
│  │  │  ├─ extractInvoice.js     # document → validated JSON (+retry/repair)
│  │  │  └─ mockExtraction.js     # synthetic invoices for mock mode
│  │  ├─ mapping/
│  │  │  ├─ schema.js             # zod schema + coercion
│  │  │  └─ toRows.js             # JSON → invoice + line-item rows
│  │  ├─ output/sheetsWriter.js   # append to Invoices + Line Items tabs
│  │  ├─ state/processedStore.js  # idempotency tracking (JSON file)
│  │  ├─ store/invoiceStore.js    # local mirror that backs the REST API
│  │  ├─ postprocess/fileMover.js # move source → Processed/
│  │  ├─ api/routes.js            # REST endpoints (/api/*)
│  │  └─ pipeline.js              # orchestrates download → … → mark processed
│  ├─ .env.example
│  ├─ package.json
│  └─ README.md
└─ frontend/                      # Next.js dashboard (App Router + Tailwind)
   ├─ app/
   │  ├─ layout.tsx               # shell + nav
   │  ├─ page.tsx                 # dashboard (stats, recent, simulate)
   │  ├─ invoices/[id]/page.tsx   # invoice detail + actions
   │  └─ review/page.tsx          # review queue (needs-review + errors)
   ├─ components/                 # NavBar, StatusBadge, InvoiceTable
   ├─ lib/                        # api client, types, formatters
   ├─ .env.local.example
   └─ package.json
```

---

## 2. Core Interfaces

### 2.1 Detection adapter

```js
// detection/index.js
// Both pollingWatcher and pushWebhook conform to this contract.
function startDetection(onNewFile) {
  // onNewFile receives: { fileId, name, mimeType }
}
```

A single switch (env `DETECTION_MODE = poll | push`) selects the adapter. The
rest of the pipeline never knows which one is active.

### 2.2 Normalizer adapter

```js
// normalization/index.js
function selectNormalizer(mimeType) {
  // returns: async (buffer) => NormalizedInput
}

// NormalizedInput =
//   { kind: 'pdf',   data: Buffer }        // sent to the model as a document
// | { kind: 'image', data: Buffer }        // sent to the model as an image
// | { kind: 'text',  data: string }        // extracted text (xlsx/docx)
```

### 2.3 Extractor

```js
// extraction/extractInvoice.js
async function extractInvoice(normalizedInput) {
  // returns validated InvoiceJSON (see §4)
}
```

### 2.4 Output writer

```js
// output/sheetsWriter.js
async function writeInvoice(invoiceRow, lineItemRows) {
  // appends 1 row to Invoices, N rows to Line Items (atomic-ish; see §6)
}
```

---

### 2.5 REST API (backend → frontend)

The frontend consumes these endpoints; it never calls Google/OpenRouter directly.

```
GET   /api/health                 -> { ok, mockMode, detectionMode, capabilities, model }
GET   /api/stats                  -> { total, lineItems, byStatus, totalAmount }
GET   /api/invoices?status=       -> Invoice[]
GET   /api/invoices/:id           -> Invoice & { line_items: LineItem[] }
PATCH /api/invoices/:id           -> Invoice           (body: { status })
POST  /api/simulate-upload        -> { ok, status, invoiceId }   (mock mode only)
POST  /webhooks/drive             -> 200                (Drive push receiver)
```

The read source for the API is the **local store/mirror** (`store/invoiceStore.js`),
which is written in the same step as the Sheets append. This keeps the dashboard
fast and decouples reads from the Sheets API; it is also the seam where a real
database slots in later (same method surface).

---

## 3. Processing Algorithm (pipeline.js)

```
function processFile(file):
    if processedStore.has(file.fileId):        # (a) idempotency
        return SKIP

    bytes, meta = ingestion.download(file.fileId)

    normalizer = normalization.select(meta.mimeType)
    if normalizer is null:                      # (b) unsupported format
        markStatus(file, "NEEDS_REVIEW")
        return STOP   # do NOT move file

    input  = normalizer(bytes)
    json   = extraction.extractInvoice(input)   # retried internally
    valid  = mapping.schema.validate(json)       # (c) validation
    if not valid:
        markStatus(file, "EXTRACTION_INVALID")
        return STOP

    invoiceRow, lineRows = mapping.toRows(json, meta)

    output.writeInvoice(invoiceRow, lineRows)    # (d) write BEFORE moving

    postprocess.move(file.fileId, "Processed/")  # (e) move only after success
    processedStore.add(file.fileId)              # (f) mark processed last
    log.success(file)
```

**Invariant:** steps (d) → (e) → (f) run in that order. A crash before (f)
leaves the file un-moved and un-marked, so it is safely re-processed (and the
idempotency check + "append" semantics prevent duplicate rows if rows were
already written — see §6 reconciliation note).

---

## 4. Invoice JSON Schema (LLM output contract)

The model is instructed to return JSON matching this shape. Unknown fields go into
`extra_fields` so nothing is dropped.

```jsonc
{
  "invoice_number": "INV-2026-00123",
  "invoice_date": "2026-06-20",          // ISO 8601, null if absent
  "invoice_time": "14:32",               // null if absent
  "sender": {
    "name": "Acme Supplies Ltd.",
    "email": "billing@acme.com",
    "address": "12 Market St, Springfield, 11223"
  },
  "currency": "USD",
  "subtotal": 1200.00,
  "tax": 180.00,
  "total": 1380.00,
  "payment_terms": "Net 30",
  "due_date": "2026-07-20",
  "line_items": [
    {
      "description": "Widget A",
      "quantity": 10,
      "unit_price": 50.00,
      "line_total": 500.00
    },
    {
      "description": "Service B",
      "quantity": 1,
      "unit_price": 700.00,
      "line_total": 700.00
    }
  ],
  "extra_fields": {
    "po_number": "PO-9981",
    "bank_account": "GB29 NWBK 6016 1331 9268 19",
    "vat_id": "GB123456789"
  }
}
```

**Rules enforced by validation (`zod`/`ajv`):**
- Missing values are `null`, never invented.
- Numeric fields are coerced to numbers; currency to ISO code when possible.
- `line_items` may be empty but must be an array.
- `extra_fields` is a free-form object.

---

## 5. Google Sheets Data Model

Two tabs, linked by `invoice_id` (a generated UUID, distinct from the
vendor's `invoice_number`).

### 5.1 Tab: `Invoices` (one row per invoice)

| Column | Source |
|--------|--------|
| `invoice_id` | generated UUID |
| `processed_at` | server timestamp |
| `invoice_number` | LLM |
| `invoice_date` | LLM |
| `invoice_time` | LLM |
| `sender_name` | LLM |
| `sender_email` | LLM |
| `sender_address` | LLM |
| `currency` | LLM |
| `subtotal` | LLM |
| `tax` | LLM |
| `total` | LLM |
| `payment_terms` | LLM |
| `due_date` | LLM |
| `source_file_name` | Drive meta |
| `source_file_id` | Drive meta |
| `status` | `OK` / `NEEDS_REVIEW` / `ERROR` |
| `extra_fields_json` | JSON string of `extra_fields` |

### 5.2 Tab: `Line Items` (one row per item)

| Column | Source |
|--------|--------|
| `line_id` | generated UUID |
| `invoice_id` | FK → Invoices |
| `description` | LLM |
| `quantity` | LLM |
| `unit_price` | LLM |
| `line_total` | LLM |

> **Why two tabs:** invoices have a **variable number of line items**.
> A normalized two-tab model keeps the data queryable and avoids cramming a
> variable-length list into one cell.

### 5.3 Optional Tab: `Processed Log`
If the idempotency store lives in Sheets (one v1 option): `file_id`,
`processed_at`, `invoice_id`, `status`.

---

## 6. Idempotency & Consistency

- **Store options (v1):** flat JSON file, SQLite, or a `Processed Log` tab.
  Recommendation: SQLite locally (simple, transactional), migrate later.
- **Key:** Drive `fileId` (stable per file).
- **Append-only writes:** rows are appended, never edited in normal flow.
- **Reconciliation note:** because rows are written before the file is marked
  processed, a crash between write and mark could in theory duplicate rows on
  retry. Mitigations:
  - Write `source_file_id` on each invoice row and check for it before append, OR
  - Mark `processedStore` with an intermediate `WRITING` state.
  For v1's volume this edge case is rare; a pre-append existence check on
  `source_file_id` is the simplest safe guard.

---

## 7. LLM Extraction Design

- **Gateway:** **OpenRouter** — a single OpenAI-compatible API that routes to many
  underlying models (Claude, GPT, Gemini, open models, etc.). This decouples the
  app from any one vendor: the model is just a config value.
- **Client:** the OpenAI Node SDK pointed at OpenRouter's base URL
  (`https://openrouter.ai/api/v1`) using `OPENROUTER_API_KEY`. No vendor-specific
  SDK required.
- **Model selection:** choose a **vision-capable** model so PDFs/images can be
  read directly (e.g. an `anthropic/claude-*` or other multimodal model on
  OpenRouter). The model id is set via `OPENROUTER_MODEL` and can be swapped
  without code changes.
- **Input:**
  - PDF/image → sent as a native document/image content block (model must
    support vision/document input).
  - XLSX/DOCX → extracted text injected into the prompt.
- **Prompt strategy:**
  - System role: "You are an invoice data extractor. Return only valid JSON
    matching the schema. Use `null` for missing fields. Never fabricate values.
    Put any field not in the schema under `extra_fields`."
  - Provide the schema explicitly in the prompt.
  - Request strict JSON (use the response-format / JSON mode when the chosen
    model supports it; otherwise parse defensively).
- **Robustness:**
  - Parse with a tolerant JSON extractor (strip code fences).
  - On parse/validation failure → one repair re-prompt → else flag for review.
  - Timeouts + exponential backoff retries; optionally configure OpenRouter
    model fallbacks.
- **Cost awareness:** each invoice = one billed OpenRouter call; log token usage
  (OpenRouter returns usage + cost per request).

---

## 8. Configuration (.env)

```ini
# Runtime
PORT=4000
DETECTION_MODE=poll            # poll | push
POLL_INTERVAL_MS=5000
# mock mode runs the full pipeline with no external accounts (auto-on if creds missing)
MOCK_MODE=true
CORS_ORIGINS=http://localhost:3000

# Google
GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account.json
DRIVE_WATCH_FOLDER_ID=xxxxxxxx
DRIVE_PROCESSED_FOLDER_ID=yyyyyyyy
SHEETS_SPREADSHEET_ID=zzzzzzzz

# Push mode only
PUBLIC_WEBHOOK_URL=https://your-host/webhooks/drive

# OpenRouter (LLM gateway, OpenAI-compatible)
OPENROUTER_API_KEY=sk-or-xxxx
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=anthropic/claude-<model>   # any vision-capable model on OpenRouter
# Optional attribution headers (recommended by OpenRouter)
OPENROUTER_SITE_URL=https://your-company.example
OPENROUTER_APP_NAME=invoice-pipeline

# Concurrency
MAX_CONCURRENT_FILES=2
```

---

## 9. Sequence Diagrams

### 9.1 Local mode (polling)

```
Worker        Drive          Pipeline    OpenRouter    Sheets      Drive(move)
  │  poll changes →│             │            │           │            │
  │←─ new file id ─│             │            │           │            │
  │  onNewFile ───────────────► │            │           │            │
  │                │  download → │            │           │            │
  │                │←─ bytes ────│            │           │            │
  │                │             │ normalize  │           │            │
  │                │             │ extract ──►│           │            │
  │                │             │←── JSON ───│           │            │
  │                │             │ validate+map           │            │
  │                │             │ write rows ───────────►│            │
  │                │             │←──── ok ───────────────│            │
  │                │             │ move file ──────────────────────────►│
  │                │             │ mark processed         │            │
```

### 9.2 Deployed mode (push)

```
Drive ── change ──► POST /webhooks/drive (Express) ──► same Pipeline as above
```

The pipeline body is identical; only the trigger differs.

---

## 10. Non-Functional Targets (v1)

| Concern | Target |
|---------|--------|
| Latency (local poll) | New file → rows in Sheet within ~5–10s |
| Latency (push) | Within a few seconds of upload |
| Throughput | 20–100 invoices/day, bursts handled by small worker pool |
| Reliability | No data loss; safe re-processing on crash |
| Cost | 1 LLM call/invoice; usage logged |
| Maintainability | Add format/source/output via single adapter |

---

## 11. Testing Strategy

- **Unit:** each normalizer (PDF/XLSX/DOCX), schema validator, JSON→rows mapper.
- **Contract:** LLM output (via OpenRouter) parsed against the schema with fixture invoices.
- **Integration:** end-to-end with a test Drive folder + test Sheet using a small
  corpus of varied sample invoices (different vendors, formats, edge cases:
  missing fields, many line items, multi-currency).
- **Idempotency:** fire the same file twice → exactly one set of rows.
- **Failure injection:** force LLM/Sheets errors → verify safe retry / no move.

---

## 12. Build Phases (suggested)

1. **Skeleton:** Express app, config loading, Google + OpenRouter auth wired.
2. **Detection (poll):** Changes API loop → `onNewFile`.
3. **Ingestion:** download + idempotency store (SQLite).
4. **Normalization:** PDF passthrough first, then XLSX, then DOCX.
5. **Extraction:** OpenRouter client + prompt + schema validation.
6. **Output:** Sheets writer (two tabs) + mapping.
7. **Post-process:** move to `Processed/` + status handling.
8. **Hardening:** retries, logging, failure routing.
9. **REST API + frontend:** Express `/api/*` + Next.js dashboard (done in v1).
10. **Push mode:** webhook route + watch channel (when a public URL exists).
11. **Future:** DB store, accounting integration, auth, FTP/email intake.
