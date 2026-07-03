# Invoice Pipeline — Backend (Express)

Event-driven service that detects invoices in a Google Drive folder, extracts
their data with an LLM (via OpenRouter), writes structured rows to Google Sheets,
and exposes a REST API for the frontend.

## Quick start

```bash
cp .env.example .env      # defaults to MOCK_MODE so it runs with no accounts
npm install
npm run dev               # http://localhost:8001
```

Set `DATABASE_URL` in `.env` (Neon PostgreSQL). On startup the app runs Prisma
migrations and imports any legacy JSON from `backend/data/` once if the database
is empty.

## Auth

- JWT session cookie (`auth_token`, httpOnly)
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- All `/api/*` routes except `/api/health` and `/api/auth/*` require login
- First boot seeds superadmin `dev@notionhive.com` when the database has no users

## Database

PostgreSQL via [Neon](https://neon.tech) + Prisma.

| Table | Stores |
|-------|--------|
| `users` | Accounts, bcrypt password hashes, roles |
| `app_setup` | Google OAuth tokens, folder & spreadsheet IDs |
| `invoices` | Processed invoice rows |
| `line_items` | Invoice line items |
| `processed_files` | Drive file IDs already handled |

Legacy JSON in `backend/data/*.json` is imported automatically on first run if
those tables are empty.

## Modes

- **Mock mode** (default when creds are missing): use `POST /api/simulate-upload`
  to inject synthetic invoices through the real pipeline.
- **Poll mode** (`DETECTION_MODE=poll`): polls the Drive Changes API every few
  seconds — works locally with no public URL.
- **Push mode** (`DETECTION_MODE=push`): Drive watch channel calls
  `POST /webhooks/drive` — needs a public HTTPS URL (deploy or dev tunnel).

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Status, mode, model, capabilities |
| GET | `/api/stats` | Counts + total value |
| GET | `/api/invoices?status=` | List invoices (optional status filter) |
| GET | `/api/invoices/:id` | Invoice + line items |
| PATCH | `/api/invoices/:id` | Update status (e.g. resolve review) |
| POST | `/api/simulate-upload` | Inject a mock invoice (mock mode only) |
| POST | `/webhooks/drive` | Drive push notification receiver |

## Pipeline stages

`detection → ingestion → normalization → extraction (OpenRouter) → validation/mapping → output (Sheets) → post-process (move + mark processed)`

See `../docs/03-SYSTEM-DESIGN.md` for the full design.

## Configuration

All configuration is via environment variables — see `.env.example`.
