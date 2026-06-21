# Invoice Processing Pipeline — Documentation

Internal fintech automation that detects invoices the moment they land in a
Google Drive folder, extracts **all** their data with an LLM (via OpenRouter)
regardless of format or layout, and writes structured rows into a live Google Sheet.

## Documents

| # | Document | What it covers |
|---|----------|----------------|
| 01 | [System Description](./01-SYSTEM-DESCRIPTION.md) | Purpose, problem, scope, behaviors, data captured, constraints. The "what & why" in plain terms. |
| 02 | [System Architecture](./02-SYSTEM-ARCHITECTURE.md) | High-level components, pipeline diagram, design rationale, detection model, deployment topology, extensibility roadmap. |
| 03 | [System Design](./03-SYSTEM-DESIGN.md) | Low-level design: module layout, interfaces, processing algorithm, JSON schema, Sheets data model, config, sequence diagrams, build phases. |
| 04 | [Feature List](./04-FEATURE-LIST.md) | Phased feature inventory (v1 MVP → future), priorities, and feature → design traceability. |
| 05 | [User Journey](./05-USER-JOURNEY.md) | Personas, the core happy-path journey, exception journeys, operator journey, and before/after journey map. |

> **Implementation:** A runnable monorepo now lives alongside these docs —
> `backend/` (Express service + REST API + pipeline) and `frontend/` (Next.js
> dashboard). See the root [`README.md`](../README.md) to run the full stack.
> The backend ships with a **mock mode** so it runs with no Google/OpenRouter
> accounts.

## At a glance

- **Stack:** Node.js + Express (backend) · Next.js + Tailwind (frontend)
- **Intake:** Google Drive (single watched folder)
- **Detection:** Event-driven — push via Drive watch channel (deployed) /
  high-frequency Changes-API polling (local v1 fallback)
- **Formats:** PDF, image-PDF, XLSX, DOCX (extensible)
- **Extraction:** LLM via OpenRouter (vision-capable model) → flexible structured JSON
- **Output:** Google Sheets — `Invoices` tab + `Line Items` tab
- **Frontend:** Next.js dashboard — ledger, invoice detail, review queue
- **Post-process:** move handled files to `Processed/`; idempotent (no re-processing)
- **Volume:** 20–100 invoices/day
- **Deployment (v1):** runs locally (dev/testing)

## Key decisions captured

1. **Node/Express over Apps Script** — multi-format support + future features.
2. **Event-driven over interval polling** — process instantly on upload.
3. **LLM over template OCR** — layout-agnostic, captures everything.
4. **Google Sheets as primary store (v1)** — DB is a known future migration.

> Status: pre-implementation design. Documents are versioned as v0.1.
