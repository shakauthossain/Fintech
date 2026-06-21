# Feature List — Automated Invoice Processing Pipeline

> **Status:** Draft v0.1 (pre-implementation)
> **Last updated:** 2026-06-22

Features are grouped by release phase. Each has a stable ID (`F-x`) so it can be
referenced from design docs, tickets, and tests.

Legend — **Priority:** P0 = must-have for v1 · P1 = important · P2 = nice-to-have
**Status:** Planned · In Progress · Done

---

## 1. v1 — Core MVP (Local, Drive → Sheets)

### 1.1 Intake & Detection

| ID | Feature | Description | Priority | Status |
|----|---------|-------------|----------|--------|
| F-1 | **Google Drive watched folder** | Single configured folder is the intake point for all invoices. | P0 | Planned |
| F-2 | **Event-driven detection** | React when a new file lands — not on a fixed timer. | P0 | Planned |
| F-3 | **Local polling fallback** | When no public URL exists, poll the Drive Changes API every few seconds for near-instant detection. | P0 | Planned |
| F-4 | **Push detection (watch channel)** | When deployed with a public HTTPS URL, receive true push notifications via Drive watch channel. | P1 | Planned |
| F-5 | **Pluggable detection adapter** | Single `onNewFile` interface so poll/push are interchangeable. | P0 | Planned |

### 1.2 Ingestion & De-duplication

| ID | Feature | Description | Priority | Status |
|----|---------|-------------|----------|--------|
| F-6 | **File download** | Fetch file bytes + metadata (name, MIME type, ID) from Drive. | P0 | Planned |
| F-7 | **Idempotency / duplicate guard** | Track processed file IDs; never process the same file twice. | P0 | Planned |
| F-8 | **Processed-file store** | Persistent record of handled files (SQLite / JSON / Sheets log). | P0 | Planned |

### 1.3 Multi-Format Normalization

| ID | Feature | Description | Priority | Status |
|----|---------|-------------|----------|--------|
| F-9 | **PDF support** | Send PDFs directly to the LLM. | P0 | Planned |
| F-10 | **Scanned/image PDF support** | Image-based invoices handled via the LLM's vision capability. | P0 | Planned |
| F-11 | **XLSX support** | Extract text/tables from spreadsheets before extraction. | P0 | Planned |
| F-12 | **DOCX support** | Extract text (or convert to PDF) before extraction. | P0 | Planned |
| F-13 | **Pluggable format adapters** | New formats added via a single MIME-keyed normalizer interface. | P1 | Planned |
| F-14 | **Unsupported-format handling** | Unknown formats flagged for review rather than failing silently. | P1 | Planned |

### 1.4 LLM Extraction

| ID | Feature | Description | Priority | Status |
|----|---------|-------------|----------|--------|
| F-15 | **Layout-agnostic extraction** | LLM reads any invoice layout without per-vendor templates. | P0 | Planned |
| F-16 | **Capture-everything output** | Returns all core fields + line items + `extra_fields` catch-all. | P0 | Planned |
| F-17 | **Structured JSON contract** | Output validated against a defined schema (zod/ajv). | P0 | Planned |
| F-18 | **No-fabrication rule** | Missing fields returned as `null`; values never invented. | P0 | Planned |
| F-19 | **Self-repair re-prompt** | Invalid JSON triggers one repair attempt before flagging. | P1 | Planned |
| F-20 | **Retry with backoff** | LLM timeouts/errors retried with exponential backoff. | P0 | Planned |
| F-20a | **OpenRouter gateway** | Single OpenAI-compatible key/endpoint fronting many models. | P0 | Planned |
| F-20b | **Config-swappable model** | Change the LLM via env (`OPENROUTER_MODEL`) without code changes. | P1 | Planned |
| F-20c | **Model fallbacks** | Use OpenRouter fallback models when the primary is unavailable. | P2 | Planned |

### 1.5 Output to Google Sheets

| ID | Feature | Description | Priority | Status |
|----|---------|-------------|----------|--------|
| F-21 | **Invoices tab** | One row per invoice (header data + metadata + status). | P0 | Planned |
| F-22 | **Line Items tab** | One row per line item, linked to its invoice by `invoice_id`. | P0 | Planned |
| F-23 | **Extra-fields column** | Non-standard fields stored as JSON so nothing is dropped. | P0 | Planned |
| F-24 | **Live, real-time ledger** | Team sees new invoices appear in the Sheet automatically. | P0 | Planned |
| F-25 | **Status column** | `OK` / `NEEDS_REVIEW` / `ERROR` per invoice. | P1 | Planned |

