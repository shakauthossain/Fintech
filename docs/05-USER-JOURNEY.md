# User Journey — Automated Invoice Processing Pipeline

> **Status:** Draft v0.1 (pre-implementation)
> **Last updated:** 2026-06-22

This document describes the system from the **people's** point of view — who
uses it, what they do, and what they experience end to end. Because v1 is a
mostly-automated backend, the "users" are largely a person dropping files and a
person reading the resulting Sheet; the system itself is the primary actor in
between.

---

## 1. Personas

| Persona | Role | Goal | Technical level |
|---------|------|------|-----------------|
| **Priya — Finance Clerk** | Receives invoices, saves them to Drive | Stop manually typing invoice data into spreadsheets | Low–medium |
| **Rahim — Finance Manager** | Reviews the invoice ledger, reconciles | A reliable, always-current record of every invoice | Medium |
| **Sara — Reviewer** | Handles flagged/odd invoices | Quickly fix anything the system couldn't fully read | Medium |
| **Dev — Operator/Engineer** | Runs and maintains the system | Keep the pipeline healthy; add features over time | High |

---

## 2. The Core Journey (Happy Path)

**Scenario:** A vendor emails an invoice; Priya files it; it appears in the
ledger automatically.

```
Priya                 Drive Folder         System (Express)        Google Sheet        Rahim
  │  saves invoice ──────►│                      │                      │                │
  │  (PDF/XLSX/DOCX)       │  new file detected ─►│                      │                │
  │                        │                      │ download             │                │
  │                        │                      │ normalize format     │                │
  │                        │                      │ extract via LLM      │                │
  │                        │                      │ validate + map       │                │
  │                        │                      │ append rows ────────►│                │
  │                        │◄─ move to Processed/ │                      │                │
  │                        │                      │ mark processed       │                │
  │                        │                      │                      │  views ledger ◄│
  │                        │                      │                      │  (rows present)│
```

### Step-by-step

1. **Receive & save (Priya).** An invoice arrives (email, scan, download). Priya
   drops the file into the watched Google Drive folder. Her job is **done** —
   no typing, no format conversion.
2. **Detect (System).** Within seconds the system notices the new file
   (push when deployed, polling locally).
3. **Understand (System).** It downloads the file, converts the format if needed,
   and asks the LLM (via OpenRouter) to read it — regardless of layout.
4. **Record (System).** Extracted data is validated and appended to the Sheet:
   one row in **Invoices**, one row per item in **Line Items**.
5. **Tidy up (System).** The original file is moved to `Processed/` and marked so
   it's never handled twice.
6. **Use (Rahim).** Rahim opens either the live Sheet **or the dashboard** and
   sees the new invoice already there — accurate, structured, and current, with
   no manual entry. The dashboard shows running stats (counts, total value) and
   a clickable list; opening an invoice reveals sender, totals, and line items.

**Outcome:** From "file dropped" to "row in the ledger" with zero human data
entry, in seconds.

---

## 3. Alternate & Exception Journeys

### 3.1 Invoice can't be fully read (needs review)

```
System extracts → validation fails / low confidence
      │
      ▼
Row written with status = NEEDS_REVIEW  (+ extra_fields preserved)
Source file NOT moved (stays in inbox)  [or moved to a Review/ folder later]
      │
      ▼
Sara opens the dashboard's Review Queue (or filters the Sheet), opens the
invoice, corrects it, and marks it OK
```

- The system **never silently drops** data — partial data is recorded and
  clearly flagged.
- Sara fixes the row manually; the source file stays accessible.

### 3.2 Unsupported file format

- File is detected but no normalizer matches its type.
- System flags it (`NEEDS_REVIEW` / log entry) and **leaves the file in place**.
- Dev later adds a normalizer adapter for that format (extensible by design).

### 3.3 Duplicate upload

- Priya (or a sync) drops the **same file** again.
- The idempotency guard recognizes the file ID and **skips** it — no duplicate
  rows.

### 3.4 Transient failure (LLM / Sheets / network)

- The system retries with backoff.
- Because rows are written **before** the file is moved/marked, a crash mid-way
  results in **safe re-processing** later — no lost invoice, no duplicate ledger
  rows (existence check on `source_file_id`).

---

## 4. Operator Journey (Dev)

### 4.1 First-time setup (local, v1)

1. Clone the repo, run `npm install`.
2. Create a Google service account; share the **watched folder**, the
   **Processed/** folder, and the **Sheet** with it.
3. Create the Sheet with `Invoices` and `Line Items` tabs (or let setup do it).
4. Get an **OpenRouter API key** (with credit/billing enabled) and pick a
   vision-capable model id.
5. Fill `.env` (folder IDs, sheet ID, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`,
   `DETECTION_MODE=poll`).
6. `npm install && npm run dev` in `backend/` → the worker begins watching.
7. `npm install && npm run dev` in `frontend/` → open the dashboard at
   `localhost:3000`.
8. Drop a couple of test invoices (or click **Simulate upload** in mock mode) →
   confirm rows appear in the Sheet and on the dashboard.

### 4.2 Day-to-day

- Watch logs for `OK` / `NEEDS_REVIEW` / `ERROR`.
- Check LLM cost/usage logs against the 20–100/day volume.
- Investigate anything flagged; tune the prompt for frequent vendors.

### 4.3 Going to production (later)

- Deploy to a public host (or open a dev tunnel).
- Switch `DETECTION_MODE=push`, register the Drive watch channel.
- (Optional) migrate the store to a database; add integrations.

---

## 5. Journey Map — Emotions & Pain Points Removed

| Stage | Before (manual) | After (this system) |
|-------|-----------------|---------------------|
| Receiving | Invoice sits in an inbox | Just drop it in a folder |
| Reading | Open each file, squint at layout | System reads any layout |
| Typing | Copy fields into a spreadsheet | Zero typing |
| Errors | Typos, missed fields | Validated, flagged when unsure |
| Duplicates | Accidental double entry | Auto-skipped |
| Visibility | Stale, manually updated sheet | Live, always-current ledger |
| Multiple formats | Convert by hand | Handled automatically |

**Net effect:** Priya's data-entry work disappears; Rahim trusts a ledger that's
always up to date; Sara only touches the rare flagged item; Dev maintains one
extensible service.

---

## 6. End-to-End Touchpoints Summary

| Actor | Touchpoint | Frequency |
|-------|-----------|-----------|
| Finance Clerk | Drops file in Drive folder | Per invoice (20–100/day) |
| System | Detect → extract → write → move | Automatic, per file |
| Finance Manager | Reads the live Sheet / dashboard | As needed |
| Reviewer | Fixes flagged rows via the Review Queue | Occasional |
| Operator | Monitors logs, tunes, extends | Ongoing |

---

## 7. Success Signals (from the user's view)

- "I dropped the invoice and it was in the sheet before I finished my coffee."
- "I never type invoice data anymore."
- "When something looks off, it's clearly flagged — not silently wrong."
- "The same invoice never shows up twice."
- "Adding a new file type or vendor didn't require rebuilding anything."
