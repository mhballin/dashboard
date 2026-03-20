# Local Development

This guide is for developers working on Job Search HQ locally.

## Prerequisites

- Node.js 20+
- npm

## Local PocketBase Setup

The local binary is expected at `pocketbase/pocketbase` and the folder is gitignored.

If you need to download it again:

1. Visit `https://github.com/pocketbase/pocketbase/releases/latest`.
2. Download the macOS binary for your architecture (`darwin_arm64` for Apple Silicon, `darwin_amd64` for Intel).
3. Extract into the repository `pocketbase/` folder so the executable path is `pocketbase/pocketbase`.

## Quick Start

1. Clone the repository.
2. Install frontend dependencies from the repository root:

```bash
npm install
```

3. Install API server dependencies:

```bash
npm --prefix server install
```

4. Copy environment templates:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

5. Configure local environment values:

- Set `VITE_API_PROXY_TARGET` in `.env` to your local API URL, typically `http://127.0.0.1:3001`.
- `server/.env` is local-first by default and points to `http://127.0.0.1:8090`.

6. Start PocketBase in Terminal 1:

```bash
./pocketbase/pocketbase serve --http=127.0.0.1:8090
```

7. Start the app stack in Terminal 2 (Express API + Vite):

```bash
npm run dev:app
```

8. Open `http://localhost:5173`.

## Export PocketBase Schema Snapshot

After any local schema change, export an updated snapshot into the repo:

```bash
PB_URL=http://127.0.0.1:8090 \
PB_ADMIN_EMAIL=<admin-email> \
PB_ADMIN_PASSWORD=<admin-password> \
npm run schema:export
```

This writes `schema/pocketbase-collections.json` for code review and version history.

## Environment Variables

### Server (`server/.env`)

- `PB_URL` (required): PocketBase base URL, such as `https://pocketbase.example.com`
- Local-first default: `http://127.0.0.1:8090`
- `PORT` (optional): API port (default `3001`)
- `CORS_ALLOWED_ORIGINS` (optional): comma-separated origin allowlist for browser clients
- `UPSTREAM_TIMEOUT_MS` (optional): upstream timeout in milliseconds (default `15000`)

### Frontend (`.env`)

- `VITE_API_PROXY_TARGET` (required for local Vite dev): backend target used by Vite proxy, for example `http://127.0.0.1:3001`
- `VITE_API_URL` (optional for deployed frontend builds): absolute API base URL, for example `https://api.example.com`

If `VITE_API_URL` is empty, frontend requests are relative (`/auth`, `/api`) and rely on same-origin/proxy routing.

## Validation Commands

Run these from the repo root after frontend changes:

```bash
npm run lint
npm run build
```

If you touch backend code, validate syntax:

```bash
node --check server/index.js
```

## Related Docs

- [README.md](../README.md)
- [docs/ARCHITECTURE.md](ARCHITECTURE.md#schema-change-workflow)
- [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/ops/SERVER-RUNBOOK.md](ops/SERVER-RUNBOOK.md)