### 1.6 Post-Processing & Reliability

| ID | Feature | Description | Priority | Status |
|----|---------|-------------|----------|--------|
| F-26 | **Move to Processed/** | Handled files relocated to a `Processed/` sub-folder. | P0 | Planned |
| F-27 | **Write-before-move ordering** | File moved/marked only after rows are written (crash-safe). | P0 | Planned |
| F-28 | **Structured logging** | Per-file logs with timing, status, and errors. | P0 | Planned |
| F-29 | **Concurrency control** | Small worker pool that respects Drive/Sheets/LLM rate limits. | P1 | Planned |
| F-30 | **Cost/usage logging** | Record LLM token usage per invoice for budgeting. | P1 | Planned |

### 1.7 Configuration & Security

| ID | Feature | Description | Priority | Status |
|----|---------|-------------|----------|--------|
| F-31 | **Env-based config** | Folder IDs, sheet ID, keys, mode via environment variables. | P0 | Planned |
| F-32 | **Secret management** | API keys/credentials never in code; `.env` git-ignored. | P0 | Planned |
| F-33 | **Least-privilege access** | Google auth scoped to only the folder(s) + sheet needed. | P0 | Planned |

### 1.8 Frontend / Dashboard (Next.js)

| ID | Feature | Description | Priority | Status |
|----|---------|-------------|----------|--------|
| F-33a | **REST API** | Express `/api/*` exposing invoices, stats, actions to the UI. | P0 | Done |
| F-33b | **Dashboard** | Live stats + recent invoices table with status badges. | P0 | Done |
| F-33c | **Invoice detail** | Sender, totals, line items, and extra fields per invoice. | P0 | Done |
| F-33d | **Review queue** | Filtered view of `NEEDS_REVIEW` + `ERROR` invoices. | P1 | Done |
| F-33e | **Status actions** | Mark OK / flag for review from the detail page. | P1 | Done |
| F-33f | **Mock simulate-upload** | Drive the full pipeline with synthetic data (no accounts). | P1 | Done |
| F-33g | **Auto-refresh** | Dashboard/queue poll the API for near-live updates. | P2 | Done |

---

## 2. v2 — Hardening & Visibility (Planned)

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-34 | **Deployed push mode** | Run on a public host; enable true Drive push notifications. | P1 |
| F-35 | **Database store** | Migrate primary store from Sheets to a database. | P1 |
| F-36 | **Advanced review tooling** | Edit extracted fields inline, view source doc side-by-side, re-process. (Basic dashboard + queue already shipped in v1 — see F-33b–F-33e.) | P1 |
| F-37 | **Notifications** | Alert (email/Slack) on errors or items needing review. | P2 |
| F-38 | **Duplicate-invoice detection** | Detect same invoice number/sender even across files. | P2 |
| F-39 | **Confidence scoring** | Flag low-confidence extractions for human review. | P2 |
| F-40 | **Audit trail** | Full history of who/what changed each record. | P2 |

---

## 3. v3+ — Extensions (Future)

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-41 | **FTP intake source** | Add FTP folder as an additional intake adapter. | P2 |
| F-42 | **Email intake source** | Pull invoices from a monitored mailbox. | P2 |
| F-43 | **Accounting integration** | Push data into QuickBooks / Xero / ERP. | P1 |
| F-44 | **Approval & payment workflows** | Route invoices for approval; trigger payments. | P2 |
| F-45 | **Multi-company / multi-tenant** | Support multiple companies/folders/sheets. | P2 |
| F-46 | **Analytics & reporting** | Spend by vendor, trends, tax summaries. | P2 |
| F-47 | **Vendor-specific prompt tuning** | Optimize extraction for your most frequent vendors. | P2 |

---

## 4. Feature → Document Traceability

| Feature group | Where it's designed |
|---------------|---------------------|
| Detection (F-1–F-5) | Architecture §4, Design §2.1 / §9 |
| Ingestion & idempotency (F-6–F-8) | Design §3, §6 |
| Normalization (F-9–F-14) | Architecture §1(4), Design §2.2 |
| Extraction (F-15–F-20) | Design §4, §7 |
| Output (F-21–F-25) | Design §5 |
| Post-processing (F-26–F-30) | Architecture §6, Design §3 |
| Config & security (F-31–F-33) | Architecture §7, Design §8 |
| Frontend & API (F-33a–F-33g) | Architecture §5a, Design §2.5 |
