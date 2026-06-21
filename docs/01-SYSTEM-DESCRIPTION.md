# System Description — Automated Invoice Processing Pipeline

> **Status:** Draft v0.1 (pre-implementation)
> **Owner:** Internal Finance Automation
> **Last updated:** 2026-06-22

---

## 1. Purpose

This system is an **internal fintech automation product** that eliminates manual
data entry from invoices. Invoices arrive from many different vendors in many
different formats. Instead of a person opening each file and copying fields into
a spreadsheet, this system:

1. Detects a new invoice **the moment it is uploaded** to a Google Drive folder.
2. Reads and understands the invoice **regardless of layout or file format**.
3. Extracts **every meaningful field** (header data + line items + any extra
   fields the invoice happens to contain).
4. Writes that structured data into a **live Google Sheet** that the team can
   view in real time.
5. Moves the processed file into a `Processed/` sub-folder so the inbox stays
   clean and nothing is processed twice.

The end result is a centralized, structured, always-up-to-date ledger of every
invoice the company receives — built automatically.

---

## 2. Problem Statement

- Invoices come from **different senders**, each with their **own layout**.
- They arrive in **multiple file formats**: PDF, scanned image PDFs, XLSX, DOCX,
  and potentially others in the future.
- Manual entry is slow, error-prone, and does not scale.
- Rigid, template-based OCR or regex parsing **breaks** every time a new vendor
  or layout appears.
- The business wants a **single source of truth** for invoice data that updates
  the instant a new invoice lands.

---

## 3. Scope

### 3.1 In Scope (v1)

| Area | Decision |
|------|----------|
| **Intake source** | Google Drive folder (single watched folder) |
| **Detection model** | Event-driven — process instantly on new upload (not interval polling) |
| **Supported formats** | PDF, image-based PDF, XLSX, DOCX (extensible) |
| **Extraction engine** | LLM via OpenRouter — layout-agnostic, captures "everything" |
| **Output** | Google Sheets (live, cloud) — primary data store for v1 |
| **Post-processing** | Move handled files to a `Processed/` sub-folder |
| **De-duplication** | Track already-processed files; never re-extract |
| **Backend** | Node.js + Express (REST API + pipeline) |
| **Frontend** | Next.js dashboard (ledger, invoice detail, review queue) |
| **Deployment (v1)** | Runs locally (dev/testing only) |
| **Expected volume** | 20–100 invoices/day |

### 3.2 Out of Scope (for v1, planned later)

- Accounting-software integration (QuickBooks, Xero, ERP, etc.).
- FTP intake source (Drive only for now).
- A real database as primary store (Sheets is primary for v1).
- Multi-tenant / multi-company support.
- Approval workflows, payment execution.
- Authentication / user accounts on the dashboard (internal/local for v1).

> A lightweight internal **dashboard is now in scope for v1** (read-only ledger
> view, invoice detail, and a review queue), but it is intentionally minimal —
> richer admin features (auth, bulk actions, analytics) remain later work.

> The architecture is intentionally **modular** so these can be added later
> without rewrites.

---

## 4. Key Behaviors

### 4.1 Instant Detection

The system must react when **a new file appears** in the watched Drive folder —
not on a fixed timer. This is achieved with the Google Drive **Changes / watch
channel** mechanism rather than scheduled polling.

> **Important technical reality:** True push notifications require Google to call
> the Express server over a **public HTTPS URL**. While running **locally** (v1),
> Google cannot reach the server directly. The practical fallback during local
> development is **high-frequency polling** of the Drive Changes API (every few
> seconds) — near-instant in practice. True push is enabled once the service is
> deployed to a publicly reachable host (or fronted by a tunnel such as
> `ngrok` / `cloudflared` during dev).

### 4.2 Multi-Format Normalization

A vision-capable model can read **PDFs and images** directly, but it does **not**
natively parse XLSX or DOCX. Therefore the pipeline includes a **normalization
stage** that converts/extracts each incoming format into something the LLM can
consume (text + structure, or a converted PDF) **before** extraction. This stage
is a discrete, swappable step so new formats can be added cleanly later.

### 4.3 Layout-Agnostic Extraction

Because invoice layouts are inconsistent and the requirement is to capture
**all information**, extraction uses an **LLM** (accessed via OpenRouter) rather
than a fixed-schema parser. The model reads the document like a person and returns
**structured JSON**:

- **Core fields** map to known spreadsheet columns.
- **Unknown / vendor-specific fields** (PO numbers, payment terms, bank details,
  tax breakdowns) land in a flexible **`extra_fields`** object so nothing is
  silently dropped.

### 4.4 Idempotent Processing

Every file is processed **exactly once**. The system records processed file IDs
and skips anything already handled, even if a detection event fires more than
once.

---

## 5. Data Captured Per Invoice

**Header-level (one row per invoice):**

- Invoice date, invoice time
- Sender name, sender email, sender address
- Invoice number
- Subtotal, tax, total, currency
- Payment terms / due date (when present)
- Processing metadata: time processed, source file name, source file ID, status

**Line-item level (one row per item):**

- Item description / name
- Quantity
- Unit price
- Line total
- Link back to the parent invoice (invoice ID)

**Catch-all:**

- `extra_fields` — any additional field present on the invoice that does not map
  to a known column.

---

## 6. Success Criteria

- A new invoice dropped into the watched folder appears as structured rows in the
  Google Sheet within seconds (push) or a few seconds (local polling fallback).
- Works across PDF, image-PDF, XLSX, and DOCX without per-vendor configuration.
- No invoice is processed twice; no field is silently lost.
- Processed files are relocated to `Processed/`.
- New formats and downstream integrations can be added without rearchitecting.

---

## 7. Constraints & Assumptions

- **LLM cost:** Each invoice is a real, billed OpenRouter API call. Volume of
  20–100/day must be considered for cost budgeting.
- **Google API quotas:** Drive Changes API and Sheets API have rate limits;
  batch sizes and polling cadence must stay within them.
- **Local-only v1:** No public URL yet, so push notifications are deferred to the
  deployment phase; polling is used in the interim.
- **Single watched folder, single company** for v1.
- **Sheets as store:** Acceptable for current volume; a database migration is a
  known future step as features grow.

---

## 8. Glossary

| Term | Meaning |
|------|---------|
| **Watch channel** | A Google Drive subscription that pushes change notifications to a webhook URL. |
| **Changes API** | Google Drive API that lists what changed since a saved page token; used for polling fallback. |
| **Normalization** | Converting any input format into LLM-readable input (text/PDF). |
| **Extraction** | LLM step that turns a document into structured JSON. |
| **OpenRouter** | OpenAI-compatible API gateway that routes requests to many LLM providers/models behind one key. |
| **Idempotency** | Guarantee that processing the same file twice has no extra effect. |
| **extra_fields** | Flexible JSON bucket for non-standard invoice fields. |
